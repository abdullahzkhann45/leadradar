import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Source, SourceSchema } from './schemas/source.schema';
import { RedditRssConnector } from './reddit-rss.connector';
import { HnConnector } from './hn.connector';
import { GithubConnector } from './github.connector';
import { ProductHuntConnector } from './product-hunt.connector';
import { IndieHackersConnector } from './indie-hackers.connector';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Source.name, schema: SourceSchema }]),
  ],
  controllers: [SourcesController],
  providers: [
    RedditRssConnector,
    HnConnector,
    GithubConnector,
    ProductHuntConnector,
    IndieHackersConnector,
    SourcesService,
  ],
  exports: [
    RedditRssConnector,
    HnConnector,
    GithubConnector,
    ProductHuntConnector,
    IndieHackersConnector,
    SourcesService,
    MongooseModule,
  ],
})
export class SourcesModule {}
