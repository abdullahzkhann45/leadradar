import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SourceDocument = Source & Document;

@Schema({ timestamps: true })
export class Source {
  @Prop({ required: true })
  type: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ type: Object })
  config: Record<string, any>;

  @Prop({ default: 60 })
  pollIntervalSec: number;

  @Prop()
  lastPolledAt: Date;

  @Prop()
  lastCursor: string;
}

export const SourceSchema = SchemaFactory.createForClass(Source);
