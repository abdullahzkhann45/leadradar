import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from './app.module';

const sources = [
  {
    type: 'github',
    enabled: true,
    config: {
      queries: [
        '"need a developer"',
        '"looking for a developer"',
        '"build my app"',
        '"fix my app"',
        '"supabase error"',
        '"lovable"',
        '"bolt.new"',
        '"chrome extension"',
        '"AI integration"',
      ],
    },
    pollIntervalSec: 120,
  },
  {
    type: 'producthunt',
    enabled: true,
    config: {
      notes: 'Requires PRODUCT_HUNT_TOKEN. Polls newest launches.',
    },
    pollIntervalSec: 300,
  },
  {
    type: 'indiehackers',
    enabled: true,
    config: {
      feeds: [
        'https://www.indiehackers.com/',
      ],
    },
    pollIntervalSec: 300,
  },
];

async function syncSources() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const sourceModel = app.get<Model<any>>(getModelToken('Source'));

  for (const source of sources) {
    const update =
      source.type === 'indiehackers' || source.type === 'producthunt'
        ? {
            $set: {
              enabled: source.enabled,
              config: source.config,
              pollIntervalSec: source.pollIntervalSec,
            },
            $setOnInsert: { type: source.type },
          }
        : { $setOnInsert: source };

    await sourceModel.updateOne(
      { type: source.type },
      update,
      { upsert: true },
    );
  }

  console.log(`Synced ${sources.length} additional sources`);
  await app.close();
}

syncSources().catch((err) => {
  console.error('Source sync failed:', err);
  process.exit(1);
});
