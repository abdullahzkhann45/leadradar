import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const keywordModel = app.get<Model<any>>(getModelToken('Keyword'));
  const sourceModel = app.get<Model<any>>(getModelToken('Source'));

  // Clear existing seeds
  await keywordModel.deleteMany({});
  await sourceModel.deleteMany({});

  // Service line 1: AI / LLM integration (top priority)
  const sl1Keywords = [
    'add ai', 'chatbot', 'ai feature', 'openai', 'chatgpt',
    'claude api', 'ai integration', 'embed ai',
    'ai assistant', 'ai app', 'langchain', 'vector database',
  ];

  // Service line 2: Chrome extension
  const sl2Keywords = [
    'chrome extension', 'browser extension', 'extension dev', 'manifest v3',
    'chrome plugin',
  ];

  // Service line 3: Fix / finish vibe-coded app
  const sl3Keywords = [
    'bolt.new', 'replit', 'supabase error',
    'vibe coded', 'vibe-coded', 'ai built app', 'no-code app broken',
    'ai generated app', 'bolt app',
  ];

  // Service line 4: Full-stack MVP build / finish
  const sl4Keywords = [
    'build my mvp', 'finish my app', 'need a developer',
    'looking for a developer', 'build a web app', 'saas developer',
    'need developer', 'hire developer', 'build my app', 'mvp development',
    'web app development', 'need a coder', 'looking for coder',
  ];

  // Service line 5: React / Next / Node bug fix & deploy
  const sl5Keywords = [
    'deployment failing', 'vercel error',
    'react error', 'node.js error',
  ];

  // Intent/budget boost terms
  const intentTerms = [
    'willing to pay', 'budget', 'hire', 'paid', 'rate', 'quote',
    'freelancer', 'contract', 'deadline', 'asap', 'paying', 'compensation',
    'compensate', 'hourly', 'fixed price', 'project rate',
  ];

  // Blacklist terms
  const blacklistTerms = [
    'free only', 'no budget', 'unpaid', 'equity only',
    'hiring full-time employee', 'w2', 'recruiter', 'no pay',
    'volunteer', 'internship', 'equity-only', 'for free',
  ];

  const keywords: any[] = [];

  for (const term of sl1Keywords)
    keywords.push({ serviceLine: 1, term, type: 'core', enabled: true });
  for (const term of sl2Keywords)
    keywords.push({ serviceLine: 2, term, type: 'core', enabled: true });
  for (const term of sl3Keywords)
    keywords.push({ serviceLine: 3, term, type: 'core', enabled: true });
  for (const term of sl4Keywords)
    keywords.push({ serviceLine: 4, term, type: 'core', enabled: true });
  for (const term of sl5Keywords)
    keywords.push({ serviceLine: 5, term, type: 'core', enabled: true });
  for (const term of intentTerms)
    keywords.push({ serviceLine: 0, term, type: 'intent', enabled: true });
  for (const term of blacklistTerms)
    keywords.push({ serviceLine: 0, term, type: 'blacklist', enabled: true });

  await keywordModel.insertMany(keywords);
  console.log(`Seeded ${keywords.length} keywords`);

  // Seed sources
  await sourceModel.create({
    type: 'reddit',
    enabled: true,
    config: {
      subreddits: [
        'SaaS', 'startups', 'Entrepreneur', 'SideProject', 'nocode',
        'cofounder', 'indiehackers', 'microsaas', 'EntrepreneurRideAlong',
        'webdev', 'forhire', 'freelance', 'lovable', 'vibecoding',
        'bolt', 'cursor', 'Supabase', 'v0', 'slavelabour',
        'hwstartups', 'smallbusiness', 'AppIdeas',
      ],
    },
    pollIntervalSec: 60,
  });

  await sourceModel.create({
    type: 'hackernews',
    enabled: true,
    config: {
      queries: [
        'freelance',
        'hire developer',
        'need developer',
        'looking for developer',
        'chrome extension',
        'AI integration',
        'build MVP',
        'fix my app',
      ],
    },
    pollIntervalSec: 60,
  });

  await sourceModel.create({
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
  });

  await sourceModel.create({
    type: 'producthunt',
    enabled: true,
    config: {
      notes: 'Requires PRODUCT_HUNT_TOKEN. Polls newest launches.',
    },
    pollIntervalSec: 300,
  });

  await sourceModel.create({
    type: 'indiehackers',
    enabled: true,
    config: {
      feeds: [
        'https://www.indiehackers.com/',
      ],
    },
    pollIntervalSec: 300,
  });

  console.log('Seeded 5 sources (Reddit + HN + GitHub + Product Hunt + Indie Hackers)');
  await app.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
