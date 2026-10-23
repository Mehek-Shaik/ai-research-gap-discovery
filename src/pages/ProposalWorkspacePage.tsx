import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FileEdit,
  Save,
  Download,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Clock,
  Compass,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Trash2,
  Plus
} from 'lucide-react';
import { api } from '../api/client.ts';
import { ResearchProposal, ResearchGap } from '../types/index.ts';

export const ProposalWorkspacePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialGapId = searchParams.get('gapId');

  const [proposals, setProposals] = useState<ResearchProposal[]>([]);
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedGapId, setSelectedGapId] = useState<string>(initialGapId || '');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Proposal Form State
  const [formData, setFormData] = useState<Partial<ResearchProposal>>({
    title: '',
    problem_statement: '',
    motivation: '',
    objectives: [],
    research_questions: [],
    hypothesis: '',
    proposed_methodology: '',
    candidate_datasets: [],
    baselines_and_metrics: [],
    experimental_plan: [],
    expected_contribution: '',
    feasibility_and_resources: '',
    ethical_considerations: '',
    limitations_and_future_work: '',
    supporting_literature: [],
    status: 'draft'
  });

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [fetchedProposals, fetchedGaps] = await Promise.all([
        api.getProposals(),
        api.getGaps()
      ]);

      setProposals(fetchedProposals);
      setGaps(fetchedGaps);

      if (initialGapId && fetchedGaps.some(g => g.id === initialGapId || g.gap_id === initialGapId)) {
        setSelectedGapId(initialGapId);
      }

      if (fetchedProposals.length > 0) {
        setSelectedProposalId(fetchedProposals[0].id);
        setFormData(fetchedProposals[0]);
      } else if (fetchedGaps.length > 0 && !initialGapId) {
        setSelectedGapId(fetchedGaps[0].id);
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to initialize workspace' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectProposal = (id: string) => {
    const prop = proposals.find(p => p.id === id);
    if (prop) {
      setSelectedProposalId(id);
      setFormData(prop);
      if (prop.gap_id) setSelectedGapId(prop.gap_id);
    }
  };

  const handleGenerateFromGap = async () => {
    if (!selectedGapId) {
      setFeedbackMessage({ type: 'error', text: 'Please choose an evidenced research gap to synthesize.' });
      return;
    }

    setGenerating(true);
    setFeedbackMessage(null);
    try {
      const res = await api.generateProposalFromGap(selectedGapId);
      setProposals(prev => [res.proposal, ...prev]);
      setSelectedProposalId(res.proposal.id);
      setFormData(res.proposal);
      setFeedbackMessage({ type: 'success', text: 'Research proposal synthesized successfully from verified gap!' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to synthesize proposal' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveOrUpdate = async () => {
    setSaving(true);
    setFeedbackMessage(null);
    try {
      if (selectedProposalId && proposals.some(p => p.id === selectedProposalId)) {
        await api.updateProposal(selectedProposalId, formData);
        setProposals(prev => prev.map(p => p.id === selectedProposalId ? { ...p, ...formData, updated_at: new Date().toISOString() } as ResearchProposal : p));
        setFeedbackMessage({ type: 'success', text: 'Proposal updated successfully.' });
      } else {
        const res = await api.saveProposal(formData);
        const newProposal: ResearchProposal = {
          ...formData as any,
          id: res.proposalId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setProposals(prev => [newProposal, ...prev]);
        setSelectedProposalId(res.proposalId);
        setFeedbackMessage({ type: 'success', text: 'Proposal saved successfully.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to save proposal' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProposalId) return;
    if (!window.confirm('Are you sure you want to delete this research proposal draft?')) return;

    try {
      await api.deleteProposal(selectedProposalId);
      const remaining = proposals.filter(p => p.id !== selectedProposalId);
      setProposals(remaining);
      if (remaining.length > 0) {
        setSelectedProposalId(remaining[0].id);
        setFormData(remaining[0]);
      } else {
        setSelectedProposalId(null);
        setFormData({
          title: '',
          problem_statement: '',
          motivation: '',
          objectives: [],
          research_questions: [],
          hypothesis: '',
          proposed_methodology: '',
          candidate_datasets: [],
          baselines_and_metrics: [],
          experimental_plan: [],
          expected_contribution: '',
          feasibility_and_resources: '',
          ethical_considerations: '',
          limitations_and_future_work: '',
          supporting_literature: [],
          status: 'draft'
        });
      }
      setFeedbackMessage({ type: 'success', text: 'Proposal deleted.' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to delete proposal' });
    }
  };

  const handleExportMarkdown = () => {
    let md = `# Research Proposal: ${formData.title || 'Untitled Proposal'}\n\n`;
    md += `*Status: ${formData.status} · Generated via Research Gap Discovery Platform*\n\n`;
    md += `## 1. Problem Statement\n${formData.problem_statement || 'N/A'}\n\n`;
    md += `## 2. Research Motivation\n${formData.motivation || 'N/A'}\n\n`;
    md += `## 3. Research Objectives\n`;
    (Array.isArray(formData.objectives) ? formData.objectives : []).forEach(o => { md += `- ${o}\n`; });
    md += `\n## 4. Research Questions\n`;
    (Array.isArray(formData.research_questions) ? formData.research_questions : []).forEach(q => { md += `- ${q}\n`; });
    md += `\n## 5. Working Hypothesis\n${formData.hypothesis || 'N/A'}\n\n`;
    md += `## 6. Proposed Methodology\n${formData.proposed_methodology || 'N/A'}\n\n`;
    md += `## 7. Candidate Datasets\n`;
    (Array.isArray(formData.candidate_datasets) ? formData.candidate_datasets : []).forEach(d => { md += `- ${d}\n`; });
    md += `\n## 8. Baselines and Evaluation Metrics\n`;
    (Array.isArray(formData.baselines_and_metrics) ? formData.baselines_and_metrics : []).forEach(m => { md += `- ${m}\n`; });
    md += `\n## 9. Experimental Plan\n`;
    if (Array.isArray(formData.experimental_plan)) {
      formData.experimental_plan.forEach((item: any) => {
        md += `### ${item.phase} (${item.duration || 'TBD'})\n${item.description}\n\n`;
      });
    } else {
      md += `${formData.experimental_plan || 'N/A'}\n\n`;
    }
    md += `## 10. Expected Contribution\n${formData.expected_contribution || 'N/A'}\n\n`;
    md += `## 11. Feasibility and Resource Requirements\n${formData.feasibility_and_resources || 'N/A'}\n\n`;
    md += `## 12. Ethical Considerations\n${formData.ethical_considerations || 'N/A'}\n\n`;
    md += `## 13. Limitations and Future Work\n${formData.limitations_and_future_work || 'N/A'}\n\n`;
    md += `## 14. Supporting Evidence & Literature\n`;
    (Array.isArray(formData.supporting_literature) ? formData.supporting_literature : []).forEach(l => { md += `- ${l}\n`; });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research_proposal_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    const text = `PROPOSAL: ${formData.title}\n\nPROBLEM: ${formData.problem_statement}\n\nMETHODOLOGY: ${formData.proposed_methodology}\n\nEXPECTED CONTRIBUTION: ${formData.expected_contribution}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Research Proposal Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Formulate, edit, and export publication-ready academic proposals synthesized from verified research gaps.
          </p>
        </div>

        {/* Global Feedback notification */}
        {feedbackMessage && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {feedbackMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{feedbackMessage.text}</span>
          </div>
        )}
      </div>

      {/* Synthesis Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Gap Selector + Synthesize CTA */}
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Target Evidenced Gap:
            </label>
            <select
              value={selectedGapId}
              onChange={(e) => setSelectedGapId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Choose a discovered research gap --</option>
              {gaps.map((g) => (
                <option key={g.id} value={g.id}>
                  [{g.gap_type || 'Gap'}] {g.title || g.gap_title}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerateFromGap}
              disabled={generating || !selectedGapId}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Synthesizing Proposal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Synthesize Proposal from Gap</span>
                </>
              )}
            </button>
          </div>

          {/* Saved Proposals Selector */}
          {proposals.length > 0 && (
            <div className="flex items-center gap-2 border-t pt-3 lg:border-t-0 lg:pt-0 border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 whitespace-nowrap">Load Saved:</span>
              <select
                value={selectedProposalId || ''}
                onChange={(e) => handleSelectProposal(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {proposals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title.length > 40 ? p.title.slice(0, 40) + '...' : p.title} ({p.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Academic Review Notice Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold">Academic Review & Governance Notice:</strong> Research proposals generated by the platform synthesize empirical limitations and algorithmic hypotheses from your literature collection. All experimental plans and hypotheses require validation by human faculty advisors prior to formal registration or funding applications.
        </div>
      </div>

      {/* Main Proposal Editor Form */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {/* Editor Actions Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              15-Section Academic Proposal Formulation
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Copy Summary to Clipboard"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Export as Markdown Document"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Markdown</span>
            </button>

            {selectedProposalId && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                title="Delete this proposal draft"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              onClick={handleSaveOrUpdate}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-6 p-6">
          {/* Section 1: Title & Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                1. Proposed Research Title
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Robust Empirical Benchmarking of Parameter-Efficient Fine-Tuning Under Communication Latencies"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Review Status
              </label>
              <select
                value={formData.status || 'draft'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="draft">Draft Protocol</option>
                <option value="under_review">Faculty Review Pending</option>
                <option value="finalized">Peer Validated & Finalized</option>
              </select>
            </div>
          </div>

          {/* Section 2: Problem Statement */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              2. Problem Statement (Evidenced from Research Gaps)
            </label>
            <textarea
              rows={3}
              value={formData.problem_statement || ''}
              onChange={(e) => setFormData({ ...formData, problem_statement: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
            />
          </div>

          {/* Section 3: Motivation */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              3. Research Motivation & Scientific Significance
            </label>
            <textarea
              rows={2}
              value={formData.motivation || ''}
              onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
            />
          </div>

          {/* Section 4 & 5: Objectives & Questions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                4. Research Objectives (One per line)
              </label>
              <textarea
                rows={4}
                value={Array.isArray(formData.objectives) ? formData.objectives.join('\n') : ''}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value.split('\n').filter(Boolean) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                5. Primary Research Questions (One per line)
              </label>
              <textarea
                rows={4}
                value={Array.isArray(formData.research_questions) ? formData.research_questions.join('\n') : ''}
                onChange={(e) => setFormData({ ...formData, research_questions: e.target.value.split('\n').filter(Boolean) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Section 6: Hypothesis */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              6. Testable Scientific Hypothesis
            </label>
            <textarea
              rows={2}
              value={formData.hypothesis || ''}
              onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
            />
          </div>

          {/* Section 7: Proposed Methodology */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              7. Proposed Methodology & Algorithmic Architecture
            </label>
            <textarea
              rows={3}
              value={formData.proposed_methodology || ''}
              onChange={(e) => setFormData({ ...formData, proposed_methodology: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
            />
          </div>

          {/* Section 8 & 9: Datasets & Baselines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                8. Candidate Datasets & Verification Status (One per line)
              </label>
              <textarea
                rows={3}
                value={Array.isArray(formData.candidate_datasets) ? formData.candidate_datasets.join('\n') : ''}
                onChange={(e) => setFormData({ ...formData, candidate_datasets: e.target.value.split('\n').filter(Boolean) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                9. Baseline Models & Evaluation Metrics (One per line)
              </label>
              <textarea
                rows={3}
                value={Array.isArray(formData.baselines_and_metrics) ? formData.baselines_and_metrics.join('\n') : ''}
                onChange={(e) => setFormData({ ...formData, baselines_and_metrics: e.target.value.split('\n').filter(Boolean) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Section 10: Expected Contribution */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              10. Expected Contribution & Deliverables
            </label>
            <textarea
              rows={2}
              value={formData.expected_contribution || ''}
              onChange={(e) => setFormData({ ...formData, expected_contribution: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
            />
          </div>

          {/* Section 11 & 12: Feasibility & Ethics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                11. Feasibility & Compute Resources Required
              </label>
              <textarea
                rows={2}
                value={formData.feasibility_and_resources || ''}
                onChange={(e) => setFormData({ ...formData, feasibility_and_resources: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                12. Ethical Considerations & Data Safety
              </label>
              <textarea
                rows={2}
                value={formData.ethical_considerations || ''}
                onChange={(e) => setFormData({ ...formData, ethical_considerations: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Section 13: Limitations & Future Work */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              13. Known Limitations & Threats to Validity
            </label>
            <textarea
              rows={2}
              value={formData.limitations_and_future_work || ''}
              onChange={(e) => setFormData({ ...formData, limitations_and_future_work: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Section 14: Supporting Literature */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              14. Supporting Evidence & Grounded Excerpts (One per line)
            </label>
            <textarea
              rows={3}
              value={Array.isArray(formData.supporting_literature) ? formData.supporting_literature.join('\n') : ''}
              onChange={(e) => setFormData({ ...formData, supporting_literature: e.target.value.split('\n').filter(Boolean) })}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono text-[11px]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <span className="text-xs text-slate-500">
            {formData.updated_at ? `Last updated: ${new Date(formData.updated_at).toLocaleString()}` : 'Unsaved new draft'}
          </span>
          <button
            onClick={handleSaveOrUpdate}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Research Proposal'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
