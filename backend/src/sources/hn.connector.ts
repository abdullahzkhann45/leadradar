import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { RawPost, SourceConnector } from '../common/interfaces';
import { Source, SourceDocument } from './schemas/source.schema';

@Injectable()
export class HnConnector implements SourceConnector {
  readonly name = 'hackernews';
  private readonly logger = new Logger(HnConnector.name);
  private hiringThreadIds: string[] = [];
  private hiringThreadsFetchedAt = 0;

  constructor(
    @InjectModel(Source.name) private sourceModel: Model<SourceDocument>,
  ) {}

  async poll(): Promise<RawPost[]> {
    const source = await this.sourceModel.findOne({ type: 'hackernews' });
    if (!source || !source.enabled) return [];

    const allPosts: RawPost[] = [];

    // 1. Broad fetch: latest stories (Ask HN, Show HN, regular stories)
    await this.fetchLatestStories(allPosts);

    // 2. Monthly hiring/freelancer thread comments
    await this.fetchHiringThreadComments(allPosts);

    const seen = new Set<string>();
    const unique = allPosts.filter((p) => {
      if (seen.has(p.externalId)) return false;
      seen.add(p.externalId);
      return true;
    });

    await this.sourceModel.updateOne(
      { type: 'hackernews' },
      { lastPolledAt: new Date() },
    );

    this.logger.log(`Polled ${unique.length} posts from HN (stories + hiring comments)`);
    return unique;
  }

  private async fetchLatestStories(out: RawPost[]): Promise<void> {
    try {
      const { data } = await axios.get(
        'https://hn.algolia.com/api/v1/search_by_date',
        { params: { tags: 'story', hitsPerPage: 100 } },
      );

      this.logger.debug(
        `[HN] latest stories: ${data.hits?.length ?? 0} fetched, ${data.nbHits ?? 0} total`,
      );

      for (const hit of data.hits || []) {
        out.push(this.hitToPost(hit));
      }
    } catch (err: any) {
      this.logger.error(`[HN] latest stories fetch failed: ${err.message}`);
    }
  }

  private async fetchHiringThreadComments(out: RawPost[]): Promise<void> {
    await this.refreshHiringThreadIds();
    if (!this.hiringThreadIds.length) return;

    for (const storyId of this.hiringThreadIds) {
      try {
        const { data } = await axios.get(
          'https://hn.algolia.com/api/v1/search_by_date',
          {
            params: {
              tags: `comment,story_${storyId}`,
              hitsPerPage: 50,
            },
          },
        );

        this.logger.debug(
          `[HN] hiring thread ${storyId}: ${data.hits?.length ?? 0} recent comments`,
        );

        for (const hit of data.hits || []) {
          out.push(this.hitToPost(hit));
        }
      } catch (err: any) {
        this.logger.error(`[HN] hiring thread ${storyId} failed: ${err.message}`);
      }
    }
  }

  private async refreshHiringThreadIds(): Promise<void> {
    // Re-fetch thread IDs once per day
    if (Date.now() - this.hiringThreadsFetchedAt < 24 * 60 * 60_000) return;

    try {
      const { data } = await axios.get(
        'https://hn.algolia.com/api/v1/search_by_date',
        {
          params: {
            tags: 'ask_hn,author_whoishiring',
            hitsPerPage: 6,
          },
        },
      );

      this.hiringThreadIds = (data.hits || []).map((h: any) => h.objectID);
      this.hiringThreadsFetchedAt = Date.now();

      this.logger.log(
        `[HN] Found ${this.hiringThreadIds.length} hiring threads: ${(data.hits || []).map((h: any) => h.title).join(', ')}`,
      );
    } catch (err: any) {
      this.logger.error(`[HN] hiring thread lookup failed: ${err.message}`);
    }
  }

  private hitToPost(hit: any): RawPost {
    return {
      source: 'hackernews',
      externalId: hit.objectID,
      author: hit.author || '',
      title: hit.title || hit.story_title || '',
      body: hit.story_text || hit.comment_text || '',
      url:
        hit.url ||
        `https://news.ycombinator.com/item?id=${hit.objectID}`,
      createdAt: new Date(hit.created_at),
    };
  }
}
