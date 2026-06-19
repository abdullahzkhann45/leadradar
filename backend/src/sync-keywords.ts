import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from './app.module';

const removedReactNodeCoreTerms = [
  'bug',
  'broken',
  'fix my',
  'next.js',
  'nestjs',
  'mongodb',
  'build failing',
  'deploy issue',
];

async function syncKeywords() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const keywordModel = app.get<Model<any>>(getModelToken('Keyword'));

  const result = await keywordModel.deleteMany({
    serviceLine: 5,
    type: 'core',
    term: { $in: removedReactNodeCoreTerms },
  });

  console.log(`Removed ${result.deletedCount} noisy React/Node core keywords`);
  await app.close();
}

syncKeywords().catch((err) => {
  console.error('Keyword sync failed:', err);
  process.exit(1);
});
