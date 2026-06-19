import { RawPost } from './raw-post.interface';

export interface SourceConnector {
  readonly name: string;
  poll(): Promise<RawPost[]>;
}
