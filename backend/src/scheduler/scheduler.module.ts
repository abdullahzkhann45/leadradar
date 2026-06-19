import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { SourcesModule } from '../sources/sources.module';
import { IngestModule } from '../ingest/ingest.module';
import { ClassifyModule } from '../classify/classify.module';
import { LeadsModule } from '../leads/leads.module';
import { NotifyModule } from '../notify/notify.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SourcesModule,
    IngestModule,
    ClassifyModule,
    LeadsModule,
    NotifyModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
