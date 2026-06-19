import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { RawPost, SourceConnector } from '../common/interfaces';
import { Source, SourceDocument } from './schemas/source.schema';

@Injectable()
export class RedditConnector implements SourceConnector {
  readonly name = 'reddit';
  private readonly logger = new Logger(RedditConnector.name);
  private accessToken: string;
  private tokenExpiresAt = 0;

  constructor(
    @InjectModel(Source.name) private sourceModel: Model<SourceDocument>,
    private config: ConfigService,
  ) {}

  private async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) return;

    const clientId = this.config.get<string>('REDDIT_CLIENT_ID');
    const clientSecret = this.config.get<string>('REDDIT_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      this.logger.warn('Reddit credentials not configured, skipping');
      return;
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { data } = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LeadRadar/1.0',
        },
      },
    );

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
  }

  async poll(): Promise<RawPost[]> {
    await this.authenticate();
    if (!this.accessToken) return [];

    const source = await this.sourceModel.findOne({ type: 'reddit' });
    if (!source || !source.enabled) return [];

    const subreddits: string[] = source.config?.subreddits || [];
    if (!subreddits.length) return [];

    const subString = subreddits.join('+');
    const params: Record<string, string> = { limit: '50' };
    if (source.lastCursor) params.after = source.lastCursor;
    const firstRunCutoff = source.lastCursor
      ? null
      : new Date(Date.now() - 60 * 60_000);

    try {
      const { data } = await axios.get(
        `https://oauth.reddit.com/r/${subString}/new.json`,
        {
          params,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'User-Agent': 'LeadRadar/1.0',
          },
        },
      );

      const posts: RawPost[] = data.data.children
        .map((child: any) => ({
          source: 'reddit',
          externalId: child.data.id,
          author: child.data.author,
          title: child.data.title,
          body: child.data.selftext || '',
          url: `https://reddit.com${child.data.permalink}`,
          createdAt: new Date(child.data.created_utc * 1000),
          subreddit: child.data.subreddit,
        }))
        .filter((post: RawPost) => !firstRunCutoff || post.createdAt >= firstRunCutoff);

      if (data.data.after) {
        await this.sourceModel.updateOne(
          { type: 'reddit' },
          { lastCursor: data.data.after, lastPolledAt: new Date() },
        );
      } else {
        await this.sourceModel.updateOne(
          { type: 'reddit' },
          { lastPolledAt: new Date() },
        );
      }

      this.logger.log(`Polled ${posts.length} posts from r/${subString}`);
      return posts;
    } catch (err: any) {
      if (err.response?.status === 429) {
        this.logger.warn('Reddit rate limited, backing off');
        return [];
      }
      this.logger.error(`Reddit poll failed: ${err.message}`);
      return [];
    }
  }
}
