import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { RawPost, SourceConnector } from '../common/interfaces';
import { Source, SourceDocument } from './schemas/source.schema';

@Injectable()
export class ProductHuntConnector implements SourceConnector {
  readonly name = 'producthunt';
  private readonly logger = new Logger(ProductHuntConnector.name);

  constructor(
    @InjectModel(Source.name) private sourceModel: Model<SourceDocument>,
    private config: ConfigService,
  ) {}

  async poll(): Promise<RawPost[]> {
    const source = await this.sourceModel.findOne({ type: 'producthunt' });
    if (!source || !source.enabled) return [];

    const token = this.config.get<string>('PRODUCT_HUNT_TOKEN');
    if (!token) {
      this.logger.warn('Product Hunt token not configured, skipping');
      return [];
    }

    const since = source.lastCursor
      ? new Date(source.lastCursor)
      : new Date(Date.now() - 60 * 60_000);

    const query = `
      query LeadRadarPosts {
        posts(first: 30, order: NEWEST) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              createdAt
              user {
                username
              }
            }
          }
        }
      }
    `;

    try {
      const { data } = await axios.post(
        'https://api.producthunt.com/v2/api/graphql',
        { query },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'LeadRadar/1.0',
          },
        },
      );

      if (data.errors?.length) {
        this.logger.error(`Product Hunt GraphQL error: ${JSON.stringify(data.errors)}`);
        return [];
      }

      const posts: RawPost[] = (data.data?.posts?.edges || [])
        .map((edge: any) => edge.node)
        .filter((post: any) => new Date(post.createdAt) > since)
        .map((post: any) => ({
          source: 'producthunt',
          externalId: String(post.id),
          author: post.user?.username || '',
          title: post.name || '',
          body: [post.tagline, post.description].filter(Boolean).join('\n\n'),
          url: post.url,
          createdAt: new Date(post.createdAt),
          tag: 'launch',
        }));

      await this.sourceModel.updateOne(
        { type: 'producthunt' },
        { lastCursor: new Date().toISOString(), lastPolledAt: new Date() },
      );

      this.logger.log(`Polled ${posts.length} posts from Product Hunt`);
      return posts;
    } catch (err: any) {
      const status = err.response?.status;
      this.logger.error(
        `Product Hunt poll failed${status ? ` (${status})` : ''}: ${err.message}`,
      );
      return [];
    }
  }
}
