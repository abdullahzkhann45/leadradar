import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RawPost } from '../common/interfaces';
import { Seen, SeenDocument } from './schemas/seen.schema';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    @InjectModel(Seen.name) private seenModel: Model<SeenDocument>,
  ) {}

  async dedup(posts: RawPost[]): Promise<RawPost[]> {
    const fresh: RawPost[] = [];

    for (const post of posts) {
      const key = `${post.source}:${post.externalId}`;
      const exists = await this.seenModel.findOne({ sourceExternalKey: key });
      if (exists) continue;

      await this.seenModel.create({ sourceExternalKey: key });
      fresh.push(post);
    }

    this.logger.log(`Dedup: ${posts.length} in → ${fresh.length} new`);
    return fresh;
  }
}
