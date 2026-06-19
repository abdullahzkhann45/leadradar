import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { LeadDocument } from '../leads/schemas/lead.schema';

const SERVICE_LINE_NAMES: Record<number, string> = {
  1: 'AI/LLM',
  2: 'Chrome Ext',
  3: 'Vibe-coded Fix',
  4: 'MVP Build',
  5: 'React/Node Fix',
};

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private config: ConfigService,
  ) {}

  async notifyLead(lead: LeadDocument): Promise<void> {
    const existing = await this.notificationModel.findOne({
      leadId: lead._id,
    });
    if (existing) return;

    const topic = this.config.get<string>('NTFY_TOPIC');
    if (!topic) {
      this.logger.warn('NTFY_TOPIC not configured');
      return;
    }

    const slName = SERVICE_LINE_NAMES[lead.serviceLine] || 'Unknown';
    const summary = lead.classification?.one_line_summary || lead.title;
    const intent = lead.classification?.intent_to_pay || 'unknown';
    const proof = lead.classification?.suggested_proof || '';

    const title = `🎯 [${slName}] Score: ${lead.score}`;
    const body = `${summary}\n\nIntent: ${intent} | Proof: ${proof}\nSource: ${lead.source}${lead.subreddit ? '/' + lead.subreddit : ''}`;

    try {
      await axios.post(`https://ntfy.sh/${topic}`, body, {
        headers: {
          Title: title,
          Click: lead.url,
          Priority: lead.score >= 70 ? '5' : lead.score >= 50 ? '4' : '3',
          Tags: slName.toLowerCase().replace(/[^a-z]/g, ''),
        },
      });

      await this.notificationModel.create({
        leadId: lead._id,
        channel: 'ntfy',
        sentAt: new Date(),
        status: 'sent',
      });

      this.logger.log(`Notified: ${lead.title?.substring(0, 60)}`);
    } catch (err: any) {
      this.logger.error(`ntfy push failed: ${err.message}`);
    }
  }
}
