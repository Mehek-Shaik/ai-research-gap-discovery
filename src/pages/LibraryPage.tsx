import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  FileSearch,
  FileText,
  Calendar,
  Users,
  ChevronRight,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client.ts';
import { Paper, PaperMetadata } from '../types/index.ts';

export const LibraryPage: React.FC = () => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [paperMetadata, setPaperMetadata] = useState<PaperMetadata | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPapers();
      setPapers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch library papers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleInspect = async (paper: Paper) => {
    setSelectedPaper(paper);
    setLoadingModal(true);
    try {
      const data = await api.getPaper(paper.id);
      setPaperMetadata(data.metadata);
    } catch (err: any) {
      console.error('Failed to load paper details:', err);
    } finally {
      setLoadingModal(false);
    }
  };

  const handleDelete = async (paperId: string) => {
    if (!window.confirm('Are you sure you want to delete this research paper? This cannot be undone.')) {
      return;
    }
    setActionInProgress(paperId);
    try {
      await api.deletePaper(paperId);
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
      if (selectedPaper?.id === paperId) {
        setSelectedPaper(null);
        setPaperMetadata(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete paper');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRetry = async (paperId: string) => {
    setActionInProgress(paperId);
    try {
      await api.retryPaper(paperId);
      await fetchPapers();
    } catch (err: any) {
      alert(err.message || 'Failed to retry paper analysis');
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredPapers = papers.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.research_domain && p.research_domain.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Research Library
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Repository of indexed publications with parsed text, methodology extraction, and evidence links.
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700"
        >
          <span>Upload More Papers</span>
        </Link>
      </div>

      {/* Search and Segmented Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, domain, or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 transition-colors hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:focus:text-white dark:focus:ring-2 dark:focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Interactive Segmented Tabs for Filtering */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(['all', 'analyzed', 'pending', 'error'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Papers Grid / Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 animate-pulse" />
          ))}
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No matching papers found
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {papers.length === 0 ? 'Upload your first research paper to begin analysis.' : 'Try adjusting your search query or status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPapers.map((paper) => (
            <div
              key={paper.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                {/* Metadata Line */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mb-2 font-mono">
                  <span>{paper.publication_year || 'Year n/a'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{paper.page_count ? `${paper.page_count} pages` : `${(paper.file_size / 1024).toFixed(0)} KB`}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`capitalize font-semibold ${
                    paper.status === 'analyzed' ? 'text-emerald-600 dark:text-emerald-400' :
                    paper.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {paper.status}
                  </span>
                </div>

                <h3
                  onClick={() => handleInspect(paper)}
                  className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                >
                  {paper.title}
                </h3>

                {paper.research_domain && (
                  <p className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    {paper.research_domain}
                  </p>
                )}

                {paper.authors && paper.authors.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {paper.authors.join(', ')}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <a
                    href={api.getDownloadUrl(paper.id)}
                    download
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Download original PDF"
                  >
                    <Download className="h-4 w-4" />
                  </a>

                  {paper.status === 'error' && (
                    <button
                      onClick={() => handleRetry(paper.id)}
                      disabled={actionInProgress === paper.id}
                      className="p-1.5 text-amber-500 hover:text-amber-700"
                      title="Retry Analysis"
                    >
                      <RefreshCw className={`h-4 w-4 ${actionInProgress === paper.id ? 'animate-spin' : ''}`} />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(paper.id)}
                    disabled={actionInProgress === paper.id}
                    className="p-1.5 text-slate-400 hover:text-red-600"
                    title="Delete Paper"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleInspect(paper)}
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  <span>Inspect Details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paper Inspection Modal / Drawer */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Paper Inspection & Metadata
                </span>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {selectedPaper.title}
                </h2>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span>File: {selectedPaper.original_filename}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{(selectedPaper.file_size / 1024).toFixed(0)} KB</span>
                </div>
              </div>
              <button
                onClick={() => { setSelectedPaper(null); setPaperMetadata(null); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingModal ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading extracted sections and limitations...
              </div>
            ) : paperMetadata ? (
              <div className="mt-6 space-y-6 text-xs text-slate-600 dark:text-slate-300">
                {/* Abstract */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-1">
                    Abstract
                  </h4>
                  <p className="leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    {paperMetadata.abstract}
                  </p>
                </div>

                {/* Problem Statement & Methodology */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h4 className="font-semibold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider mb-1">
                      Problem Statement
                    </h4>
                    <p className="leading-relaxed">{paperMetadata.problem_statement}</p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h4 className="font-semibold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider mb-1">
                      Methodology
                    </h4>
                    <p className="leading-relaxed">{paperMetadata.methodology}</p>
                  </div>
                </div>

                {/* Algorithms & Datasets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider mb-2">
                      Algorithms / Models
                    </h4>
                    <div className="space-y-1">
                      {paperMetadata.algorithms?.length > 0 ? (
                        paperMetadata.algorithms.map((alg, i) => (
                          <div key={i} className="text-slate-700 dark:text-slate-300">· {alg}</div>
                        ))
                      ) : (
                        <span className="text-slate-400">Not found in the document</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider mb-2">
                      Evaluated Datasets
                    </h4>
                    <div className="space-y-1">
                      {paperMetadata.datasets?.length > 0 ? (
                        paperMetadata.datasets.map((ds, i) => (
                          <div key={i} className="text-slate-700 dark:text-slate-300">· {ds}</div>
                        ))
                      ) : (
                        <span className="text-slate-400">Not found in the document</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stated Limitations (Crucial for research gaps) */}
                <div>
                  <h4 className="font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Identified Constraints & Limitations</span>
                  </h4>
                  <ul className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                    {paperMetadata.limitations?.length > 0 ? (
                      paperMetadata.limitations.map((lim, i) => (
                        <li key={i} className="leading-relaxed">
                          — {lim}
                        </li>
                      ))
                    ) : (
                      <li>Not found in the document.</li>
                    )}
                  </ul>
                </div>

                {/* Future Work */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2">
                    Author Stated Future Directions
                  </h4>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                    {paperMetadata.future_work?.length > 0 ? (
                      paperMetadata.future_work.map((fw, i) => (
                        <li key={i}>— {fw}</li>
                      ))
                    ) : (
                      <li className="text-slate-400">Not found in the document.</li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                This paper has not been analyzed yet. Run deep analysis to extract structured metadata.
                <div className="mt-4">
                  <Link
                    to={`/analyze?paperId=${selectedPaper.id}`}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Run Deep Analysis
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <a
                href={api.getDownloadUrl(selectedPaper.id)}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </a>
              <button
                onClick={() => { setSelectedPaper(null); setPaperMetadata(null); }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
