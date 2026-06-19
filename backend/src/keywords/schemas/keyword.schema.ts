import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type KeywordDocument = Keyword & Document;

@Schema()
export class Keyword {
  @Prop({ required: true })
  serviceLine: number;

  @Prop({ required: true })
  term: string;

  @Prop({ required: true, enum: ['core', 'intent', 'blacklist'] })
  type: string;

  @Prop({ default: true })
  enabled: boolean;
}

export const KeywordSchema = SchemaFactory.createForClass(Keyword);
