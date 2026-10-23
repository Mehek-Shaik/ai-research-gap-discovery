import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../api/client.ts';

interface QueuedFile {
  file: File;
  id: string;
  progress: number;
  status: 'queued' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [uploadSuccessCount, setUploadSuccessCount] = useState<number | null>(null);

  const MAX_SIZE_MB = 20;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    setGeneralError(null);
    setUploadSuccessCount(null);

    const validNewFiles: QueuedFile[] = [];

    Array.from(files).forEach((file) => {
      // Validate PDF format
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setGeneralError(`"${file.name}" was skipped: Only PDF files (.pdf) are supported.`);
        return;
      }

      // Validate size
      if (file.size > MAX_SIZE_BYTES) {
        setGeneralError(`"${file.name}" exceeds the ${MAX_SIZE_MB}MB maximum limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
        return;
      }

      validNewFiles.push({
        file,
        id: `${file.name}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        progress: 0,
        status: 'queued'
      });
    });

    setQueuedFiles((prev) => [...prev, ...validNewFiles]);
  };

  const removeFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleUploadAll = async () => {
    if (queuedFiles.length === 0) return;

    setUploading(true);
    setGeneralError(null);

    try {
      const formData = new FormData();
      queuedFiles.forEach((q) => {
        formData.append('files', q.file);
      });
      formData.append('autoAnalyze', autoAnalyze ? 'true' : 'false');

      // Update queued files status to uploading
      setQueuedFiles((prev) => prev.map((f) => ({ ...f, status: 'uploading', progress: 50 })));

      const response = await api.uploadPapers(formData);

      const successfulNames = new Set((response.papers || []).map((p) => p.originalFilename));

      setQueuedFiles((prev) =>
        prev.map((f) => {
          if (successfulNames.has(f.file.name)) {
            return {
              ...f,
              status: 'completed',
              progress: 100,
              errorMessage: undefined
            };
          }
          const matchedError = (response.errors || []).find((err) => err.includes(f.file.name));
          return {
            ...f,
            status: 'error',
            progress: 0,
            errorMessage: matchedError || 'Failed to register paper'
          };
        })
      );

      if (response.uploadedCount > 0) {
        setUploadSuccessCount(response.uploadedCount);
      }

      if (response.errors && response.errors.length > 0) {
        setGeneralError(response.errors.join(' | '));
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Upload failed');
      setQueuedFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: 'error',
          errorMessage: err.message
        }))
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Upload Research Papers
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload peer-reviewed publications in PDF format. Files are securely validated, indexed in SQLite, and parsed through Gemini AI and the NLP pipeline.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-4">
          <UploadCloud className="h-7 w-7" />
        </div>

        <p className="text-base font-semibold text-slate-900 dark:text-white">
          Click to browse or drag and drop PDF files here
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Strict PDF signature & header validation · Maximum {MAX_SIZE_MB}MB per paper · Batch upload supported
        </p>
      </div>

      {/* Options Bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoAnalyze}
            onChange={(e) => setAutoAnalyze(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              Automatically trigger AI analysis on upload
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Extract abstract, methodology, algorithms, datasets, limitations, and future work immediately
            </span>
          </div>
        </label>
      </div>

      {/* Error Banner */}
      {generalError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">{generalError}</div>
        </div>
      )}

      {/* Success Notification */}
      {uploadSuccessCount !== null && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Successfully uploaded and registered {uploadSuccessCount} research paper(s).</span>
          </div>
          <button
            onClick={() => navigate('/library')}
            className="font-medium text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-300"
          >
            Go to Library
          </button>
        </div>
      )}

      {/* Queue List */}
      {queuedFiles.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Selected Papers Queue ({queuedFiles.length})
            </h3>
            <button
              onClick={() => setQueuedFiles([])}
              className="text-xs text-slate-500 hover:text-red-600"
            >
              Clear Queue
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {queuedFiles.map((qf) => (
              <div key={qf.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {qf.file.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {(qf.file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {qf.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <FileCheck className="h-4 w-4" />
                      Uploaded
                    </span>
                  ) : qf.status === 'error' ? (
                    <div className="flex flex-col items-end">
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Failed
                      </span>
                      {qf.errorMessage && (
                        <span className="text-[10px] text-red-500 max-w-[220px] truncate" title={qf.errorMessage}>
                          {qf.errorMessage}
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => removeFile(qf.id)}
                      className="text-slate-400 hover:text-slate-600"
                      aria-label="Remove from queue"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              onClick={() => navigate('/library')}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadAll}
              data-testid="register-papers-button"
              disabled={uploading || queuedFiles.every((f) => f.status === 'completed')}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Processing Upload...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Register Papers</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
