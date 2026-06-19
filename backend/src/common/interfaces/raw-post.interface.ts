export interface RawPost {
  source: string;
  externalId: string;
  author: string;
  title: string;
  body: string;
  url: string;
  createdAt: Date;
  subreddit?: string;
  tag?: string;
}
