import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lightbulb,
  Check,
  X,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Globe,
  ExternalLink,
  BookOpen,
  HelpCircle,
  BarChart3,
  Download,
  FileEdit
} from 'lucide-react';
import { api } from '../api/client.ts';
import { ResearchGap, LiteratureCheckResult } from '../types/index.ts';
import { EvidenceInspectorModal, InspectedEvidence } from '../components/EvidenceInspectorModal.tsx';

export const GapsPage: React.FC = () => {
  const navigate = useNavigate();
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGap, setSelectedGap] = useState<ResearchGap | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Literature Verification State
  const [verifyingLit, setVerifyingLit] = useState(false);
  const [litResult, setLitResult] = useState<LiteratureCheckResult | null>(null);
  const [inspectingEvidence, setInspectingEvidence] = useState<InspectedEvidence | null>(null);

  const fetchGaps = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getGaps();
      setGaps(data);
      if (data.length > 0 && !selectedGap) {
        setSelectedGap(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch research gaps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGaps();
  }, []);

  const handleRunDiscovery = async () => {
    setDiscovering(true);
    setError(null);
    try {
      await api.discoverGaps();
      await fetchGaps();
    } catch (err: any) {
      setError(err.message || 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleUpdateStatus = async (gapId: string, newStatus: 'requires_review' | 'validated' | 'refuted') => {
    setStatusUpdating(gapId);
    try {
      await api.updateGapStatus(gapId, newStatus);
      setGaps((prev) =>
        prev.map((g) => (g.id === gapId ? { ...g, validation_status: newStatus } : g))
      );
      if (selectedGap?.id === gapId) {
        setSelectedGap((prev) => (prev ? { ...prev, validation_status: newStatus } : null));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update gap validation status');
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleCheckBroaderLiterature = async (gap: ResearchGap) => {
    setVerifyingLit(true);
    setLitResult(null);
    try {
      const res = await api.verifyLiterature(gap.title);
      setLitResult(res);
      // Update local gap literature status
      setGaps((prev) =>
        prev.map((g) =>
          g.id === gap.id
            ? {
                ...g,
                literature_novelty_status: res.status as any,
                literature_references: res.works
              }
            : g
        )
      );
      if (selectedGap?.id === gap.id) {
        setSelectedGap((prev) =>
          prev
            ? {
                ...prev,
                literature_novelty_status: res.status as any,
                literature_references: res.works
              }
            : null
        );
      }
    } catch (err: any) {
      alert(err.message || 'Literature verification failed');
    } finally {
      setVerifyingLit(false);
    }
  };

  const handleCreateRecommendation = (gap: ResearchGap) => {
    navigate(`/recommendations?gapId=${gap.id}`);
  };

  const filteredGaps = gaps.filter((g) => {
    const titleText = (g.title || g.gap_title || '').toLowerCase();
    const descText = (g.description || g.gap_description || '').toLowerCase();
    const matchesSearch =
      titleText.includes(searchQuery.toLowerCase()) || descText.includes(searchQuery.toLowerCase());

    const typeText = g.gap_type || g.gap_category || '';
    const matchesCategory = categoryFilter === 'all' || typeText === categoryFilter;

    const matchesStatus = statusFilter === 'all' || g.validation_status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || (g.priority || '').toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Research Gap Discovery
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Synthesized candidate research gaps evidenced directly by limitations, assumptions, and evaluation boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getExportReportUrl('markdown')}
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Report</span>
          </a>

          <button
            onClick={handleRunDiscovery}
            disabled={discovering}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            {discovering ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Analyzing Literature Gaps...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Discover Gaps</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search research gaps by keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 transition-colors hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:focus:text-white dark:focus:ring-2 dark:focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 transition-colors hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:focus:text-white dark:focus:ring-2 dark:focus:ring-indigo-500/30"
            >
              <option value="all">All Categories</option>
              <option value="Methodological">Methodological</option>
              <option value="Empirical">Empirical</option>
              <option value="Theoretical">Theoretical</option>
              <option value="Practical/Application">Practical / Application</option>
              <option value="Benchmark & Evaluation">Benchmark & Evaluation</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 transition-colors hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:focus:text-white dark:focus:ring-2 dark:focus:ring-indigo-500/30"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Validation Status Segmented Tabs */}
        <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(['all', 'requires_review', 'validated', 'refuted'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {st === 'all' ? 'All Statuses' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split View */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 rounded-xl border border-slate-200 bg-white p-6 animate-pulse dark:border-slate-800 dark:bg-slate-900" />
          <div className="h-96 rounded-xl border border-slate-200 bg-white p-6 animate-pulse dark:border-slate-800 dark:bg-slate-900" />
        </div>
      ) : filteredGaps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <Compass className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No research gaps match your criteria
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Click "Discover Gaps" to perform comparative cross-paper synthesis over your analyzed repository.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Gaps Cards (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {filteredGaps.map((gap) => {
              const title = gap.title || gap.gap_title;
              const desc = gap.description || gap.gap_description;
              const gapType = gap.gap_type || gap.gap_category || 'Methodological';
              const priority = gap.priority || gap.severity || 'medium';

              return (
                <div
                  key={gap.id}
                  onClick={() => {
                    setSelectedGap(gap);
                    setLitResult(null);
                  }}
                  className={`rounded-xl border p-5 shadow-xs transition-all cursor-pointer ${
                    selectedGap?.id === gap.id
                      ? 'border-indigo-600 bg-indigo-50/20 dark:border-indigo-500 dark:bg-indigo-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      {/* Metadata Line */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>{gapType}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`capitalize font-semibold ${
                          priority.toLowerCase() === 'high' ? 'text-red-600 dark:text-red-400' :
                          priority.toLowerCase() === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                          'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {priority} Priority
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{gap.validation_status.replace('_', ' ')}</span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                        {title}
                      </h3>
                    </div>

                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${
                      gap.validation_status === 'validated'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : gap.validation_status === 'refuted'
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {gap.validation_status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {desc}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>
                      Confidence: <strong className="text-slate-700 dark:text-slate-300 font-mono">{((gap.confidence || 0.85) * 100).toFixed(0)}%</strong>
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                      <span>Inspect Evidence & Scoring</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Evidence, Heuristic Score & Literature Novelty (5 Cols) */}
          <div className="lg:col-span-5">
            {selectedGap ? (
              <div className="sticky top-20 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                {/* Header & Status Selector */}
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Ground-Truth Evidence Record
                    </span>
                    <div className="flex items-center gap-1">
                      {(['requires_review', 'validated', 'refuted'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(selectedGap.id, st)}
                          disabled={statusUpdating === selectedGap.id}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            selectedGap.validation_status === st
                              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedGap.title || selectedGap.gap_title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedGap.description || selectedGap.gap_description}
                  </p>
                </div>

                {/* Transparent Heuristic Scoring Breakdown */}
                {selectedGap.scores_breakdown && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                        <span>Heuristic Scoring Model</span>
                      </span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        Composite: {(selectedGap.scores_breakdown.composite_score * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 block">Evidence Strength (35%):</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {(selectedGap.scores_breakdown.evidence_strength * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 block">Recurrence Score (25%):</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {(selectedGap.scores_breakdown.recurrence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 block">Cross-Paper Agreement (25%):</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {(selectedGap.scores_breakdown.cross_paper_agreement * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 block">Priority / Impact (15%):</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {(selectedGap.scores_breakdown.impact_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence Excerpts */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      Direct Paper Limitations & Citations
                    </h4>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                      Click excerpt to inspect primary PDF
                    </span>
                  </div>
                  {selectedGap.evidence && selectedGap.evidence.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedGap.evidence.map((ev, i) => (
                        <div
                          key={ev.id || i}
                          onClick={() => {
                            setInspectingEvidence({
                              excerpt: ev.excerpt,
                              paper_id: ev.paper_id,
                              paper_title: ev.paper_title || (selectedGap.supporting_papers && selectedGap.supporting_papers[0]) || 'Analyzed Research Paper',
                              section_name: ev.section_name,
                              page_number: ev.page_number,
                              confidence_score: ev.confidence_score,
                              verification_status: ev.verification_status || 'verified',
                              explanation: ev.explanation,
                              category: selectedGap.gap_type
                            });
                          }}
                          className="group cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-1.5 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs"
                        >
                          <blockquote className="font-serif italic text-slate-800 dark:text-slate-200 leading-relaxed group-hover:text-indigo-900 dark:group-hover:text-indigo-200">
                            "{ev.excerpt}"
                          </blockquote>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span className="group-hover:text-slate-600 dark:group-hover:text-slate-300">
                              {ev.section_name} (Page {ev.page_number || 'N/A'})
                            </span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {(ev.confidence_score * 100).toFixed(0)}% Confidence · Inspect ↗
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-slate-400 italic">No excerpt rows stored.</div>
                  )}
                </div>

                {/* Counterevidence or Caveats */}
                {selectedGap.counterevidence && selectedGap.counterevidence.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                    <span className="font-bold block text-[11px] uppercase tracking-wider mb-1 text-amber-800 dark:text-amber-300">
                      Identified Counterevidence / Caveats:
                    </span>
                    <ul className="space-y-1">
                      {selectedGap.counterevidence.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Broader Literature Verification (OpenAlex API Connector) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-emerald-500" />
                      <span>Broader Literature Verification</span>
                    </span>
                    <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${
                      selectedGap.literature_novelty_status === 'Verified novel' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      selectedGap.literature_novelty_status === 'Prior art detected' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {selectedGap.literature_novelty_status || 'Novelty not verified'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Queries OpenAlex scholarly index to verify whether this gap has been addressed in broader external publications beyond your local library.
                  </p>

                  <button
                    onClick={() => handleCheckBroaderLiterature(selectedGap)}
                    disabled={verifyingLit}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {verifyingLit ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        <span>Querying OpenAlex Index...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="h-3.5 w-3.5" />
                        <span>Verify Novelty via OpenAlex API</span>
                      </>
                    )}
                  </button>

                  {/* Scholarly Works Found */}
                  {selectedGap.literature_references && selectedGap.literature_references.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        Related Prior Art Indexed:
                      </span>
                      {selectedGap.literature_references.slice(0, 3).map((work: any, i) => (
                        <div key={i} className="text-[11px] p-2 bg-white dark:bg-slate-800 rounded border border-slate-200/60 dark:border-slate-700/60">
                          <a
                            href={work.url || `https://doi.org/${work.doi}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-indigo-600 hover:underline flex items-center gap-1 line-clamp-1"
                          >
                            <span>{work.title}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                          <span className="text-[10px] text-slate-400">
                            {work.publicationYear || 'Year n/a'} · {work.citedByCount || 0} citations · OpenAlex
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action CTAs */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <button
                    onClick={() => handleCreateRecommendation(selectedGap)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                  >
                    <Lightbulb className="h-4 w-4" />
                    <span>Formulate Research Recommendations</span>
                  </button>

                  <button
                    onClick={() => navigate(`/proposals?gapId=${selectedGap.id}`)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <FileEdit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Draft Full Research Proposal in Workspace ↗</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400 border border-dashed rounded-xl dark:border-slate-800">
                Select a research gap on the left to inspect evidence, heuristic score, and novelty checks.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Primary Source Evidence Modal */}
      <EvidenceInspectorModal
        isOpen={Boolean(inspectingEvidence)}
        onClose={() => setInspectingEvidence(null)}
        evidence={inspectingEvidence}
      />
    </div>
  );
};
