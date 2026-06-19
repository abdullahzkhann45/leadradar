import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Source, SourceDocument } from './schemas/source.schema';

@Injectable()
export class SourcesService {
  constructor(
    @InjectModel(Source.name) private sourceModel: Model<SourceDocument>,
  ) {}

  findAll() {
    return this.sourceModel.find().exec();
  }

  findOne(id: string) {
    return this.sourceModel.findById(id).exec();
  }

  update(id: string, dto: Partial<Source>) {
    return this.sourceModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }
}
