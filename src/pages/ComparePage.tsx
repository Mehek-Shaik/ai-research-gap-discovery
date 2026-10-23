import React, { useEffect, useState } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Database
} from 'lucide-react';
import { api } from '../api/client.ts';
import { Paper, ComparisonResult } from '../types/index.ts';

export const ComparePage: React.FC = () => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const data = await api.getPapers();
        setPapers(data);
        // By default select first 2 or 3 analyzed papers
        const analyzed = data.filter((p) => p.status === 'analyzed');
        if (analyzed.length >= 2) {
          setSelectedIds(analyzed.slice(0, 3).map((p) => p.id));
        } else if (data.length >= 2) {
          setSelectedIds(data.slice(0, 2).map((p) => p.id));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load papers');
      }
    };
    fetchPapers();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleRunComparison = async () => {
    if (selectedIds.length < 2) {
      setError('Please select at least 2 papers for comparison.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const comp = await api.comparePapers(selectedIds);
      setResult(comp);
    } catch (err: any) {
      setError(err.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  // Run initial comparison when selection is ready
  useEffect(() => {
    if (selectedIds.length >= 2 && !result && !loading) {
      handleRunComparison();
    }
  }, [selectedIds.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Cross-Paper Comparison Matrix
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Semantic similarity, algorithmic alignment, dataset coverage, and divergent limitations across research papers.
          </p>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={loading || selectedIds.length < 2}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Computing Matrix...</span>
            </>
          ) : (
            <>
              <GitCompare className="h-4 w-4" />
              <span>Compute Comparison</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Paper Multi-Select Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-900 dark:text-white">
            Select Papers to Compare ({selectedIds.length} of {papers.length} selected)
          </span>
          <span className="text-slate-400">At least 2 required</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {papers.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => handleToggleSelect(p.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className="max-w-[200px] truncate">{p.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="h-64 rounded-xl border border-slate-200 bg-white p-6 animate-pulse dark:border-slate-800 dark:bg-slate-900 text-center py-24 text-xs text-slate-400">
          Computing semantic similarity matrix and aligning cross-paper methodologies...
        </div>
      ) : result ? (
        <div className="space-y-6">
          {/* Engine & Synthesis Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Cpu className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold uppercase tracking-wider text-[10px]">Processing Engine</span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                {result.engine === 'fastapi' ? 'FastAPI Microservice (PyMuPDF / scikit-learn)' : 'Node.js Native Adapter (TF-IDF Vectorizer)'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {result.engine === 'fastapi' ? 'External Python REST service active' : 'Pure Node.js deterministic fallback engine'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Layers className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold uppercase tracking-wider text-[10px]">Common Themes</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {result.commonKeywords.map((kw, i) => (
                  <span key={i} className="text-xs text-slate-700 dark:text-slate-300">
                    {kw}{i < result.commonKeywords.length - 1 ? ' ·' : ''}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="font-semibold uppercase tracking-wider text-[10px]">Divergence Points</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                {result.divergencePoints.join(' ')}
              </p>
            </div>
          </div>

          {/* Cosine Similarity Heatmap Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Pairwise Semantic Similarity Heatmap
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                    <th className="p-3 text-left font-medium">Research Paper</th>
                    {result.titles.map((t, idx) => (
                      <th key={idx} className="p-3 font-medium max-w-[140px] truncate" title={t}>
                        P{idx + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {result.similarityMatrix.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-left font-sans font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate" title={result.titles[rIdx]}>
                        P{rIdx + 1}: {result.titles[rIdx]}
                      </td>
                      {row.map((score, cIdx) => {
                        const isSelf = rIdx === cIdx;
                        const bgStyle = isSelf
                          ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                          : score > 0.6
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : score > 0.3
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                          : 'text-slate-500';
                        return (
                          <td key={cIdx} className={`p-3 tabular-nums ${bgStyle}`}>
                            {(score * 100).toFixed(1)}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-Side Structured Comparison Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Structural Dimension Alignment
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <th className="p-3.5 font-semibold w-1/4">Paper Title</th>
                    <th className="p-3.5 font-semibold w-1/4">Algorithms / Models</th>
                    <th className="p-3.5 font-semibold w-1/4">Datasets Evaluated</th>
                    <th className="p-3.5 font-semibold w-1/4">Key Limitations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {result.comparisonTable.map((p) => (
                    <tr key={p.id} className="align-top hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3.5 font-medium text-slate-900 dark:text-white">
                        {p.title}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {p.algorithms?.length > 0 ? (
                          <ul className="space-y-1">
                            {p.algorithms.map((a, i) => <li key={i}>• {a}</li>)}
                          </ul>
                        ) : '—'}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {p.datasets?.length > 0 ? (
                          <ul className="space-y-1">
                            {p.datasets.map((d, i) => <li key={i}>• {d}</li>)}
                          </ul>
                        ) : '—'}
                      </td>
                      <td className="p-3.5 text-amber-800 dark:text-amber-300">
                        {p.limitations?.length > 0 ? (
                          <ul className="space-y-1">
                            {p.limitations.map((l, i) => <li key={i}>• {l}</li>)}
                          </ul>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
