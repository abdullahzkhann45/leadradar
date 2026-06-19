export interface Classification {
  is_relevant: boolean;
  service_line: number;
  is_nontechnical_founder: boolean;
  intent_to_pay: 'explicit' | 'implied' | 'none';
  budget_signal: boolean;
  urgency: 'high' | 'medium' | 'low';
  one_line_summary: string;
  suggested_proof: string;
  confidence: number;
}

export interface Lead {
  _id: string;
  source: string;
  externalId: string;
  author: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  subreddit?: string;
  serviceLine: number;
  classification: Classification;
  score: number;
  status: 'new' | 'contacted' | 'in_talks' | 'won' | 'lost';
  feedback: number | null;
  notifiedAt?: string;
}

export interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Keyword {
  _id: string;
  serviceLine: number;
  term: string;
  type: 'core' | 'intent' | 'blacklist';
  enabled: boolean;
}

export interface Source {
  _id: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
  pollIntervalSec: number;
  lastPolledAt?: string;
  lastCursor?: string;
}

export interface Stats {
  todayCount: number;
  weekCount: number;
  bySource: { _id: string; count: number }[];
  byServiceLine: { _id: number; count: number }[];
  byStatus: { _id: string; count: number }[];
}

export const SERVICE_LINE_NAMES: Record<number, string> = {
  1: 'AI / LLM',
  2: 'Chrome Extension',
  3: 'Vibe-coded Fix',
  4: 'MVP Build',
  5: 'React/Node Fix',
};

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  in_talks: 'bg-purple-100 text-purple-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-800',
};

export const SOURCE_NAMES: Record<string, string> = {
  reddit: 'Reddit',
  hackernews: 'Hacker News',
  github: 'GitHub',
  producthunt: 'Product Hunt',
  indiehackers: 'Indie Hackers',
  'manual-test': 'Manual Test',
};
