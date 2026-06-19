import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Keyword, KeywordSchema } from '../keywords/schemas/keyword.schema';
import { ClassifyService } from './classify.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Keyword.name, schema: KeywordSchema }]),
  ],
  providers: [ClassifyService],
  exports: [ClassifyService],
})
export class ClassifyModule {}
