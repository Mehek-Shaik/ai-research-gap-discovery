import React, { useEffect, useState } from 'react';
import {
  Settings,
  Database,
  Cpu,
  Server,
  FolderGit2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Code2,
  BookOpen,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api/client.ts';
import { SystemStatus } from '../types/index.ts';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSystemStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleResetDemo = async () => {
    if (!window.confirm('Reset database to the initial synthetic demonstration dataset? This will clear all newly uploaded papers.')) {
      return;
    }
    setResetting(true);
    setResetMessage(null);
    try {
      await api.resetDemo();
      setResetMessage('Synthetic demonstration benchmark restored successfully.');
      await fetchStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to reset demo dataset');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Diagnostics & Viva Guide
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Architecture inspection, database telemetry, microservice health, and defense notes for final-year engineering evaluation.
        </p>
      </div>

      {resetMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Diagnostics Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-xl border border-slate-200 bg-white p-5 animate-pulse dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      ) : status ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Database Health */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Database className="h-4 w-4 text-indigo-500" />
                <span>SQLite Database Health</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>ACID Active</span>
              </span>
            </div>
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Engine:</span>
                <span>{status.database.engine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Path:</span>
                <span className="truncate max-w-[200px]">{status.database.filePath}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">File Size:</span>
                <span className="tabular-nums">{(status.database.fileSizeBytes / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-[11px]">
                <span className="text-slate-400">Indexed Records:</span>
                <span className="tabular-nums">
                  {status.database.records.papers} papers · {status.database.records.gaps} gaps · {status.database.records.recommendations} recs
                </span>
              </div>
            </div>
          </div>

          {/* Gemini AI Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Cpu className="h-4 w-4 text-purple-500" />
                <span>Google Gemini AI Integration</span>
              </div>
              <span className={`flex items-center gap-1 text-[11px] font-medium font-mono ${
                status.geminiAi.keyConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {status.geminiAi.keyConfigured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                <span>{status.geminiAi.keyConfigured ? 'Ready' : 'Fallback Active'}</span>
              </span>
            </div>
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">SDK:</span>
                <span>{status.geminiAi.sdk}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Model:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{status.geminiAi.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">API Key Status:</span>
                <span>{status.geminiAi.keyConfigured ? 'Injected via Environment' : 'Rule-Based Fallback'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-[11px]">
                <span className="text-slate-400">JSON Schema Enforced:</span>
                <span className="text-emerald-600">Strict Type.OBJECT Validation</span>
              </div>
            </div>
          </div>

          {/* Python FastAPI NLP Service */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Server className="h-4 w-4 text-emerald-500" />
                <span>Python NLP Service Adapter</span>
              </div>
              <span className={`flex items-center gap-1 text-[11px] font-medium font-mono ${
                status.nlpMicroservice.fastapiOnline ? 'text-emerald-600' : 'text-slate-500'
              }`}>
                <span>{status.nlpMicroservice.activeEngine}</span>
              </span>
            </div>
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Configured URL:</span>
                <span>{status.nlpMicroservice.fastapiUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dual-Mode Status:</span>
                <span>{status.nlpMicroservice.fastapiOnline ? 'Online (PyMuPDF / spaCy)' : 'Standby / Native Adapter Active'}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800">
                {status.nlpMicroservice.details}
              </p>
            </div>
          </div>

          {/* Secure Storage */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <FolderGit2 className="h-4 w-4 text-amber-500" />
                <span>Isolated PDF Storage</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Outside Web Root</span>
            </div>
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Directory:</span>
                <span>{status.storage.directory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stored Files:</span>
                <span className="tabular-nums">{status.storage.fileCount} PDF document(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Upload Limit:</span>
                <span className="tabular-nums">{status.storage.maxUploadMb} MB per file</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-[11px]">
                <span className="text-slate-400">Integrity:</span>
                <span className="text-emerald-600">SHA-256 Signature Checked</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Viva Presentation & Architecture Notes */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Final-Year Engineering Project Defense & Viva Guide
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              1. Project Objective & Innovation
            </h3>
            <p>
              Traditional literature reviews rely on manual annotation, leading to overlooked constraints or duplicated research.
              This platform introduces an automated pipeline that extracts empirical constraints, compares multi-paper methodologies,
              and isolates candidate research gaps with direct quote provenance.
            </p>

            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pt-2">
              2. Evidenced Research Gap Pipeline
            </h3>
            <p>
              Rather than generic AI hallucinations, candidate gaps are grounded in author-admitted limitations, threats to validity,
              and evaluation boundaries (e.g. simulated channels vs real hardware, resting vs ambulatory testbeds).
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              3. Dual-Engine Microservice Architecture
            </h3>
            <p>
              The architecture decouples the Express orchestration layer from NLP intensive operations.
              When the Python FastAPI service is available, it handles PyMuPDF vector extraction, spaCy linguistic parsing,
              and sentence-transformers embeddings. In resource-constrained environments, the native Node.js adapter
              provides deterministic fallback without downtime.
            </p>

            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pt-2">
              4. Security & Data Integrity
            </h3>
            <p>
              Uploaded PDFs undergo magic byte verification (<code className="font-mono">%PDF-</code>) and SHA-256 deduplication.
              Files are stored outside the public document root with non-guessable identifiers, and SQLite queries are strictly parameterized.
            </p>
          </div>
        </div>

        {/* Viva Q&A Accordion/List */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Key Viva Questions & Model Answers
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="font-semibold text-slate-900 dark:text-white mb-1">
                Q: How does the system prevent hallucinating fake research gaps?
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                A: Gemini is prompted with strict JSON schema constraints and required evidence fields. Every candidate gap must cite an excerpt quote, page number, and section name from the paper. The UI labels gaps as "Candidate" until the researcher verifies or refutes them.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="font-semibold text-slate-900 dark:text-white mb-1">
                Q: Why combine SQLite with an external Python microservice?
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                A: SQLite provides zero-configuration, ACID-compliant persistence ideal for desktop and edge research tools. The Python microservice encapsulates scientific packages (PyMuPDF, spaCy, sentence-transformers) cleanly without bloating the Node runtime.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Dataset Reset Control */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Reset Synthetic Demonstration Dataset
            </h4>
            <p className="text-[11px] text-slate-500">
              Restores the initial clean set of synthetic benchmark research papers for viva presentation.
            </p>
          </div>

          <button
            onClick={handleResetDemo}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
