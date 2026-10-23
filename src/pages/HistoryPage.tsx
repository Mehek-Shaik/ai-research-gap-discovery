import React, { useEffect, useState } from 'react';
import {
  History,
  UploadCloud,
  FileSearch,
  Compass,
  GitCompare,
  Lightbulb,
  Trash2,
  Calendar,
  Clock,
  Filter
} from 'lucide-react';
import { api } from '../api/client.ts';
import { AnalysisHistoryItem } from '../types/index.ts';

const ACTION_ICONS: Record<string, any> = {
  upload: UploadCloud,
  extract: FileSearch,
  gap_discovery: Compass,
  compare: GitCompare,
  recommendation_generated: Lightbulb,
  delete: Trash2
};

const ACTION_LABELS: Record<string, string> = {
  upload: 'Paper Upload',
  extract: 'Deep Extraction',
  gap_discovery: 'Gap Discovery',
  compare: 'Cross-Paper Comparison',
  recommendation_generated: 'Recommendation',
  delete: 'Deletion'
};

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>('all');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getHistory();
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter((item) => {
    return filterAction === 'all' || item.action_type === filterAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Analysis Audit History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Immutable timeline of document ingestions, LLM extractions, gap syntheses, and recommendation generations.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 text-xs">
          {(['all', 'upload', 'extract', 'gap_discovery', 'compare', 'recommendation_generated'] as const).map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap ${
                filterAction === act
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {act === 'all' ? 'All Activities' : ACTION_LABELS[act] || act}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Timeline List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-slate-200 bg-white p-4 animate-pulse dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <History className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No history records found
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Actions performed across the platform will appear here with timestamped provenance.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:divide-slate-800">
          {filteredHistory.map((item) => {
            const Icon = ACTION_ICONS[item.action_type] || History;
            let metadataObj: any = null;
            if (item.metadata_json) {
              try {
                metadataObj = JSON.parse(item.metadata_json);
              } catch {}
            }

            return (
              <div key={item.id} className="p-4 sm:p-5 flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {ACTION_LABELS[item.action_type] || item.action_type}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>

                  {metadataObj && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono">
                      {Object.entries(metadataObj).map(([k, v]) => (
                        <span key={k} className="bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
