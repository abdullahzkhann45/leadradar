import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedditRssConnector } from '../sources/reddit-rss.connector';
import { HnConnector } from '../sources/hn.connector';
import { GithubConnector } from '../sources/github.connector';
import { ProductHuntConnector } from '../sources/product-hunt.connector';
import { IndieHackersConnector } from '../sources/indie-hackers.connector';
import { IngestService } from '../ingest/ingest.service';
import { ClassifyService } from '../classify/classify.service';
import { LeadsService } from '../leads/leads.service';
import { NotifyService } from '../notify/notify.service';
import { ConfigService } from '@nestjs/config';
import { RawPost } from '../common/interfaces';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private notifyThreshold: number;
  private saveThreshold: number;

  constructor(
    private reddit: RedditRssConnector,
    private hn: HnConnector,
    private github: GithubConnector,
    private productHunt: ProductHuntConnector,
    private indieHackers: IndieHackersConnector,
    private ingest: IngestService,
    private classify: ClassifyService,
    private leads: LeadsService,
    private notify: NotifyService,
    private config: ConfigService,
  ) {
    this.notifyThreshold = parseInt(this.config.get('NOTIFY_THRESHOLD', '40'));
    this.saveThreshold = parseInt(this.config.get('SAVE_THRESHOLD', '20'));
  }

  onModuleInit() {
    this.logger.log(
      `Scheduler started — notify threshold: ${this.notifyThreshold}, save threshold: ${this.saveThreshold}`,
    );
  }

  @Cron('*/2 * * * *')
  async pollReddit() {
    await this.runPipeline('reddit', () => this.reddit.poll());
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollHn() {
    await this.runPipeline('hackernews', () => this.hn.poll());
  }

  @Cron('*/2 * * * *')
  async pollGithub() {
    await this.runPipeline('github', () => this.github.poll());
  }

  @Cron('*/5 * * * *')
  async pollProductHunt() {
    await this.runPipeline('producthunt', () => this.productHunt.poll());
  }

  @Cron('*/5 * * * *')
  async pollIndieHackers() {
    await this.runPipeline('indiehackers', () => this.indieHackers.poll());
  }

  private async runPipeline(
    sourceName: string,
    pollFn: () => Promise<RawPost[]>,
  ) {
    try {
      const raw = await pollFn();
      if (!raw.length) return;

      const fresh = await this.ingest.dedup(raw);
      if (!fresh.length) return;

      let keywordPassed = 0;
      let llmPassed = 0;
      let saved = 0;
      let notified = 0;

      for (const post of fresh) {
        try {
          const { pass, matchedServiceLines, matchedIntentTerms } =
            await this.classify.keywordFilter(post);
          if (!pass) continue;
          keywordPassed++;

          this.logger.log(
            `[${sourceName}] Keyword hit: "${post.title?.substring(0, 60)}" → SL ${matchedServiceLines.join(',')}${matchedIntentTerms.length ? ' + intent: ' + matchedIntentTerms.join(', ') : ''}`,
          );

          const classification = await this.classify.llmClassify(post);
          if (!classification || !classification.is_relevant) {
            this.logger.log(
              `[${sourceName}] LLM dropped: "${post.title?.substring(0, 60)}" → ${classification ? 'not relevant' : 'no response'}`,
            );
            continue;
          }
          if (classification.service_line === 0) {
            this.logger.log(
              `[${sourceName}] LLM skip (no service line match): "${post.title?.substring(0, 60)}"`,
            );
            continue;
          }
          llmPassed++;

          const score = this.classify.computeScore(
            classification,
            matchedServiceLines,
            matchedIntentTerms,
          );

          this.logger.log(
            `[${sourceName}] Scored ${score}: "${post.title?.substring(0, 60)}" → ${classification.one_line_summary}`,
          );

          if (score < this.saveThreshold) continue;

          const lead = await this.leads.create({
            source: post.source,
            externalId: post.externalId,
            author: post.author,
            title: post.title,
            body: post.body,
            url: post.url,
            createdAt: post.createdAt,
            subreddit: post.subreddit,
            serviceLine: classification.service_line,
            classification,
            score,
            status: 'new',
          });
          saved++;

          if (score >= this.notifyThreshold) {
            await this.notify.notifyLead(lead);
            notified++;
          }
        } catch (err: any) {
          if (err.code === 11000) continue;
          this.logger.error(`Pipeline error for post ${post.externalId}: ${err.message}`);
        }
      }

      this.logger.log(
        `[${sourceName}] Pipeline: ${raw.length} raw → ${fresh.length} new → ${keywordPassed} keyword pass → ${llmPassed} LLM pass → ${saved} saved → ${notified} notified`,
      );
    } catch (err: any) {
      this.logger.error(`${sourceName} pipeline failed: ${err.message}`);
    }
  }
}
