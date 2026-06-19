'use client';

import { useState } from 'react';
import { Lead, SERVICE_LINE_NAMES, STATUS_COLORS } from '@/lib/types';
import { api } from '@/lib/api';

const STATUSES = ['new', 'contacted', 'in_talks', 'won', 'lost'] as const;

interface LeadDetailProps {
  lead: Lead;
  onUpdate: (lead: Lead) => void;
  onClose: () => void;
}

export default function LeadDetail({ lead, onUpdate, onClose }: LeadDetailProps) {
  const [status, setStatus] = useState(lead.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.leads.update(lead._id, { status: newStatus });
      setStatus(newStatus as any);
      onUpdate(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to update status.');
    }
    setSaving(false);
  };

  const handleFeedback = async (value: number) => {
    setError(null);
    try {
      const updated = await api.leads.update(lead._id, { feedback: value });
      onUpdate(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to update feedback.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Lead Detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <h3 className="font-medium text-gray-900">{lead.title || 'Untitled'}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <span>{lead.source}</span>
              {lead.subreddit && <span>r/{lead.subreddit}</span>}
              <span>by {lead.author}</span>
            </div>
          </div>

          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
          >
            Open Original Post &rarr;
          </a>

          <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
            {lead.body || 'No body text'}
          </div>

          {lead.classification && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Classification</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Service Line:</span>{' '}
                  <span className="font-medium">
                    {SERVICE_LINE_NAMES[lead.classification.service_line]}
                  </span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Intent:</span>{' '}
                  <span className="font-medium">{lead.classification.intent_to_pay}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Budget Signal:</span>{' '}
                  <span className="font-medium">
                    {lead.classification.budget_signal ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Urgency:</span>{' '}
                  <span className="font-medium">{lead.classification.urgency}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Confidence:</span>{' '}
                  <span className="font-medium">
                    {Math.round(lead.classification.confidence * 100)}%
                  </span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Suggested Proof:</span>{' '}
                  <span className="font-medium">{lead.classification.suggested_proof}</span>
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-sm">
                <span className="text-gray-500">Summary:</span>{' '}
                {lead.classification.one_line_summary}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
            <div className="flex gap-1 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={saving}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    status === s
                      ? STATUS_COLORS[s] + ' border-transparent font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback</h4>
            <div className="flex gap-2">
              <button
                onClick={() => handleFeedback(1)}
                className={`px-4 py-2 rounded text-sm border ${
                  lead.feedback === 1
                    ? 'bg-green-100 border-green-300'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                👍 Good Lead
              </button>
              <button
                onClick={() => handleFeedback(-1)}
                className={`px-4 py-2 rounded text-sm border ${
                  lead.feedback === -1
                    ? 'bg-red-100 border-red-300'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                👎 Bad Lead
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-400 pt-4 border-t">
            <p>Score: {lead.score} | ID: {lead._id}</p>
            <p>Created: {new Date(lead.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
