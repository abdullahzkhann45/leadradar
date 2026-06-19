import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HnConnector } from './sources/hn.connector';
import { GithubConnector } from './sources/github.connector';
import { IndieHackersConnector } from './sources/indie-hackers.connector';
import { ProductHuntConnector } from './sources/product-hunt.connector';
import { RedditRssConnector } from './sources/reddit-rss.connector';

async function testSources() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const checks = [
    ['hackernews', app.get(HnConnector)],
    ['github', app.get(GithubConnector)],
    ['indiehackers', app.get(IndieHackersConnector)],
    ['producthunt', app.get(ProductHuntConnector)],
    ['reddit', app.get(RedditRssConnector)],
  ] as const;

  const results: any[] = [];

  for (const [name, connector] of checks) {
    try {
      const posts = await connector.poll();
      results.push({
        source: name,
        ok: true,
        count: posts.length,
        sample: posts[0]
          ? {
              title: posts[0].title,
              url: posts[0].url,
              createdAt: posts[0].createdAt,
            }
          : null,
      });
    } catch (err: any) {
      results.push({
        source: name,
        ok: false,
        error: err.message,
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
  await app.close();
}

testSources().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
