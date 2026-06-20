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

  constructor(
    @InjectModel(Source.name) private sourceModel: Model<SourceDocument>,
  ) {}

  async poll(): Promise<RawPost[]> {
    const source = await this.sourceModel.findOne({ type: 'hackernews' });
    if (!source || !source.enabled) return [];

    const queries: string[] = source.config?.queries || [
      'freelance',
      'hire developer',
      'need developer',
      'looking for developer',
      'chrome extension',
      'AI integration',
      'build MVP',
      'fix my app',
    ];

    const numericTimestamp = source.lastCursor
      ? parseInt(source.lastCursor, 10)
      : Math.floor((Date.now() - 24 * 60 * 60_000) / 1000);

    const allPosts: RawPost[] = [];

    for (const query of queries) {
      try {
        const params = {
          query,
          tags: 'story',
          numericFilters: `created_at_i>${numericTimestamp}`,
          hitsPerPage: 30,
        };
        const { data } = await axios.get(
          'https://hn.algolia.com/api/v1/search_by_date',
          { params },
        );

        this.logger.debug(
          `[HN] query="${query}" hits=${data.hits?.length ?? 0} nbHits=${data.nbHits ?? 0} since=${numericTimestamp}`,
        );

        for (const hit of data.hits || []) {
          allPosts.push({
            source: 'hackernews',
            externalId: hit.objectID,
            author: hit.author || '',
            title: hit.title || '',
            body: hit.story_text || hit.comment_text || '',
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            createdAt: new Date(hit.created_at),
          });
        }
      } catch (err: any) {
        this.logger.error(`HN query "${query}" failed: ${err.message}`);
      }
    }

    // Dedup by externalId within this batch
    const seen = new Set<string>();
    const unique = allPosts.filter((p) => {
      if (seen.has(p.externalId)) return false;
      seen.add(p.externalId);
      return true;
    });

    await this.sourceModel.updateOne(
      { type: 'hackernews' },
      { lastCursor: String(Math.floor(Date.now() / 1000)), lastPolledAt: new Date() },
    );

    this.logger.log(`Polled ${unique.length} posts from HN`);
    return unique;
  }
}
