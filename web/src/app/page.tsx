'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Lead, LeadsResponse, SERVICE_LINE_NAMES, SOURCE_NAMES } from '@/lib/types';
import LeadCard from '@/components/LeadCard';
import LeadDetail from '@/components/LeadDetail';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [filterServiceLine, setFilterServiceLine] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (filterServiceLine) params.serviceLine = filterServiceLine;
      if (filterStatus) params.status = filterStatus;
      if (filterSource) params.source = filterSource;

      const res: LeadsResponse = await api.leads.list(params);
      setLeads(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch leads.');
    }
    setLoading(false);
  }, [page, filterServiceLine, filterStatus, filterSource]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  const handleLeadUpdate = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l._id === updated._id ? updated : l)));
    setSelectedLead(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Inbox</h1>
          <p className="text-sm text-gray-500">{total} leads total</p>
        </div>
        <button
          onClick={fetchLeads}
          className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={filterServiceLine}
          onChange={(e) => { setFilterServiceLine(e.target.value); setPage(1); }}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="">All Service Lines</option>
          {Object.entries(SERVICE_LINE_NAMES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="">All Statuses</option>
          {['new', 'contacted', 'in_talks', 'won', 'lost'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => { setFilterSource(e.target.value); setPage(1); }}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="">All Sources</option>
          {Object.entries(SOURCE_NAMES)
            .filter(([source]) => source !== 'manual-test')
            .map(([source, label]) => (
              <option key={source} value={source}>{label}</option>
            ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No leads yet. The system will start finding them once the backend is running.
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <LeadCard
              key={lead._id}
              lead={lead}
              onClick={() => setSelectedLead(lead)}
            />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          onUpdate={handleLeadUpdate}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
