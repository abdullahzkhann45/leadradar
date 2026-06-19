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
    if (!posts.length) return [];

    const keys = posts.map((p) => `${p.source}:${p.externalId}`);
    const existing = await this.seenModel
      .find({ sourceExternalKey: { $in: keys } })
      .select('sourceExternalKey')
      .lean();
    const existingKeys = new Set(existing.map((s) => s.sourceExternalKey));

    const fresh: RawPost[] = [];
    const newDocs: { sourceExternalKey: string }[] = [];

    for (let i = 0; i < posts.length; i++) {
      if (!existingKeys.has(keys[i])) {
        fresh.push(posts[i]);
        newDocs.push({ sourceExternalKey: keys[i] });
      }
    }

    if (newDocs.length) {
      await this.seenModel.insertMany(newDocs, { ordered: false }).catch((err) => {
        if (err.code !== 11000) throw err;
      });
    }

    this.logger.log(`Dedup: ${posts.length} in → ${fresh.length} new`);
    return fresh;
  }
}
