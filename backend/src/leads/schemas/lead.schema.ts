import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeadDocument = Lead & Document;

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  externalId: string;

  @Prop()
  author: string;

  @Prop()
  title: string;

  @Prop()
  body: string;

  @Prop()
  url: string;

  @Prop()
  createdAt: Date;

  @Prop()
  subreddit: string;

  @Prop()
  serviceLine: number;

  @Prop({ type: Object })
  classification: {
    is_relevant: boolean;
    service_line: number;
    is_nontechnical_founder: boolean;
    intent_to_pay: string;
    budget_signal: boolean;
    urgency: string;
    one_line_summary: string;
    suggested_proof: string;
    confidence: number;
  };

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: 'new', enum: ['new', 'contacted', 'in_talks', 'won', 'lost'] })
  status: string;

  @Prop({ default: null })
  feedback: number;

  @Prop()
  notifiedAt: Date;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.index({ source: 1, externalId: 1 }, { unique: true });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ score: -1 });
