import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  Printer,
  Sparkles,
  BookOpen,
  Compass,
  Lightbulb,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client.ts';
import { DashboardStats, Paper, ResearchGap, Recommendation } from '../types/index.ts';

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState<'executive' | 'gaps' | 'recs'>('executive');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedStats, fetchedPapers, fetchedGaps, fetchedRecs] = await Promise.all([
        api.getStats(),
        api.getPapers(),
        api.getGaps(),
        api.getRecommendations()
      ]);
      setStats(fetchedStats);
      setPapers(fetchedPapers);
      setGaps(fetchedGaps);
      setRecs(fetchedRecs);
    } catch (err: any) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMarkdown = () => {
    let md = `# Academic Research Gap Intelligence Report\n\n`;
    md += `*Generated: ${new Date().toLocaleString()}*\n\n`;
    md += `## 1. Executive Summary\n`;
    md += `Indexed Papers: ${papers.length} · Evidenced Gaps: ${gaps.length} · Future Directions: ${recs.length}\n\n`;
    md += `## 2. Research Papers\n`;
    papers.forEach((p, idx) => {
      md += `${idx + 1}. **${p.title}** (${p.publication_year || 'Year N/A'}) - ${p.status}\n`;
    });
    md += `\n## 3. Discovered Research Gaps\n`;
    gaps.forEach((g, idx) => {
      md += `${idx + 1}. **${g.title || g.gap_title}** [${g.gap_type || 'Gap'}]\n`;
      md += `   - Priority: ${g.priority} | Status: ${g.validation_status}\n`;
      md += `   - Description: ${g.description || g.gap_description}\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="text-xs text-slate-500 font-medium">Assembling academic intelligence reports...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <h2 className="text-base font-semibold">Unable to load report data</h2>
        </div>
        <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p>
        <button onClick={fetchData} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academic Research Reports & Exports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate verifiable, publication-grade synthesis documents grounded in empirical extractions and discovered gaps.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HTML Academic Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Executive Academic Report (HTML)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Standalone publication-ready document complete with executive summary, metadata tables, empirical evidence excerpts, and print styling.
            </p>
          </div>
          <a
            href={api.getExportReportUrl('html')}
            download
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download HTML Report</span>
          </a>
        </div>

        {/* Markdown Synthesis */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Literature Synthesis (Markdown)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Full markdown representation suitable for GitHub repos, academic thesis chapters, Notion, or Overleaf LaTeX conversion.
            </p>
          </div>
          <a
            href={api.getExportReportUrl('markdown')}
            download
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Markdown (.md)</span>
          </a>
        </div>

        {/* JSON Structured Dataset */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Schema-Validated Data (JSON)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Machine-readable structured JSON payload containing complete parsed sections, embeddings metadata, heuristic score breakdowns, and OpenAlex prior art checks.
            </p>
          </div>
          <a
            href={api.getExportReportUrl('json')}
            download
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download JSON Dataset</span>
          </a>
        </div>
      </div>

      {/* Live In-Browser Report Preview */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {/* Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreviewTab('executive')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                previewTab === 'executive'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Executive Summary Preview
            </button>
            <button
              onClick={() => setPreviewTab('gaps')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                previewTab === 'gaps'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Evidenced Gaps ({gaps.length})
            </button>
            <button
              onClick={() => setPreviewTab('recs')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                previewTab === 'recs'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Future Directions ({recs.length})
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            Live Database Synchronization Active
          </span>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {previewTab === 'executive' && (
            <div className="space-y-6 text-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Executive Literature Intelligence Synthesis
                </h2>
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  Comprehensive audit generated from {papers.length} peer-reviewed research papers in local repository.
                </p>
              </div>

              {/* Table of Papers */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                      <th className="py-2.5 pr-4">Paper Title</th>
                      <th className="py-2.5 pr-4">Year</th>
                      <th className="py-2.5 pr-4">Domain</th>
                      <th className="py-2.5">Analysis Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {papers.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white max-w-md truncate">
                          {p.title}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-slate-500">
                          {p.publication_year || 'N/A'}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500">
                          {p.research_domain || 'General Computing'}
                        </td>
                        <td className="py-2.5">
                          <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {previewTab === 'gaps' && (
            <div className="space-y-4">
              {gaps.length > 0 ? (
                gaps.map((g, idx) => (
                  <div
                    key={g.id || idx}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                        {g.gap_type || 'Empirical Gap'} · Priority {g.priority}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        Status: {g.validation_status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {g.title || g.gap_title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {g.description || g.gap_description}
                    </p>
                    {g.proposed_research_question && (
                      <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                        RQ: {g.proposed_research_question}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 italic">No candidate gaps discovered yet.</div>
              )}
            </div>
          )}

          {previewTab === 'recs' && (
            <div className="space-y-4">
              {recs.length > 0 ? (
                recs.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase">
                        Feasibility: {r.feasibility_rating}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {r.recommendation_title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {r.proposed_methodology}
                    </p>
                    <div className="text-slate-500 text-[11px]">
                      Expected Impact: {r.expected_impact}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 italic">No recommendations formulated yet.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
