import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { RawPost, SourceConnector } from '../common/interfaces';
import { Source, SourceDocument } from './schemas/source.schema';

@Injectable()
export class GithubConnector implements SourceConnector {
  readonly name = 'github';
  private readonly logger = new Logger(GithubConnector.name);

  constructor(
    @InjectModel(Source.name) private sourceModel: Model<SourceDocument>,
    private config: ConfigService,
  ) {}

  async poll(): Promise<RawPost[]> {
    const source = await this.sourceModel.findOne({ type: 'github' });
    if (!source || !source.enabled) return [];

    const queries: string[] = source.config?.queries || [];
    if (!queries.length) return [];

    const since = source.lastCursor
      ? new Date(source.lastCursor)
      : new Date(Date.now() - 60 * 60_000);

    const token = this.config.get<string>('GITHUB_TOKEN');
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'LeadRadar/1.0',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const posts: RawPost[] = [];

    const batchSize = token ? 3 : 2;
    const maxBatches = token ? Math.ceil(queries.length / batchSize) : 1;
    const queryBatches = this.chunk(queries, batchSize).slice(0, maxBatches);

    for (const queryBatch of queryBatches) {
      try {
      const combinedTerms = queryBatch.join(' OR ');
      const q = `${combinedTerms} created:>${since.toISOString()} in:title,body`;
      const { data } = await axios.get('https://api.github.com/search/issues', {
        params: {
          q,
          sort: 'updated',
          order: 'desc',
          per_page: 50,
        },
        headers,
      });

      for (const item of data.items || []) {
        posts.push({
          source: 'github',
          externalId: String(item.id),
          author: item.user?.login || '',
          title: item.title || '',
          body: item.body || '',
          url: item.html_url,
          createdAt: new Date(item.created_at || item.updated_at),
          tag: item.repository_url?.split('/repos/')[1],
        });
      }
      } catch (err: any) {
        const status = err.response?.status;
        const remaining = err.response?.headers?.['x-ratelimit-remaining'];
        this.logger.error(
          `GitHub search failed${status ? ` (${status})` : ''}${remaining ? `, remaining=${remaining}` : ''}: ${err.message}`,
        );
      }
    }

    await this.sourceModel.updateOne(
      { type: 'github' },
      { lastCursor: new Date().toISOString(), lastPolledAt: new Date() },
    );

    const unique = this.uniqueByExternalId(posts);
    this.logger.log(`Polled ${unique.length} posts from GitHub`);
    return unique;
  }

  private uniqueByExternalId(posts: RawPost[]) {
    const seen = new Set<string>();
    return posts.filter((post) => {
      if (seen.has(post.externalId)) return false;
      seen.add(post.externalId);
      return true;
    });
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }
}
