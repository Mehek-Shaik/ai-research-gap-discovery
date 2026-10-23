import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileSearch,
  Sparkles,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  BookOpen,
  Code,
  ShieldAlert,
  HelpCircle,
  Check
} from 'lucide-react';
import { api } from '../api/client.ts';
import { Paper, PaperMetadata, AnalysisJobStatus } from '../types/index.ts';
import { EvidenceInspectorModal, InspectedEvidence } from '../components/EvidenceInspectorModal.tsx';

export const AnalyzePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('paperId');

  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [metadata, setMetadata] = useState<PaperMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [jobStatus, setJobStatus] = useState<AnalysisJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'methods' | 'limitations' | 'evidence' | 'references' | 'raw'>('overview');
  const [inspectingEvidence, setInspectingEvidence] = useState<InspectedEvidence | null>(null);

  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const data = await api.getPapers();
        setPapers(data);
        if (data.length > 0) {
          const targetId = preselectedId && data.some((p) => p.id === preselectedId) ? preselectedId : data[0].id;
          setSelectedPaperId(targetId);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load papers');
      }
    };
    fetchPapers();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [preselectedId]);

  const loadPaperDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaper(id);
      setMetadata(res.metadata);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch paper analysis details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedPaperId) return;
    loadPaperDetails(selectedPaperId);
  }, [selectedPaperId]);

  const startPolling = (jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await api.getJobStatus(jobId);
        setJobStatus(status);

        if (status.status === 'completed') {
          clearInterval(pollIntervalRef.current);
          setAnalyzing(false);
          await loadPaperDetails(selectedPaperId);
          setPapers((prev) => prev.map((p) => (p.id === selectedPaperId ? { ...p, status: 'analyzed' } : p)));
        } else if (status.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          setAnalyzing(false);
          setError(status.error || 'Paper extraction failed');
          setPapers((prev) => prev.map((p) => (p.id === selectedPaperId ? { ...p, status: 'error' } : p)));
        }
      } catch {
        // Retry next tick
      }
    }, 1500);
  };

  const handleRunAnalysis = async () => {
    if (!selectedPaperId) return;
    setAnalyzing(true);
    setError(null);
    setJobStatus({
      jobId: '',
      jobType: 'paper_extraction',
      status: 'processing',
      progress: 10,
      currentStep: 'Initializing extraction request'
    });

    try {
      const res = await api.startPaperAnalysis(selectedPaperId);
      startPolling(res.jobId);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate paper analysis');
      setAnalyzing(false);
    }
  };

  const currentPaper = papers.find((p) => p.id === selectedPaperId);
  const structured = metadata?.structured_analysis;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Deep Paper Analysis
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Structured decomposition of scientific objectives, algorithmic workflows, datasets, limitations, and cited evidence.
          </p>
        </div>

        {/* Paper Selector Dropdown & Actions */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPaperId}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            disabled={analyzing}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white max-w-xs truncate"
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {analyzing ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Analyzing ({jobStatus?.progress || 10}%)</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Run Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Progress Bar when Analyzing */}
      {analyzing && jobStatus && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <div className="flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-300 font-medium mb-1.5">
            <span>{jobStatus.currentStep}</span>
            <span className="font-mono tabular-nums">{jobStatus.progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-indigo-200/60 dark:bg-indigo-900/60 overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300 rounded-full"
              style={{ width: `${jobStatus.progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Scanned PDF / OCR Required Warning */}
      {(metadata?.ocr_required || metadata?.is_scanned) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Scanned / Image-Only Document Detected</span>
            <span>
              This PDF contains visual pages with negligible selectable text layers. Text extraction produced insufficient character data; Optical Character Recognition (OCR) is required to process non-selectable scans.
            </span>
          </div>
        </div>
      )}

      {currentPaper && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Status: <strong className="capitalize text-slate-700 dark:text-slate-300">{currentPaper.status}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Size: {(currentPaper.file_size / 1024).toFixed(0)} KB</span>
              <span aria-hidden="true">·</span>
              <span>File: {currentPaper.original_filename}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {currentPaper.title}
            </h2>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 flex border-b border-slate-200 dark:border-slate-800 text-xs font-medium overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview & Objectives' },
              { id: 'methods', label: 'Methods, Algorithms & Datasets' },
              { id: 'limitations', label: 'Limitations & Validity' },
              { id: 'evidence', label: 'Evidence Excerpts & Traceability' },
              { id: 'references', label: 'References & Citations' },
              { id: 'raw', label: 'Raw Extracted Stream' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Deconstructing paper sections and extracting constraints...
              </div>
            ) : !metadata ? (
              <div className="py-12 text-center">
                <FileSearch className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Paper Not Yet Analyzed
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Run extraction to deconstruct text, classify problem statements, extract datasets, and isolate stated constraints.
                </p>
                <button
                  onClick={handleRunAnalysis}
                  className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Start Deep Analysis
                </button>
              </div>
            ) : (
              <div className="space-y-6 text-xs text-slate-700 dark:text-slate-300">
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-1.5">
                        Structured Summary & Abstract
                      </h4>
                      <p className="leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        {structured?.structured_summary || metadata.abstract}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                          Core Research Problem
                        </h4>
                        <p className="leading-relaxed">{structured?.research_problem || metadata.problem_statement}</p>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                          Key Objectives
                        </h4>
                        <ul className="space-y-1">
                          {(structured?.objectives || []).length > 0 ? (
                            structured?.objectives.map((obj, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-indigo-500">•</span>
                                <span>{obj}</span>
                              </li>
                            ))
                          ) : (
                            <li>{metadata.results_contributions}</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {structured?.contributions && structured.contributions.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                          Claimed Contributions
                        </h4>
                        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                          {structured.contributions.map((c, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: METHODS & DATASETS */}
                {activeTab === 'methods' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-1.5">
                        Methodology & Experimental Framework
                      </h4>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 leading-relaxed">
                        {Array.isArray(structured?.methodology) && structured.methodology.length > 0 ? (
                          structured.methodology.map((m, i) => <p key={i}>{m}</p>)
                        ) : (
                          <p>{metadata.methodology}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                          Algorithms & Architectures
                        </h4>
                        <div className="space-y-2">
                          {(structured?.algorithms_and_models || metadata.algorithms || []).map((alg, i) => (
                            <div key={i} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                              {alg}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                          Evaluated Datasets
                        </h4>
                        <div className="space-y-2">
                          {(structured?.datasets || metadata.datasets || []).map((ds, i) => (
                            <div key={i} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                              {ds}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {((structured?.evaluation_metrics || []).length > 0) && (
                      <div>
                        <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                          Evaluation Metrics & Findings
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {structured?.evaluation_metrics.map((met, i) => (
                            <span key={i} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 font-mono">
                              {met}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: LIMITATIONS */}
                {activeTab === 'limitations' && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <h4 className="font-semibold uppercase tracking-wider text-[11px]">
                          Author-Stated Limitations & Threats to Validity
                        </h4>
                      </div>
                      <p className="text-amber-900 dark:text-amber-200 text-xs mb-3">
                        Extracted directly from the paper's limitations or discussion sections. Ground-truth inputs for gap discovery:
                      </p>
                      <ul className="space-y-2">
                        {(structured?.limitations || metadata.limitations || []).map((lim, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-800 dark:text-slate-200">
                            <span className="text-amber-500 font-bold">•</span>
                            <span className="leading-relaxed">{lim}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                        Author Stated Future Directions
                      </h4>
                      <div className="space-y-2">
                        {(structured?.future_work || metadata.future_work || []).map((fw, i) => (
                          <div key={i} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                            {fw}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: EVIDENCE EXCERPTS & TRACEABILITY */}
                {activeTab === 'evidence' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                        Ground-Truth Traceable Evidence Records ({(structured?.evidence || []).length})
                      </h4>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                        Click any excerpt to inspect primary PDF & page
                      </span>
                    </div>
                    <div className="space-y-3">
                      {(structured?.evidence || []).map((ev, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setInspectingEvidence({
                              excerpt: ev.supporting_excerpt,
                              paper_id: selectedPaperId,
                              paper_title: papers.find((p) => p.id === selectedPaperId)?.title || 'Analyzed Research Paper',
                              section_name: ev.category,
                              page_number: ev.page_number,
                              confidence_score: ev.confidence,
                              verification_status: ev.verification_status,
                              claim: ev.claim
                            });
                          }}
                          className="group cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-2 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              Claim: {ev.claim}
                            </span>
                            <span className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              Page {ev.page_number || 'N/A'} · {(ev.confidence * 100).toFixed(0)}% Confidence · Inspect ↗
                            </span>
                          </div>
                          <blockquote className="font-serif italic text-slate-800 dark:text-slate-200 leading-relaxed pl-3 border-l-2 border-indigo-400 group-hover:text-indigo-900 dark:group-hover:text-indigo-200">
                            "{ev.supporting_excerpt}"
                          </blockquote>
                          <div className="text-[11px] text-slate-400">
                            Category: {ev.category} · Status: <strong className="capitalize">{ev.verification_status}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 5: REFERENCES */}
                {activeTab === 'references' && (
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      Extracted References & Prior Art ({metadata.references_list?.length || 0})
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {metadata.references_list?.map((ref, i) => (
                        <div key={i} className="py-2.5 flex items-start gap-2.5">
                          <span className="font-mono text-slate-400 text-[11px]">{i + 1}.</span>
                          <span className="text-slate-700 dark:text-slate-300">{ref}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 6: RAW STREAM */}
                {activeTab === 'raw' && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                      Raw Text Stream (Page-Bounded)
                    </h4>
                    <pre className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed dark:border-slate-800">
                      {metadata.raw_extracted_text || 'No raw stream preview stored.'}
                    </pre>
                  </div>
                )}
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
