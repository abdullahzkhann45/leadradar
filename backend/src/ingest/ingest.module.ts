import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Seen, SeenSchema } from './schemas/seen.schema';
import { IngestService } from './ingest.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Seen.name, schema: SeenSchema }]),
  ],
  providers: [IngestService],
  exports: [IngestService],
})
export class IngestModule {}
