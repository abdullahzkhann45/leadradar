'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Keyword, SERVICE_LINE_NAMES } from '@/lib/types';

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTerm, setNewTerm] = useState('');
  const [newServiceLine, setNewServiceLine] = useState(1);
  const [newType, setNewType] = useState<'core' | 'intent' | 'blacklist'>('core');

  const fetchKeywords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.keywords.list();
      setKeywords(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch keywords.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchKeywords(); }, []);

  const handleAdd = async () => {
    if (!newTerm.trim()) return;
    try {
      await api.keywords.create({
        term: newTerm.trim().toLowerCase(),
        serviceLine: newType === 'core' ? newServiceLine : 0,
        type: newType,
        enabled: true,
      });
      setNewTerm('');
      fetchKeywords();
    } catch (err: any) {
      setError(err?.message || 'Failed to add keyword.');
    }
  };

  const handleToggle = async (kw: Keyword) => {
    try {
      await api.keywords.update(kw._id, { enabled: !kw.enabled });
      fetchKeywords();
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle keyword.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.keywords.remove(id);
      fetchKeywords();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete keyword.');
    }
  };

  const grouped = keywords.reduce((acc, kw) => {
    const group = kw.type === 'core'
      ? SERVICE_LINE_NAMES[kw.serviceLine] || `Service Line ${kw.serviceLine}`
      : kw.type === 'intent' ? 'Intent / Budget Boost' : 'Blacklist';
    if (!acc[group]) acc[group] = [];
    acc[group].push(kw);
    return acc;
  }, {} as Record<string, Keyword[]>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Keywords</h1>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Add Keyword</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Enter keyword..."
            className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as any)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="core">Core</option>
            <option value="intent">Intent</option>
            <option value="blacklist">Blacklist</option>
          </select>
          {newType === 'core' && (
            <select
              value={newServiceLine}
              onChange={(e) => setNewServiceLine(Number(e.target.value))}
              className="border rounded px-2 py-1.5 text-sm"
            >
              {Object.entries(SERVICE_LINE_NAMES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleAdd}
            className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700"
          >
            Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading keywords...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, kws]) => (
            <div key={group} className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {group} ({kws.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {kws.map((kw) => (
                  <span
                    key={kw._id}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                      kw.enabled
                        ? kw.type === 'blacklist'
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : kw.type === 'intent'
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                    }`}
                  >
                    {kw.term}
                    <button
                      onClick={() => handleToggle(kw)}
                      className="hover:text-gray-900 ml-1"
                      title={kw.enabled ? 'Disable' : 'Enable'}
                    >
                      {kw.enabled ? '●' : '○'}
                    </button>
                    <button
                      onClick={() => handleDelete(kw._id)}
                      className="hover:text-red-600 ml-0.5"
                      title="Delete"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
