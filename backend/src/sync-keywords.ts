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

const noisySl1Terms = ['gemini', 'llm', 'gpt', 'rag'];
const noisySl3Terms = ['cursor', 'v0'];

async function syncKeywords() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const keywordModel = app.get<Model<any>>(getModelToken('Keyword'));

  const r1 = await keywordModel.deleteMany({
    serviceLine: 5,
    type: 'core',
    term: { $in: removedReactNodeCoreTerms },
  });
  console.log(`Removed ${r1.deletedCount} noisy React/Node core keywords`);

  const r2 = await keywordModel.deleteMany({
    serviceLine: 1,
    type: 'core',
    term: { $in: noisySl1Terms },
  });
  console.log(`Removed ${r2.deletedCount} noisy AI/LLM core keywords (gemini, llm, gpt, rag)`);

  const r3 = await keywordModel.deleteMany({
    serviceLine: 3,
    type: 'core',
    term: { $in: noisySl3Terms },
  });
  console.log(`Removed ${r3.deletedCount} noisy vibe-coded core keywords (cursor, v0)`);

  // Also remove the orphaned 'v0 app' compound term since 'v0' is gone
  const r4 = await keywordModel.deleteMany({
    serviceLine: 3,
    type: 'core',
    term: 'v0 app',
  });
  if (r4.deletedCount) console.log(`Removed 'v0 app' keyword`);

  await app.close();
}

syncKeywords().catch((err) => {
  console.error('Keyword sync failed:', err);
  process.exit(1);
});
