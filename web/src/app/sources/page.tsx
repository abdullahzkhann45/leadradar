'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SOURCE_NAMES, Source } from '@/lib/types';

const SOURCE_BADGES: Record<string, string> = {
  reddit: 'RD',
  hackernews: 'HN',
  github: 'GH',
  producthunt: 'PH',
  indiehackers: 'IH',
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.sources.list();
      setSources(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch sources.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleToggle = async (source: Source) => {
    try {
      await api.sources.update(source._id, { enabled: !source.enabled });
      fetchSources();
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle source.');
    }
  };

  const saveArrayConfig = async (
    source: Source,
    key: 'subreddits' | 'queries' | 'feeds',
    separator: 'comma' | 'line',
  ) => {
    try {
      const values = editValue
        .split(separator === 'comma' ? ',' : '\n')
        .map((item) => item.trim())
        .filter(Boolean);

      await api.sources.update(source._id, {
        config: { ...source.config, [key]: values },
      });
      setEditingId(null);
      fetchSources();
    } catch (err: any) {
      setError(err?.message || 'Failed to update source.');
    }
  };

  const renderArrayEditor = (
    source: Source,
    key: 'subreddits' | 'queries' | 'feeds',
    label: string,
    separator: 'comma' | 'line',
    badgeClass: string,
  ) => {
    const values = source.config?.[key] || [];

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">{label}</span>
          {editingId === source._id ? (
            <div className="flex gap-1">
              <button
                onClick={() => saveArrayConfig(source, key, separator)}
                className="text-xs text-blue-600 hover:underline"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="text-xs text-gray-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingId(source._id);
                setEditValue(values.join(separator === 'comma' ? ', ' : '\n'));
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {editingId === source._id ? (
          <textarea
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            className="w-full text-xs border rounded p-2 font-mono"
            rows={key === 'subreddits' ? 3 : 5}
            placeholder={separator === 'comma' ? 'Comma-separated values' : 'One value per line'}
          />
        ) : (
          <div className="flex flex-wrap gap-1">
            {values.map((value: string) => (
              <span key={value} className={`text-xs px-2 py-0.5 rounded ${badgeClass}`}>
                {key === 'subreddits' ? `r/${value}` : value}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Sources</h1>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading sources...</div>
      ) : sources.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No sources configured. Run the seed script to populate.
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map((source) => (
            <div key={source._id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-gray-700">
                    {SOURCE_BADGES[source.type] || source.type.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {SOURCE_NAMES[source.type] || source.type}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Poll every {source.pollIntervalSec}s
                      {source.lastPolledAt && (
                        <> | Last: {new Date(source.lastPolledAt).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(source)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    source.enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {source.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {source.type === 'reddit' &&
                renderArrayEditor(
                  source,
                  'subreddits',
                  'Subreddits',
                  'comma',
                  'bg-orange-50 text-orange-700',
                )}

              {source.type === 'hackernews' &&
                renderArrayEditor(
                  source,
                  'queries',
                  'Search Queries',
                  'line',
                  'bg-yellow-50 text-yellow-700',
                )}

              {source.type === 'github' &&
                renderArrayEditor(
                  source,
                  'queries',
                  'Search Queries',
                  'line',
                  'bg-gray-100 text-gray-700',
                )}

              {source.type === 'producthunt' && (
                <div className="text-xs text-gray-500">
                  Polls newest launches. Requires{' '}
                  <span className="font-mono">PRODUCT_HUNT_TOKEN</span>.
                </div>
              )}

              {source.type === 'indiehackers' &&
                renderArrayEditor(
                  source,
                  'feeds',
                  'RSS Feeds',
                  'line',
                  'bg-green-50 text-green-700',
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
