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

  const r4 = await keywordModel.deleteMany({
    serviceLine: 3,
    type: 'core',
    term: 'v0 app',
  });
  if (r4.deletedCount) console.log(`Removed 'v0 app' keyword`);

  // Remove 'lovable' from SL3 core (common English adjective)
  const r5 = await keywordModel.deleteMany({
    serviceLine: 3,
    type: 'core',
    term: 'lovable',
  });
  console.log(`Removed ${r5.deletedCount} 'lovable' core keyword`);

  // Remove broken 'compensat' intent term
  const r6 = await keywordModel.deleteMany({
    type: 'intent',
    term: 'compensat',
  });
  console.log(`Removed ${r6.deletedCount} broken 'compensat' intent term`);

  // Insert 'compensation' and 'compensate' as intent terms (idempotent)
  const newIntentTerms = ['compensation', 'compensate'];
  let inserted = 0;
  for (const term of newIntentTerms) {
    const exists = await keywordModel.findOne({ term, type: 'intent' });
    if (!exists) {
      await keywordModel.create({ serviceLine: 0, term, type: 'intent', enabled: true });
      inserted++;
    }
  }
  console.log(`Inserted ${inserted} new intent terms (${newIntentTerms.join(', ')})`);

  await app.close();
}

syncKeywords().catch((err) => {
  console.error('Keyword sync failed:', err);
  process.exit(1);
});
