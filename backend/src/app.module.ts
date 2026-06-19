import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SourcesModule } from './sources/sources.module';
import { IngestModule } from './ingest/ingest.module';
import { ClassifyModule } from './classify/classify.module';
import { LeadsModule } from './leads/leads.module';
import { KeywordsModule } from './keywords/keywords.module';
import { NotifyModule } from './notify/notify.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/leadradar'),
      }),
    }),
    SourcesModule,
    IngestModule,
    ClassifyModule,
    LeadsModule,
    KeywordsModule,
    NotifyModule,
    SchedulerModule,
  ],
})
export class AppModule {}
