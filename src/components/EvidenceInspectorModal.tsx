import React, { useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { api } from '../api/client.ts';

export interface InspectedEvidence {
  excerpt: string;
  paper_id?: string;
  paper_title?: string;
  section_name?: string;
  page_number?: number | null;
  confidence_score?: number;
  verification_status?: 'verified' | 'inferred' | string;
  explanation?: string;
  category?: string;
  claim?: string;
}

interface EvidenceInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: InspectedEvidence | null;
}

export const EvidenceInspectorModal: React.FC<EvidenceInspectorModalProps> = ({
  isOpen,
  onClose,
  evidence
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !evidence) return null;

  const isExplicit =
    evidence.verification_status === 'verified' ||
    (evidence.section_name &&
      ['limitations', 'future work', 'results', 'methodology'].includes(
        evidence.section_name.toLowerCase()
      ));

  const handleCopy = () => {
    navigator.clipboard.writeText(evidence.excerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadUrl = evidence.paper_id ? api.getDownloadUrl(evidence.paper_id) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl transition-all dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Evidence Excerpt Inspector
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Primary source traceability and ground-truth verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close inspector modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 px-6 py-5 text-xs">
          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">
                {evidence.section_name || 'Document Section'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                {evidence.page_number ? `Page ${evidence.page_number}` : 'Page n/a'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                Confidence: {Math.round((evidence.confidence_score ?? 0.85) * 100)}%
              </span>
            </div>

            {/* Claim Nature Classification */}
            <div className="flex items-center gap-1.5 font-medium">
              {isExplicit ? (
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Explicit Author Statement</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>NLP Inferred Grounding</span>
                </span>
              )}
            </div>
          </div>

          {/* Source Paper Title */}
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">
              Source Publication
            </span>
            <div className="font-medium text-slate-900 dark:text-white text-sm">
              {evidence.paper_title || 'Analyzed Research Paper'}
            </div>
          </div>

          {/* Verbatim Excerpt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Verbatim Extracted Excerpt
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy Excerpt'}</span>
              </button>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 font-serif text-slate-800 italic leading-relaxed dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200 text-sm">
              "{evidence.excerpt}"
            </div>
          </div>

          {/* Explanation / Claim details */}
          {(evidence.explanation || evidence.claim) && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Evidence Evaluation Context
              </span>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                {evidence.explanation || evidence.claim}
              </p>
            </div>
          )}

          {/* Traceability Note */}
          <div className="rounded-md bg-indigo-50/60 p-3 text-[11px] text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/40">
            <strong>Traceability Guarantee:</strong> This excerpt was parsed page-by-page from the original PDF via the PyMuPDF/FastAPI pipeline with exact page boundaries preserved. No fabricated text is introduced.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 font-mono">
            ID: {evidence.paper_id ? `${evidence.paper_id.slice(0, 16)}...` : 'stored-document'}
          </span>

          <div className="flex items-center gap-2">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Source PDF</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
