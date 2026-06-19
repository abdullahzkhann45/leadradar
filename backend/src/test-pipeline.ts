import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassifyService } from './classify/classify.service';
import { LeadsService } from './leads/leads.service';
import { NotifyService } from './notify/notify.service';
import { RawPost } from './common/interfaces';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const classify = app.get(ClassifyService);
  const leads = app.get(LeadsService);
  const notify = app.get(NotifyService);

  const post: RawPost = {
    source: 'manual-test',
    externalId: `manual-test-${Date.now()}`,
    author: 'test-founder',
    title: 'Need a developer to add an AI chatbot to my SaaS this week',
    body:
      'I am a non-technical founder with a live SaaS product. I am willing to pay a freelancer to add an OpenAI chatbot/AI assistant and need a quote ASAP. Budget is available and deadline is this week.',
    url: 'https://example.com/manual-leadradar-test',
    createdAt: new Date(),
    subreddit: 'manual',
  };

  const keywordResult = await classify.keywordFilter(post);
  if (!keywordResult.pass) {
    throw new Error('Keyword pre-filter failed. Check seeded keywords.');
  }

  const classification = await classify.llmClassify(post);
  if (!classification) {
    throw new Error('Gemini classification failed. Check GEMINI_API_KEY.');
  }

  const score = classify.computeScore(
    classification,
    keywordResult.matchedServiceLines,
    keywordResult.matchedIntentTerms,
  );

  const lead = await leads.create({
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

  if (score >= Number(process.env.NOTIFY_THRESHOLD || 70)) {
    await notify.notifyLead(lead);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        leadId: lead._id,
        score,
        notified: score >= Number(process.env.NOTIFY_THRESHOLD || 70),
        classification,
      },
      null,
      2,
    ),
  );

  await app.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
