import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { RawPost, SourceConnector } from '../common/interfaces';
import { Source, SourceDocument } from './schemas/source.schema';

@Injectable()
export class IndieHackersConnector implements SourceConnector {
  readonly name = 'indiehackers';
  private readonly logger = new Logger(IndieHackersConnector.name);
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    maxNestedTags: 10_000,
  });

  constructor(
    @InjectModel(Source.name) private sourceModel: Model<SourceDocument>,
  ) {}

  async poll(): Promise<RawPost[]> {
    const source = await this.sourceModel.findOne({ type: 'indiehackers' });
    if (!source || !source.enabled) return [];

    const feeds: string[] = source.config?.feeds || [];
    if (!feeds.length) return [];

    const since = source.lastCursor
      ? new Date(source.lastCursor)
      : new Date(Date.now() - 60 * 60_000);
    const posts: RawPost[] = [];

    for (const feedUrl of feeds) {
      try {
        const { data } = await axios.get(feedUrl, {
          headers: { 'User-Agent': 'LeadRadar/1.0' },
          timeout: 15_000,
        });

        if (this.looksLikeXmlFeed(data)) {
          const parsed = this.parser.parse(data);
          const items = this.getItems(parsed);
          this.logger.log(`Read ${items.length} RSS items from ${feedUrl}`);

          for (const item of items) {
            const createdAt = new Date(item.pubDate || item.updated || item.published || Date.now());
            if (createdAt <= since) continue;

            posts.push({
              source: 'indiehackers',
              externalId: this.getStableId(item),
              author: item.author || item.creator || '',
              title: this.cleanText(item.title || ''),
              body: this.cleanText(item.description || item.content || item['content:encoded'] || ''),
              url: typeof item.link === 'string' ? item.link : item.link?.href || '',
              createdAt,
              tag: feedUrl,
            });
          }
        } else {
          const htmlPosts = this.extractHtmlPosts(data, since, feedUrl);
          this.logger.log(`Read ${htmlPosts.length} recent public HTML posts from ${feedUrl}`);
          posts.push(...htmlPosts);
        }
      } catch (err: any) {
        const status = err.response?.status;
        this.logger.error(
          `Indie Hackers feed "${feedUrl}" failed${status ? ` (${status})` : ''}: ${err.message}`,
        );
      }
    }

    await this.sourceModel.updateOne(
      { type: 'indiehackers' },
      { lastCursor: new Date().toISOString(), lastPolledAt: new Date() },
    );

    const unique = this.uniqueByExternalId(posts);
    this.logger.log(`Polled ${unique.length} posts from Indie Hackers`);
    return unique;
  }

  private getItems(parsed: any): any[] {
    const items = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
    return Array.isArray(items) ? items : [items];
  }

  private looksLikeXmlFeed(data: string): boolean {
    const trimmed = data.trimStart().slice(0, 500).toLowerCase();
    return trimmed.startsWith('<?xml') || trimmed.includes('<rss') || trimmed.includes('<feed');
  }

  private extractHtmlPosts(html: string, since: Date, pageUrl: string): RawPost[] {
    const posts: RawPost[] = [];
    let matchedCards = 0;
    const linkRegex =
      /<a\s+[^>]*href="(\/post\/[^"]+)"[^>]*class="[^"]*story__text-link[^"]*"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*story__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html))) {
      matchedCards += 1;
      const href = match[1];
      const title = this.cleanText(this.decodeHtml(match[2]));
      const ageWindow = html.slice(match.index, match.index + 8000);
      const ageMatch = ageWindow.match(
        /story__time-ago[\s\S]*?<span>\s*([^<]+?)\s*<\/span>/i,
      );
      const createdAt = ageMatch ? this.parseAge(ageMatch[1]) : null;

      if (!createdAt || createdAt <= since) continue;

      posts.push({
        source: 'indiehackers',
        externalId: href.replace('/post/', ''),
        author: '',
        title,
        body: title,
        url: `https://www.indiehackers.com${href}`,
        createdAt,
        tag: pageUrl,
      });
    }

    this.logger.log(`Found ${matchedCards} public HTML post cards on ${pageUrl}`);
    return posts;
  }

  private parseAge(age: string): Date | null {
    const match = age.trim().toLowerCase().match(/^(\d+)\s*([mhd])$/);
    if (!match) return null;

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      m: 60_000,
      h: 60 * 60_000,
      d: 24 * 60 * 60_000,
    };

    return new Date(Date.now() - amount * multipliers[unit]);
  }

  private decodeHtml(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  private getStableId(item: any): string {
    const raw = item.guid?.['#text'] || item.guid || item.id || item.link?.href || item.link || item.title;
    return String(raw || Date.now());
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
