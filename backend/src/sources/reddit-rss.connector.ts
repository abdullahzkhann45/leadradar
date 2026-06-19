import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { RawPost, SourceConnector } from '../common/interfaces';
import { Source, SourceDocument } from './schemas/source.schema';

@Injectable()
export class RedditRssConnector implements SourceConnector {
  readonly name = 'reddit';
  private readonly logger = new Logger(RedditRssConnector.name);
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    maxNestedTags: 10_000,
  });

  constructor(
    @InjectModel(Source.name) private sourceModel: Model<SourceDocument>,
  ) {}

  async poll(): Promise<RawPost[]> {
    const source = await this.sourceModel.findOne({ type: 'reddit' });
    if (!source || !source.enabled) return [];

    const subreddits: string[] = source.config?.subreddits || [];
    if (!subreddits.length) return [];

    const since = source.lastCursor
      ? new Date(source.lastCursor)
      : new Date(Date.now() - 60 * 60_000);

    const posts: RawPost[] = [];
    const multireddit = subreddits.join('+');
    const url = `https://www.reddit.com/r/${multireddit}/new/.rss?limit=100`;

    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'LeadRadar/1.0 (RSS reader)' },
        timeout: 15_000,
      });

      const parsed = this.parser.parse(data);
      const entries = this.getEntries(parsed);
      this.logger.log(`Read ${entries.length} RSS entries from r/${multireddit}`);

      for (const entry of entries) {
        const createdAt = new Date(entry.updated || entry.published || Date.now());
        if (createdAt <= since) continue;

        const subreddit = this.extractSubreddit(entry);
        const body = this.cleanHtml(entry.content || entry.summary || '');

        posts.push({
          source: 'reddit',
          externalId: this.extractId(entry),
          author: this.extractAuthor(entry),
          title: this.cleanText(entry.title || ''),
          body,
          url: this.extractLink(entry),
          createdAt,
          subreddit,
        });
      }
    } catch (err: any) {
      const status = err.response?.status;
      this.logger.error(
        `Reddit RSS r/${multireddit} failed${status ? ` (${status})` : ''}: ${err.message}`,
      );
    }

    await this.sourceModel.updateOne(
      { type: 'reddit' },
      { lastCursor: new Date().toISOString(), lastPolledAt: new Date() },
    );

    const unique = this.uniqueByExternalId(posts);
    this.logger.log(`Polled ${unique.length} posts from Reddit RSS`);
    return unique;
  }

  private getEntries(parsed: any): any[] {
    const entries = parsed?.feed?.entry || [];
    return Array.isArray(entries) ? entries : [entries];
  }

  private extractId(entry: any): string {
    const id = entry.id || entry.link?.href || entry.title;
    const match = String(id).match(/t3_(\w+)/);
    return match ? match[1] : String(id || Date.now());
  }

  private extractAuthor(entry: any): string {
    const author = entry.author;
    if (!author) return '';
    if (typeof author === 'string') return author;
    const name = author.name || author.uri || '';
    return String(name).replace(/.*\/u(ser)?\//, '').replace(/\/$/, '');
  }

  private extractLink(entry: any): string {
    const links = entry.link;
    if (!links) return '';
    if (typeof links === 'string') return links;
    if (Array.isArray(links)) {
      const alt = links.find((l: any) => l.rel === 'alternate');
      return alt?.href || links[0]?.href || '';
    }
    return links.href || '';
  }

  private extractSubreddit(entry: any): string {
    const categories = entry.category;
    if (!categories) return '';
    if (typeof categories === 'string') return categories;
    if (Array.isArray(categories)) {
      const sub = categories.find((c: any) => c.term && c.label);
      return sub?.term || '';
    }
    return categories.term || '';
  }

  private cleanHtml(html: string): string {
    return String(html)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanText(value: string): string {
    return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private uniqueByExternalId(posts: RawPost[]) {
    const seen = new Set<string>();
    return posts.filter((post) => {
      if (seen.has(post.externalId)) return false;
      seen.add(post.externalId);
      return true;
    });
  }
}
