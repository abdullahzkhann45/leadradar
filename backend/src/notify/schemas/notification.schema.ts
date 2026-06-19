import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema()
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'Lead', required: true })
  leadId: Types.ObjectId;

  @Prop({ required: true })
  channel: string;

  @Prop()
  sentAt: Date;

  @Prop({ default: 'sent' })
  status: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
