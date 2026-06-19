'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Stats, SERVICE_LINE_NAMES } from '@/lib/types';

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.leads.stats();
        setStats(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch stats.');
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading stats...</div>;
  }

  if (!stats) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error || 'Failed to load stats.'}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Stats</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.todayCount}</p>
          <p className="text-xs text-gray-500">Leads Today</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.weekCount}</p>
          <p className="text-xs text-gray-500">Leads This Week</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-2xl font-bold text-gray-900">
            {stats.byStatus.find((s) => s._id === 'won')?.count || 0}
          </p>
          <p className="text-xs text-gray-500">Won</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-2xl font-bold text-gray-900">
            {stats.byStatus.find((s) => s._id === 'contacted')?.count || 0}
          </p>
          <p className="text-xs text-gray-500">Contacted</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">By Source (7d)</h3>
          {stats.bySource.length === 0 ? (
            <p className="text-xs text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.bySource.map((item) => (
                <div key={item._id} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{item._id}</span>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">By Service Line (7d)</h3>
          {stats.byServiceLine.length === 0 ? (
            <p className="text-xs text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.byServiceLine.map((item) => (
                <div key={item._id} className="flex items-center justify-between">
                  <span className="text-sm">
                    {SERVICE_LINE_NAMES[item._id] || `SL${item._id}`}
                  </span>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">By Status (All Time)</h3>
          {stats.byStatus.length === 0 ? (
            <p className="text-xs text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.byStatus.map((item) => (
                <div key={item._id} className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {(item._id || 'unknown').replace('_', ' ')}
                  </span>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
