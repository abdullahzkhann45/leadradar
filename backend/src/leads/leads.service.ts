import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument } from './schemas/lead.schema';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
  ) {}

  async create(data: Partial<Lead>): Promise<LeadDocument> {
    return this.leadModel.create(data);
  }

  async findAll(query: {
    serviceLine?: number;
    status?: string;
    source?: string;
    minScore?: number;
    maxScore?: number;
    page?: number;
    limit?: number;
  }) {
    const filter: any = {};
    if (query.serviceLine) filter.serviceLine = query.serviceLine;
    if (query.status) filter.status = query.status;
    if (query.source) filter.source = query.source;
    if (query.minScore || query.maxScore) {
      filter.score = {};
      if (query.minScore) filter.score.$gte = query.minScore;
      if (query.maxScore) filter.score.$lte = query.maxScore;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.leadModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.leadModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  findOne(id: string) {
    return this.leadModel.findById(id).exec();
  }

  update(id: string, dto: Partial<Lead>) {
    return this.leadModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async getStats() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, bySource, byServiceLine, byStatus] =
      await Promise.all([
        this.leadModel.countDocuments({ createdAt: { $gte: dayAgo } }),
        this.leadModel.countDocuments({ createdAt: { $gte: weekAgo } }),
        this.leadModel.aggregate([
          { $match: { createdAt: { $gte: weekAgo } } },
          { $group: { _id: '$source', count: { $sum: 1 } } },
        ]),
        this.leadModel.aggregate([
          { $match: { createdAt: { $gte: weekAgo } } },
          { $group: { _id: '$serviceLine', count: { $sum: 1 } } },
        ]),
        this.leadModel.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);

    return { todayCount, weekCount, bySource, byServiceLine, byStatus };
  }
}
