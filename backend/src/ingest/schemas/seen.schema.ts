import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SeenDocument = Seen & Document;

@Schema()
export class Seen {
  @Prop({ required: true, unique: true })
  sourceExternalKey: string;

  @Prop({ default: () => new Date(), expires: 60 * 60 * 24 * 60 }) // 60 days TTL
  seenAt: Date;
}

export const SeenSchema = SchemaFactory.createForClass(Seen);
