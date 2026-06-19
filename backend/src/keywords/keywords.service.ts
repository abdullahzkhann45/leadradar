import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Keyword, KeywordDocument } from './schemas/keyword.schema';

@Injectable()
export class KeywordsService {
  constructor(
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
  ) {}

  findAll() {
    return this.keywordModel.find().sort({ serviceLine: 1, type: 1 }).exec();
  }

  create(dto: Partial<Keyword>) {
    return this.keywordModel.create(dto);
  }

  update(id: string, dto: Partial<Keyword>) {
    return this.keywordModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  remove(id: string) {
    return this.keywordModel.findByIdAndDelete(id).exec();
  }
}
