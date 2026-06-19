'use client';

import { Lead, SERVICE_LINE_NAMES, STATUS_COLORS } from '@/lib/types';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function sourceIcon(source: string): string {
  switch (source) {
    case 'reddit': return '🟠';
    case 'hackernews': return '🟧';
    case 'github': return '⚫';
    case 'producthunt': return '🟤';
    default: return '🔵';
  }
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 bg-green-50';
  if (score >= 50) return 'text-yellow-600 bg-yellow-50';
  return 'text-gray-600 bg-gray-50';
}

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
  return (
    <div
      onClick={onClick}
      className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 hover:shadow-sm cursor-pointer transition-all bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span title={lead.source}>{sourceIcon(lead.source)}</span>
            <h3 className="font-medium text-sm text-gray-900 truncate">
              {lead.title || 'Untitled'}
            </h3>
          </div>
          <p className="text-xs text-gray-500 truncate mb-2">
            {lead.classification?.one_line_summary || lead.body?.substring(0, 120)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {SERVICE_LINE_NAMES[lead.serviceLine] || `SL${lead.serviceLine}`}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status]}`}>
              {lead.status}
            </span>
            {lead.subreddit && (
              <span className="text-xs text-gray-400">r/{lead.subreddit}</span>
            )}
            <span className="text-xs text-gray-400">{timeAgo(lead.createdAt)}</span>
          </div>
        </div>
        <div className={`text-lg font-bold px-2 py-1 rounded ${scoreColor(lead.score)}`}>
          {lead.score}
        </div>
      </div>
    </div>
  );
}
