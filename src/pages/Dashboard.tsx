import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  ArrowRight,
  UploadCloud,
  FileSearch,
  Sparkles,
  FileEdit,
  Layers
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { api } from '../api/client.ts';
import { DashboardStats } from '../types/index.ts';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const SEVERITY_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981'
};

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <h2 className="text-base font-semibold">Unable to load dashboard metrics</h2>
        </div>
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const hasData = stats.totalPapers > 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Research Intelligence Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time synthesis of uploaded literature, extracted constraints, and evidenced research gaps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Papers</span>
          </Link>
          <Link
            to="/gaps"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Compass className="h-4 w-4" />
            <span>Explore Gaps</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Papers */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Papers</span>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {stats.totalPapers}
            </span>
            <span className="text-xs text-slate-500">in repository</span>
          </div>
        </div>

        {/* Completed Analyses */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed Analyses</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.analyzedPapers}
            </span>
            <span className="text-xs text-slate-500">fully indexed</span>
          </div>
        </div>

        {/* Candidate Research Gaps */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Identified Research Gaps</span>
            <Compass className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
              {stats.totalGaps}
            </span>
            <span className="text-xs text-slate-500">
              ({stats.validatedGaps} validated)
            </span>
          </div>
        </div>

        {/* Pending Analyses */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Analyses</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {stats.pendingPapers}
            </span>
            <span className="text-xs text-slate-500">queued in pipeline</span>
          </div>
        </div>
      </div>

      {/* Quick Academic Tools Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/proposals"
          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <FileEdit className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">Proposal Workspace</span>
            <span className="text-[10px] text-slate-500 block truncate">Draft grant proposals</span>
          </div>
        </Link>

        <Link
          to="/landscape"
          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">Research Landscape</span>
            <span className="text-[10px] text-slate-500 block truncate">Interactive topic graph</span>
          </div>
        </Link>

        <Link
          to="/compare"
          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">Paper Comparison</span>
            <span className="text-[10px] text-slate-500 block truncate">Semantic heatmap</span>
          </div>
        </Link>

        <Link
          to="/reports"
          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">Reports & Exports</span>
            <span className="text-[10px] text-slate-500 block truncate">HTML, Markdown, JSON</span>
          </div>
        </Link>
      </div>

      {!hasData ? (
        /* Empty State */
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No research papers uploaded yet
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Upload your first PDF scientific papers to extract methodologies, evaluate limitations, and discover evidenced research gaps.
          </p>
          <Link
            to="/upload"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-indigo-700"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Your First Paper</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Domain Distribution */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Research Domain Distribution
                </h3>
                <span className="text-xs text-slate-400">By extracted domain</span>
              </div>
              {stats.domainBreakdown.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.domainBreakdown} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                      <YAxis dataKey="name" type="category" width={140} stroke="#94a3b8" fontSize={11} tickFormatter={(t) => t.length > 20 ? t.slice(0, 18) + '...' : t} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-xs text-slate-400">
                  Domain distribution will display once papers are analyzed.
                </div>
              )}
            </div>

            {/* Gap Severity Distribution */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Research Gap Severity Breakdown
                </h3>
                <span className="text-xs text-slate-400">By critical urgency</span>
              </div>
              {stats.severityBreakdown.length > 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.severityBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                      >
                        {stats.severityBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={SEVERITY_COLORS[entry.name] || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-xs text-slate-400">
                  No gaps identified yet. Run research gap discovery across your papers.
                </div>
              )}
            </div>
          </div>

          {/* Tables Row: Recent Papers & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Papers Table (2 Columns) */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Recently Uploaded Literature
                </h3>
                <Link
                  to="/library"
                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <span>View all papers</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                      <th className="pb-3 font-medium">Title</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Size</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stats.recentPapers.map((paper) => (
                      <tr key={paper.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">
                          {paper.title}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            paper.status === 'analyzed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : paper.status === 'error'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            <span className="capitalize">{paper.status}</span>
                          </span>
                        </td>
                        <td className="py-3 text-right text-slate-500 font-mono tabular-nums">
                          {(paper.file_size / 1024).toFixed(0)} KB
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            to={`/analyze?paperId=${paper.id}`}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium"
                          >
                            <span>Inspect</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity Feed (1 Column) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Analysis Activity
                </h3>
                <Link
                  to="/history"
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Full Log
                </Link>
              </div>

              <div className="space-y-4">
                {stats.recentActivity.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {act.action_type === 'upload' ? <UploadCloud className="h-3 w-3" /> :
                       act.action_type === 'extract' ? <FileSearch className="h-3 w-3" /> :
                       act.action_type === 'gap_discovery' ? <Compass className="h-3 w-3" /> :
                       <Sparkles className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 dark:text-slate-200 line-clamp-2">
                        {act.description}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {new Date(act.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
