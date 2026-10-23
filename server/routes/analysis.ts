import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest, requireAuth } from '../services/authService.ts';
import { PdfService } from '../services/pdfService.ts';
import { NlpAdapter } from '../services/nlpAdapter.ts';
import { GeminiService } from '../services/geminiService.ts';
import { LiteratureService } from '../services/literatureService.ts';
import { query, queryOne, execute } from '../db/index.ts';

const router = Router();

// GET /api/analysis/stats - Real database-derived statistics for dashboard
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const paperCounts = await queryOne<{ total: number; analyzed: number; pending: number; error: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'analyzed' THEN 1 ELSE 0 END) as analyzed,
        SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
       FROM papers WHERE user_id = ?`,
      [userId]
    );

    const gapCounts = await queryOne<{ total: number; validated: number; candidate: number; requires_review: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN validation_status = 'Validated' OR validation_status = 'validated' THEN 1 ELSE 0 END) as validated,
        SUM(CASE WHEN validation_status = 'Candidate' THEN 1 ELSE 0 END) as candidate,
        SUM(CASE WHEN validation_status = 'requires_review' THEN 1 ELSE 0 END) as requires_review
       FROM candidate_research_gaps WHERE user_id = ?`,
      [userId]
    );

    const recCount = await queryOne<{ total: number }>(
      'SELECT COUNT(*) as total FROM recommendations WHERE user_id = ?',
      [userId]
    );

    // Research domain breakdown
    const domains = await query<{ research_domain: string; count: number }>(
      `SELECT COALESCE(research_domain, 'Computer Science') as research_domain, COUNT(*) as count
       FROM paper_metadata m
       JOIN papers p ON m.paper_id = p.id
       WHERE p.user_id = ?
       GROUP BY research_domain
       ORDER BY count DESC
       LIMIT 6`,
      [userId]
    );

    // Gap severity breakdown
    const severities = await query<{ severity: string; count: number }>(
      `SELECT COALESCE(severity, priority, 'Medium') as severity, COUNT(*) as count
       FROM candidate_research_gaps
       WHERE user_id = ?
       GROUP BY COALESCE(severity, priority, 'Medium')`,
      [userId]
    );

    // Recent papers
    const recentPapers = await query(
      `SELECT id, title, status, file_size, created_at
       FROM papers
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    // Recent analysis activity
    const recentActivity = await query(
      `SELECT * FROM analysis_history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 8`,
      [userId]
    );

    res.json({
      totalPapers: paperCounts?.total || 0,
      analyzedPapers: paperCounts?.analyzed || 0,
      pendingPapers: paperCounts?.pending || 0,
      errorPapers: paperCounts?.error || 0,
      totalGaps: gapCounts?.total || 0,
      validatedGaps: gapCounts?.validated || 0,
      candidateGaps: (gapCounts?.candidate || 0) + (gapCounts?.requires_review || 0),
      totalRecommendations: recCount?.total || 0,
      domainBreakdown: domains.map((d) => ({ name: d.research_domain, value: d.count })),
      severityBreakdown: severities.map((s) => ({
        name: s.severity.charAt(0).toUpperCase() + s.severity.slice(1).toLowerCase(),
        value: s.count
      })),
      recentPapers,
      recentActivity
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch statistics' });
  }
});

// GET /api/analyses/:id/status - Job status polling endpoint
router.get(['/:id/status', '/jobs/:id/status'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const jobId = req.params.id;

    // Check by job ID or by paper ID
    const job = await queryOne(
      'SELECT * FROM analysis_jobs WHERE (id = ? OR paper_id = ?) AND user_id = ? ORDER BY started_at DESC LIMIT 1',
      [jobId, jobId, userId]
    );

    if (!job) {
      res.status(404).json({ error: 'Analysis job not found.' });
      return;
    }

    res.json({
      jobId: job.id,
      paperId: job.paper_id,
      jobType: job.job_type,
      status: job.status,
      progress: job.progress,
      currentStep: job.current_step || (job.status === 'completed' ? 'Done' : 'Processing'),
      error: job.error,
      startedAt: job.started_at,
      completedAt: job.completed_at
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch job status' });
  }
});

// POST /api/analysis/gaps and /api/gaps/discover - Discover research gaps
router.post(['/gaps', '/discover'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { paperIds } = req.body;

    let papersQuery = `
      SELECT p.id, p.title, m.abstract, m.methodology, m.limitations, m.future_work, m.datasets, m.algorithms
      FROM papers p
      JOIN paper_metadata m ON p.id = m.paper_id
      WHERE p.user_id = ? AND p.status = 'analyzed'
    `;
    const queryParams: any[] = [userId];

    if (Array.isArray(paperIds) && paperIds.length > 0) {
      papersQuery += ` AND p.id IN (${paperIds.map(() => '?').join(',')})`;
      queryParams.push(...paperIds);
    }

    const analyzedPapers = await query(papersQuery, queryParams);

    if (analyzedPapers.length === 0) {
      res.status(400).json({ error: 'No analyzed papers available. Please upload and analyze papers first.' });
      return;
    }

    const formattedPapers = analyzedPapers.map((p) => ({
      id: p.id,
      title: p.title,
      abstract: p.abstract || '',
      methodology: p.methodology || '',
      limitations: p.limitations ? JSON.parse(p.limitations) : [],
      futureWork: p.future_work ? JSON.parse(p.future_work) : [],
      datasets: p.datasets ? JSON.parse(p.datasets) : [],
      algorithms: p.algorithms ? JSON.parse(p.algorithms) : []
    }));

    // Trigger Gemini gap discovery with structured output
    const discoveredGaps = await GeminiService.discoverResearchGaps(formattedPapers);

    const savedGaps: any[] = [];
    for (const gap of discoveredGaps) {
      const gapId = gap.gap_id || `gap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const supportingPaperIds = gap.supporting_papers && gap.supporting_papers.length > 0
        ? gap.supporting_papers
        : analyzedPapers.map((p) => p.id);

      // Automatic OpenAlex literature novelty check for broader scientific coverage
      let noveltyStatus = 'Novelty not verified';
      let litRefs: any[] = [];
      try {
        const litCheck = await LiteratureService.verifyBroaderLiterature(gap.title);
        noveltyStatus = litCheck.status;
        litRefs = litCheck.works;
      } catch {}

      await execute(
        `INSERT INTO candidate_research_gaps (
          id, gap_id, user_id, paper_ids, gap_title, title, gap_description, description,
          gap_category, gap_type, research_domain, severity, priority, validation_status,
          supporting_papers, supporting_evidence, page_references, reasoning, counterevidence,
          confidence, proposed_research_question, suggested_methodology, potential_datasets,
          evaluation_metrics, expected_contribution, limitations_of_this_assessment,
          scores_breakdown, literature_novelty_status, literature_references
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gapId,
          gapId,
          userId,
          JSON.stringify(supportingPaperIds),
          gap.title,
          gap.title,
          gap.description,
          gap.description,
          gap.gap_type,
          gap.gap_type,
          gap.research_domain || 'Applied Computing',
          gap.priority === 'high' ? 'High' : gap.priority === 'low' ? 'Low' : 'Medium',
          gap.priority,
          gap.validation_status || 'requires_review',
          JSON.stringify(supportingPaperIds),
          JSON.stringify(gap.supporting_evidence || []),
          JSON.stringify(gap.page_references || []),
          gap.reasoning,
          JSON.stringify(gap.counterevidence || []),
          gap.confidence || 0.85,
          gap.proposed_research_question,
          JSON.stringify(gap.suggested_methodology || []),
          JSON.stringify(gap.potential_datasets || []),
          JSON.stringify(gap.evaluation_metrics || []),
          gap.expected_contribution,
          JSON.stringify(gap.limitations_of_this_assessment || []),
          JSON.stringify(gap.scores_breakdown || {}),
          noveltyStatus,
          JSON.stringify(litRefs)
        ]
      );

      // Insert gap_evidence records for traceability
      if (gap.supporting_evidence && gap.supporting_evidence.length > 0) {
        for (const ev of gap.supporting_evidence) {
          const evId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await execute(
            `INSERT INTO gap_evidence (id, gap_id, paper_id, excerpt, section_name, page_number, confidence_score, explanation, verification_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              evId,
              gapId,
              ev.paper_id || supportingPaperIds[0] || 'unknown',
              ev.excerpt,
              ev.section || 'Limitations',
              typeof ev.page === 'number' ? ev.page : 1,
              ev.confidence || gap.confidence || 0.85,
              gap.reasoning || 'Author-stated limitation',
              'verified'
            ]
          );
        }
      }

      savedGaps.push({
        ...gap,
        gap_id: gapId,
        id: gapId,
        literature_novelty_status: noveltyStatus,
        literature_references: litRefs
      });
    }

    await execute(
      `INSERT INTO analysis_history (id, user_id, action_type, description, entity_id, entity_type, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`hist_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, userId, 'gap_discovery', `Discovered ${savedGaps.length} candidate gaps across ${analyzedPapers.length} papers`, savedGaps[0]?.id || '', 'candidate_research_gaps', JSON.stringify({ count: savedGaps.length })]
    );

    res.status(201).json({
      success: true,
      gapsFound: savedGaps.length,
      gaps: savedGaps
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Research gap discovery failed' });
  }
});

// GET /api/analysis/gaps and /api/gaps - List all gaps
router.get('/gaps', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const gaps = await query(
      `SELECT * FROM candidate_research_gaps WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    const gapsWithEvidence = await Promise.all(
      gaps.map(async (g) => {
        const evidence = await query(
          `SELECT e.*, p.title as paper_title
           FROM gap_evidence e
           LEFT JOIN papers p ON e.paper_id = p.id
           WHERE e.gap_id = ?`,
          [g.id]
        );
        return {
          ...g,
          gap_id: g.gap_id || g.id,
          title: g.title || g.gap_title,
          description: g.description || g.gap_description,
          gap_type: g.gap_type || g.gap_category,
          paper_ids: JSON.parse(g.paper_ids || '[]'),
          supporting_papers: g.supporting_papers ? JSON.parse(g.supporting_papers) : JSON.parse(g.paper_ids || '[]'),
          supporting_evidence: g.supporting_evidence ? JSON.parse(g.supporting_evidence) : [],
          counterevidence: g.counterevidence ? JSON.parse(g.counterevidence) : [],
          scores_breakdown: g.scores_breakdown ? JSON.parse(g.scores_breakdown) : null,
          literature_references: g.literature_references ? JSON.parse(g.literature_references) : [],
          evidence
        };
      })
    );

    res.json({ gaps: gapsWithEvidence });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch research gaps' });
  }
});

// GET /api/gaps/:id - Get specific gap details
router.get('/gaps/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const gap = await queryOne(
      'SELECT * FROM candidate_research_gaps WHERE (id = ? OR gap_id = ?) AND user_id = ?',
      [req.params.id, req.params.id, userId]
    );

    if (!gap) {
      res.status(404).json({ error: 'Research gap not found.' });
      return;
    }

    const evidence = await query(
      `SELECT e.*, p.title as paper_title
       FROM gap_evidence e
       LEFT JOIN papers p ON e.paper_id = p.id
       WHERE e.gap_id = ?`,
      [gap.id]
    );

    res.json({
      gap: {
        ...gap,
        gap_id: gap.gap_id || gap.id,
        title: gap.title || gap.gap_title,
        description: gap.description || gap.gap_description,
        gap_type: gap.gap_type || gap.gap_category,
        supporting_papers: gap.supporting_papers ? JSON.parse(gap.supporting_papers) : [],
        supporting_evidence: gap.supporting_evidence ? JSON.parse(gap.supporting_evidence) : [],
        counterevidence: gap.counterevidence ? JSON.parse(gap.counterevidence) : [],
        suggested_methodology: gap.suggested_methodology ? JSON.parse(gap.suggested_methodology) : [],
        potential_datasets: gap.potential_datasets ? JSON.parse(gap.potential_datasets) : [],
        evaluation_metrics: gap.evaluation_metrics ? JSON.parse(gap.evaluation_metrics) : [],
        scores_breakdown: gap.scores_breakdown ? JSON.parse(gap.scores_breakdown) : null,
        literature_references: gap.literature_references ? JSON.parse(gap.literature_references) : [],
        evidence
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch gap details' });
  }
});

// PATCH /api/analysis/gaps/:id/status - Update validation status
router.patch('/gaps/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status } = req.body;
    const normalizedStatus = status.toLowerCase();

    if (!['requires_review', 'validated', 'refuted', 'candidate'].includes(normalizedStatus)) {
      res.status(400).json({ error: 'Status must be requires_review, validated, or refuted' });
      return;
    }

    await execute(
      'UPDATE candidate_research_gaps SET validation_status = ? WHERE (id = ? OR gap_id = ?) AND user_id = ?',
      [status, req.params.id, req.params.id, userId]
    );

    res.json({ message: 'Gap validation status updated.', id: req.params.id, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Status update failed' });
  }
});

// GET /api/literature/verify - OpenAlex scholarly novelty check
router.get('/literature/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const queryParam = req.query.query as string;
    if (!queryParam) {
      res.status(400).json({ error: 'Query string parameter "query" is required.' });
      return;
    }

    const result = await LiteratureService.verifyBroaderLiterature(queryParam);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Literature verification failed' });
  }
});

// POST /api/analysis/recommendations and /api/recommendations - Generate future research directions
router.post('/recommendations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { gapId } = req.body;

    const gap = await queryOne(
      'SELECT * FROM candidate_research_gaps WHERE (id = ? OR gap_id = ?) AND user_id = ?',
      [gapId, gapId, userId]
    );

    if (!gap) {
      res.status(404).json({ error: 'Research gap not found or unauthorized' });
      return;
    }

    const evidenceRows = await query('SELECT excerpt FROM gap_evidence WHERE gap_id = ?', [gap.id]);
    const evidenceExcerpts = evidenceRows.map((e) => e.excerpt);

    const recs = await GeminiService.generateRecommendations(
      gap.title || gap.gap_title,
      gap.description || gap.gap_description,
      gap.gap_type || gap.gap_category,
      evidenceExcerpts
    );

    const savedRecs: any[] = [];
    for (const r of recs) {
      const recId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await execute(
        `INSERT INTO recommendations (
          id, gap_id, user_id, recommendation_title, proposed_methodology, expected_impact,
          feasibility_rating, potential_challenges, suggested_datasets, research_question,
          hypothesis, experiment_plan, required_resources, ethical_considerations, evidence_excerpts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recId,
          gap.id,
          userId,
          r.recommendation_title,
          r.proposed_methodology,
          r.expected_impact,
          r.feasibility_rating,
          r.potential_challenges,
          JSON.stringify((r.potential_datasets || []).map((d) => d.name)),
          r.research_question,
          r.hypothesis,
          r.experiment_plan,
          r.required_resources,
          r.ethical_considerations,
          JSON.stringify(r.supporting_evidence_excerpts || [])
        ]
      );
      savedRecs.push({ id: recId, ...r, gap_title: gap.title || gap.gap_title });
    }

    await execute(
      `INSERT INTO analysis_history (id, user_id, action_type, description, entity_id, entity_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`hist_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, userId, 'recommendation_generated', `Generated future research directions for: ${gap.title || gap.gap_title}`, gap.id, 'recommendations']
    );

    res.status(201).json({ success: true, recommendations: savedRecs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate recommendations' });
  }
});

// GET /api/analysis/recommendations and /api/recommendations - List recommendations
router.get('/recommendations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const recs = await query(
      `SELECT r.*, COALESCE(g.title, g.gap_title) as gap_title, COALESCE(g.gap_type, g.gap_category) as gap_category, COALESCE(g.priority, g.severity) as gap_severity
       FROM recommendations r
       LEFT JOIN candidate_research_gaps g ON r.gap_id = g.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const formatted = recs.map((r) => ({
      ...r,
      suggested_datasets: r.suggested_datasets ? JSON.parse(r.suggested_datasets) : [],
      evidence_excerpts: r.evidence_excerpts ? JSON.parse(r.evidence_excerpts) : []
    }));

    res.json({ recommendations: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch recommendations' });
  }
});

// POST /api/analysis/compare and /api/comparisons - Multi-paper comparison
router.post(['/compare', '/comparisons'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { paperIds } = req.body;

    if (!Array.isArray(paperIds) || paperIds.length < 2) {
      res.status(400).json({ error: 'Please select at least 2 papers for comparison.' });
      return;
    }

    const papers = await query(
      `SELECT p.id, p.title, m.abstract, m.methodology, m.algorithms, m.datasets, m.metrics, m.limitations
       FROM papers p
       LEFT JOIN paper_metadata m ON p.id = m.paper_id
       WHERE p.user_id = ? AND p.id IN (${paperIds.map(() => '?').join(',')})`,
      [userId, ...paperIds]
    );

    if (papers.length < 2) {
      res.status(400).json({ error: 'Could not find enough matching papers for comparison.' });
      return;
    }

    const comparisonInputs = papers.map((p) => ({
      id: p.id,
      title: p.title,
      abstract: p.abstract || '',
      methodology: p.methodology || '',
      limitations: p.limitations ? JSON.parse(p.limitations).join('; ') : '',
      algorithms: p.algorithms ? JSON.parse(p.algorithms) : [],
      datasets: p.datasets ? JSON.parse(p.datasets) : []
    }));

    const result = await NlpAdapter.comparePapers(comparisonInputs);

    const comparisonTable = papers.map((p) => ({
      id: p.id,
      title: p.title,
      algorithms: p.algorithms ? JSON.parse(p.algorithms) : [],
      datasets: p.datasets ? JSON.parse(p.datasets) : [],
      metrics: p.metrics ? JSON.parse(p.metrics) : {},
      limitations: p.limitations ? JSON.parse(p.limitations) : []
    }));

    const compId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullComparisonObject = {
      id: compId,
      engine: result.engine,
      titles: result.titles,
      paperIds: result.paperIds,
      similarityMatrix: result.similarityMatrix,
      commonKeywords: result.commonKeywords,
      divergencePoints: result.divergencePoints,
      recurringLimitations: result.recurringLimitations,
      comparisonTable,
      created_at: new Date().toISOString()
    };

    await execute(
      `INSERT INTO paper_comparisons (id, user_id, paper_ids, comparison_result_json)
       VALUES (?, ?, ?, ?)`,
      [compId, userId, JSON.stringify(paperIds), JSON.stringify(fullComparisonObject)]
    );

    await execute(
      `INSERT INTO analysis_history (id, user_id, action_type, description, entity_id, entity_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`hist_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, userId, 'compare', `Compared ${papers.length} research papers (${result.engine})`, compId, 'paper_comparisons']
    );

    res.json(fullComparisonObject);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Comparison failed' });
  }
});

// GET /api/comparisons/:id - Retrieve comparison by ID
router.get('/comparisons/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const comp = await queryOne(
      'SELECT * FROM paper_comparisons WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!comp) {
      res.status(404).json({ error: 'Comparison record not found.' });
      return;
    }

    res.json(JSON.parse(comp.comparison_result_json));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch comparison' });
  }
});

// GET /api/analysis/history - Audit trail
router.get('/history', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const history = await query(
      'SELECT * FROM analysis_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch history' });
  }
});

// GET /api/export/report - Generate downloadable comprehensive academic report (JSON / Markdown)
router.get('/export/report', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const format = (req.query.format as string) || 'json';

    const papers = await query(
      `SELECT p.id, p.title, p.original_filename, m.research_domain, m.authors, m.publication_year, m.abstract, m.methodology, m.limitations, m.structured_analysis_json
       FROM papers p
       LEFT JOIN paper_metadata m ON p.id = m.paper_id
       WHERE p.user_id = ?`,
      [userId]
    );

    const gaps = await query('SELECT * FROM candidate_research_gaps WHERE user_id = ?', [userId]);
    const recs = await query('SELECT * FROM recommendations WHERE user_id = ?', [userId]);

    const reportData = {
      metadata: {
        title: 'Comprehensive Research Gap Discovery & Literature Analysis Report',
        generatedAt: new Date().toISOString(),
        institution: 'Academic Research Intelligence Platform',
        collectionSize: papers.length,
        literatureNoveltyChecked: true
      },
      papers: papers.map((p) => ({
        id: p.id,
        title: p.title,
        authors: p.authors ? JSON.parse(p.authors) : [],
        publication_year: p.publication_year,
        research_domain: p.research_domain,
        abstract: p.abstract,
        limitations: p.limitations ? JSON.parse(p.limitations) : [],
        structured_analysis: p.structured_analysis_json ? JSON.parse(p.structured_analysis_json) : null
      })),
      research_gaps: gaps.map((g) => ({
        gap_id: g.gap_id || g.id,
        title: g.title || g.gap_title,
        description: g.description || g.gap_description,
        gap_type: g.gap_type || g.gap_category,
        priority: g.priority || g.severity,
        validation_status: g.validation_status,
        proposed_research_question: g.proposed_research_question,
        expected_contribution: g.expected_contribution,
        scores_breakdown: g.scores_breakdown ? JSON.parse(g.scores_breakdown) : null,
        literature_novelty_status: g.literature_novelty_status
      })),
      recommendations: recs.map((r) => ({
        id: r.id,
        title: r.recommendation_title,
        research_question: r.research_question,
        hypothesis: r.hypothesis,
        methodology: r.proposed_methodology,
        experiment_plan: r.experiment_plan,
        feasibility_rating: r.feasibility_rating,
        expected_impact: r.expected_impact
      }))
    };

    if (format === 'markdown') {
      let md = `# ${reportData.metadata.title}\n\n`;
      md += `*Generated: ${new Date(reportData.metadata.generatedAt).toLocaleString()}*\n\n`;
      md += `## 1. Executive Summary\n`;
      md += `Analyzed ${papers.length} peer-reviewed research papers. Identified ${gaps.length} candidate research gaps grounded in empirical limitations, yielding ${recs.length} actionable future research directions.\n\n`;

      md += `## 2. Indexed Publications\n`;
      reportData.papers.forEach((p, idx) => {
        md += `### 2.${idx + 1} ${p.title}\n`;
        md += `- **Authors:** ${p.authors.join(', ') || 'N/A'}\n`;
        md += `- **Year:** ${p.publication_year || 'N/A'}\n`;
        md += `- **Domain:** ${p.research_domain || 'N/A'}\n`;
        md += `- **Stated Limitations:**\n`;
        p.limitations.forEach((l: string) => (md += `  - ${l}\n`));
        md += `\n`;
      });

      md += `## 3. Discovered Candidate Research Gaps\n`;
      reportData.research_gaps.forEach((g, idx) => {
        md += `### 3.${idx + 1} ${g.title}\n`;
        md += `- **Category:** ${g.gap_type} | **Priority:** ${g.priority} | **Status:** ${g.validation_status}\n`;
        md += `- **Description:** ${g.description}\n`;
        md += `- **Proposed Research Question:** ${g.proposed_research_question || 'N/A'}\n`;
        md += `- **Novelty Status:** ${g.literature_novelty_status || 'Novelty not verified'}\n\n`;
      });

      md += `## 4. Future Research Directions\n`;
      reportData.recommendations.forEach((r, idx) => {
        md += `### 4.${idx + 1} ${r.title}\n`;
        md += `- **Research Question:** ${r.research_question || 'N/A'}\n`;
        md += `- **Proposed Methodology:** ${r.methodology}\n`;
        md += `- **Expected Impact:** ${r.expected_impact}\n\n`;
      });

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="research_gap_report_${Date.now()}.md"`);
      res.send(md);
      return;
    }

    if (format === 'html') {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${reportData.metadata.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 900px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 24px; color: #0b132b; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 8px; }
    h2 { font-size: 18px; color: #1e293b; margin-top: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    h3 { font-size: 15px; color: #334155; margin-top: 20px; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .tag { display: inline-block; font-size: 11px; font-family: monospace; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; margin-right: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    blockquote { border-left: 3px solid #6366f1; margin: 8px 0; padding-left: 12px; font-style: italic; color: #475569; }
    @media print { body { max-width: 100%; margin: 0; padding: 20px; } .card { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${reportData.metadata.title}</h1>
  <div class="meta">
    Generated: ${new Date(reportData.metadata.generatedAt).toLocaleString()} · Collection: ${papers.length} Papers · Evidence-Backed Gaps: ${gaps.length}
  </div>

  <h2>1. Executive Summary</h2>
  <p>
    This academic intelligence report synthesizes ${papers.length} peer-reviewed research papers through section-aware extraction, cross-paper semantic analysis, and empirical limitation clustering.
    A total of ${gaps.length} candidate research gaps were discovered, distinguishing explicit author limitations from AI-generated hypotheses.
  </p>

  <h2>2. Indexed Research Publications</h2>
  ${reportData.papers.map((p, i) => `
    <div class="card">
      <h3>${i + 1}. ${p.title}</h3>
      <p style="font-size: 13px; color: #64748b;">Authors: ${(p.authors || []).join(', ') || 'N/A'} · Year: ${p.publication_year || 'N/A'} · Domain: ${p.research_domain || 'N/A'}</p>
      <p style="font-size: 13px;"><strong>Stated Limitations:</strong></p>
      <ul>${(p.limitations || []).map((l: string) => `<li>${l}</li>`).join('') || '<li>None explicitly reported.</li>'}</ul>
    </div>
  `).join('')}

  <h2>3. Discovered Candidate Research Gaps & Evidence</h2>
  ${reportData.research_gaps.map((g, i) => `
    <div class="card">
      <span class="tag">${g.gap_type}</span>
      <span class="tag">Priority: ${g.priority}</span>
      <span class="tag">Status: ${g.validation_status}</span>
      <h3>${i + 1}. ${g.title}</h3>
      <p style="font-size: 13px;">${g.description}</p>
      <p style="font-size: 13px;"><strong>Proposed Research Question:</strong> ${g.proposed_research_question || 'N/A'}</p>
      <p style="font-size: 13px;"><strong>Literature Novelty Status:</strong> ${g.literature_novelty_status || 'Novelty not verified'}</p>
    </div>
  `).join('')}

  <h2>4. Actionable Future Research Directions</h2>
  ${reportData.recommendations.map((r, i) => `
    <div class="card">
      <h3>${i + 1}. ${r.title}</h3>
      <p style="font-size: 13px;"><strong>Research Question:</strong> ${r.research_question || 'N/A'}</p>
      <p style="font-size: 13px;"><strong>Proposed Methodology:</strong> ${r.methodology}</p>
      <p style="font-size: 13px;"><strong>Expected Impact:</strong> ${r.expected_impact}</p>
    </div>
  `).join('')}
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="research_gap_report_${Date.now()}.html"`);
      res.send(html);
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="research_gap_report_${Date.now()}.json"`);
    res.json(reportData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Report generation failed' });
  }
});

// ==========================================
// RESEARCH PROPOSALS WORKSPACE ENDPOINTS
// ==========================================

// GET /api/analysis/proposals - List all user saved research proposals
router.get('/proposals', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const proposals = await query(
      `SELECT * FROM research_proposals WHERE user_id = ? ORDER BY updated_at DESC`,
      [userId]
    );

    const parsed = proposals.map((p) => ({
      ...p,
      objectives: p.objectives ? JSON.parse(p.objectives) : [],
      research_questions: p.research_questions ? JSON.parse(p.research_questions) : [],
      candidate_datasets: p.candidate_datasets ? JSON.parse(p.candidate_datasets) : [],
      baselines_and_metrics: p.baselines_and_metrics ? JSON.parse(p.baselines_and_metrics) : [],
      experimental_plan: p.experimental_plan ? JSON.parse(p.experimental_plan) : [],
      supporting_literature: p.supporting_literature ? JSON.parse(p.supporting_literature) : []
    }));

    res.json({ proposals: parsed });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch proposals' });
  }
});

// GET /api/analysis/proposals/:id - Get a single proposal
router.get('/proposals/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const proposal = await queryOne(
      `SELECT * FROM research_proposals WHERE id = ? AND user_id = ?`,
      [req.params.id, userId]
    );

    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }

    res.json({
      proposal: {
        ...proposal,
        objectives: proposal.objectives ? JSON.parse(proposal.objectives) : [],
        research_questions: proposal.research_questions ? JSON.parse(proposal.research_questions) : [],
        candidate_datasets: proposal.candidate_datasets ? JSON.parse(proposal.candidate_datasets) : [],
        baselines_and_metrics: proposal.baselines_and_metrics ? JSON.parse(proposal.baselines_and_metrics) : [],
        experimental_plan: proposal.experimental_plan ? JSON.parse(proposal.experimental_plan) : [],
        supporting_literature: proposal.supporting_literature ? JSON.parse(proposal.supporting_literature) : []
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch proposal' });
  }
});

// POST /api/analysis/proposals/generate - Generate proposal from a selected candidate gap
router.post('/proposals/generate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { gapId } = req.body;

    if (!gapId) {
      res.status(400).json({ error: 'gapId is required' });
      return;
    }

    const gap = await queryOne<any>(
      `SELECT * FROM candidate_research_gaps WHERE (id = ? OR gap_id = ?) AND user_id = ?`,
      [gapId, gapId, userId]
    );

    if (!gap) {
      res.status(404).json({ error: 'Candidate research gap not found' });
      return;
    }

    // Load gap evidence
    const evidence = await query<any>(
      `SELECT * FROM gap_evidence WHERE gap_id = ?`,
      [gap.id]
    );

    const generated = await GeminiService.generateResearchProposal({
      title: gap.title || gap.gap_title,
      description: gap.description || gap.gap_description,
      gap_type: gap.gap_type || gap.gap_category,
      research_domain: gap.research_domain,
      proposed_research_question: gap.proposed_research_question,
      suggested_methodology: gap.suggested_methodology ? JSON.parse(gap.suggested_methodology) : [],
      potential_datasets: gap.potential_datasets ? JSON.parse(gap.potential_datasets) : [],
      evaluation_metrics: gap.evaluation_metrics ? JSON.parse(gap.evaluation_metrics) : [],
      evidence: evidence.map((e) => ({
        excerpt: e.excerpt,
        section_name: e.section_name,
        page_number: e.page_number
      }))
    });

    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await execute(
      `INSERT INTO research_proposals (
        id, user_id, gap_id, gap_title, title, problem_statement, motivation, objectives,
        research_questions, hypothesis, proposed_methodology, candidate_datasets,
        baselines_and_metrics, experimental_plan, expected_contribution, feasibility_and_resources,
        ethical_considerations, limitations_and_future_work, supporting_literature, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proposalId,
        userId,
        gap.id,
        gap.title || gap.gap_title,
        generated.title,
        generated.problem_statement,
        generated.motivation,
        JSON.stringify(generated.objectives || []),
        JSON.stringify(generated.research_questions || []),
        generated.hypothesis,
        generated.proposed_methodology,
        JSON.stringify(generated.candidate_datasets || []),
        JSON.stringify(generated.baselines_and_metrics || []),
        JSON.stringify(generated.experimental_plan || []),
        generated.expected_contribution,
        generated.feasibility_and_resources,
        generated.ethical_considerations,
        generated.limitations_and_future_work,
        JSON.stringify(generated.supporting_literature || []),
        'draft'
      ]
    );

    await execute(
      `INSERT INTO analysis_history (id, user_id, action_type, description, entity_id, entity_type)
       VALUES (?, ?, 'recommendation_generated', ?, ?, 'research_proposal')`,
      [
        `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        `Generated research proposal for gap: "${gap.title || gap.gap_title}"`,
        proposalId
      ]
    );

    res.json({
      success: true,
      proposalId,
      proposal: {
        id: proposalId,
        user_id: userId,
        gap_id: gap.id,
        gap_title: gap.title || gap.gap_title,
        ...generated,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate proposal' });
  }
});

// POST /api/analysis/proposals - Save / Create new proposal manually
router.post('/proposals', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const body = req.body;
    const proposalId = body.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await execute(
      `INSERT INTO research_proposals (
        id, user_id, gap_id, gap_title, title, problem_statement, motivation, objectives,
        research_questions, hypothesis, proposed_methodology, candidate_datasets,
        baselines_and_metrics, experimental_plan, expected_contribution, feasibility_and_resources,
        ethical_considerations, limitations_and_future_work, supporting_literature, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proposalId,
        userId,
        body.gap_id || null,
        body.gap_title || null,
        body.title || 'Untitled Proposal',
        body.problem_statement || '',
        body.motivation || '',
        JSON.stringify(body.objectives || []),
        JSON.stringify(body.research_questions || []),
        body.hypothesis || '',
        body.proposed_methodology || '',
        JSON.stringify(body.candidate_datasets || []),
        JSON.stringify(body.baselines_and_metrics || []),
        JSON.stringify(body.experimental_plan || []),
        body.expected_contribution || '',
        body.feasibility_and_resources || '',
        body.ethical_considerations || '',
        body.limitations_and_future_work || '',
        JSON.stringify(body.supporting_literature || []),
        body.status || 'draft'
      ]
    );

    res.json({ success: true, proposalId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create proposal' });
  }
});

// PUT /api/analysis/proposals/:id - Update existing proposal
router.put('/proposals/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;
    const body = req.body;

    await execute(
      `UPDATE research_proposals SET
        title = ?, problem_statement = ?, motivation = ?, objectives = ?, research_questions = ?,
        hypothesis = ?, proposed_methodology = ?, candidate_datasets = ?, baselines_and_metrics = ?,
        experimental_plan = ?, expected_contribution = ?, feasibility_and_resources = ?,
        ethical_considerations = ?, limitations_and_future_work = ?, supporting_literature = ?,
        status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        body.title,
        body.problem_statement,
        body.motivation,
        JSON.stringify(body.objectives || []),
        JSON.stringify(body.research_questions || []),
        body.hypothesis,
        body.proposed_methodology,
        JSON.stringify(body.candidate_datasets || []),
        JSON.stringify(body.baselines_and_metrics || []),
        JSON.stringify(body.experimental_plan || []),
        body.expected_contribution,
        body.feasibility_and_resources,
        body.ethical_considerations,
        body.limitations_and_future_work,
        JSON.stringify(body.supporting_literature || []),
        body.status || 'draft',
        id,
        userId
      ]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update proposal' });
  }
});

// DELETE /api/analysis/proposals/:id - Delete a proposal
router.delete('/proposals/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    await execute('DELETE FROM research_proposals WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete proposal' });
  }
});

// ==========================================
// RESEARCH LANDSCAPE GRAPH VISUALIZATION
// ==========================================

// GET /api/analysis/landscape - Return nodes & edges for the research landscape
router.get('/landscape', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const papers = await query<any>(
      `SELECT p.id, p.title, m.research_domain, m.algorithms, m.datasets, m.limitations
       FROM papers p
       LEFT JOIN paper_metadata m ON p.id = m.paper_id
       WHERE p.user_id = ?`,
      [userId]
    );

    const gaps = await query<any>(
      `SELECT id, gap_id, title, gap_title, gap_type, gap_category, severity, priority, paper_ids
       FROM candidate_research_gaps WHERE user_id = ?`,
      [userId]
    );

    const nodes: any[] = [];
    const links: any[] = [];
    const addedNodeIds = new Set<string>();

    let totalMethods = 0;
    let totalDatasets = 0;
    let totalLimitations = 0;

    // 1. Paper Nodes
    papers.forEach((p) => {
      const paperNodeId = `paper_${p.id}`;
      if (!addedNodeIds.has(paperNodeId)) {
        nodes.push({
          id: paperNodeId,
          label: p.title,
          type: 'paper',
          paperId: p.id,
          category: p.research_domain || 'General AI'
        });
        addedNodeIds.add(paperNodeId);
      }

      // Domain Node
      if (p.research_domain) {
        const domainNodeId = `domain_${p.research_domain.replace(/\s+/g, '_')}`;
        if (!addedNodeIds.has(domainNodeId)) {
          nodes.push({
            id: domainNodeId,
            label: p.research_domain,
            type: 'domain'
          });
          addedNodeIds.add(domainNodeId);
        }
        links.push({ source: paperNodeId, target: domainNodeId, relation: 'belongs_to' });
      }

      // Method Nodes
      const algos: string[] = p.algorithms ? JSON.parse(p.algorithms) : [];
      algos.slice(0, 3).forEach((algo) => {
        const mNodeId = `method_${algo.trim().replace(/\s+/g, '_')}`;
        if (!addedNodeIds.has(mNodeId)) {
          nodes.push({ id: mNodeId, label: algo.trim(), type: 'method', parentId: paperNodeId });
          addedNodeIds.add(mNodeId);
          totalMethods++;
        }
        links.push({ source: paperNodeId, target: mNodeId, relation: 'uses_method' });
      });

      // Dataset Nodes
      const dsets: string[] = p.datasets ? JSON.parse(p.datasets) : [];
      dsets.slice(0, 3).forEach((dset) => {
        const dNodeId = `dataset_${dset.trim().replace(/\s+/g, '_')}`;
        if (!addedNodeIds.has(dNodeId)) {
          nodes.push({ id: dNodeId, label: dset.trim(), type: 'dataset', parentId: paperNodeId });
          addedNodeIds.add(dNodeId);
          totalDatasets++;
        }
        links.push({ source: paperNodeId, target: dNodeId, relation: 'evaluated_on' });
      });

      // Limitation Nodes
      const lims: string[] = p.limitations ? JSON.parse(p.limitations) : [];
      lims.slice(0, 2).forEach((lim, lIdx) => {
        const lNodeId = `lim_${p.id}_${lIdx}`;
        if (!addedNodeIds.has(lNodeId)) {
          nodes.push({
            id: lNodeId,
            label: lim.length > 50 ? lim.substring(0, 50) + '...' : lim,
            details: lim,
            type: 'limitation',
            paperId: p.id
          });
          addedNodeIds.add(lNodeId);
          totalLimitations++;
        }
        links.push({ source: paperNodeId, target: lNodeId, relation: 'reports_limitation' });
      });
    });

    // 2. Candidate Gap Nodes
    gaps.forEach((g) => {
      const gapNodeId = `gap_${g.id}`;
      if (!addedNodeIds.has(gapNodeId)) {
        nodes.push({
          id: gapNodeId,
          label: g.title || g.gap_title,
          type: 'gap',
          gapId: g.id,
          category: g.gap_type || g.gap_category,
          severity: g.severity || g.priority
        });
        addedNodeIds.add(gapNodeId);
      }

      // Link Gap to Supporting Papers
      let paperIds: string[] = [];
      try {
        paperIds = g.paper_ids ? JSON.parse(g.paper_ids) : [];
      } catch {
        paperIds = [];
      }

      paperIds.forEach((pid) => {
        const pNodeId = `paper_${pid}`;
        if (addedNodeIds.has(pNodeId)) {
          links.push({ source: gapNodeId, target: pNodeId, relation: 'grounded_in' });
        }
      });
    });

    res.json({
      nodes,
      links,
      stats: {
        totalPapers: papers.length,
        totalMethods,
        totalDatasets,
        totalLimitations,
        totalGaps: gaps.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate landscape data' });
  }
});

// GET /api/analyses/:id - Get paper analysis results (placed at bottom after literal routes)
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const targetId = req.params.id;

    const paper = await queryOne(
      'SELECT * FROM papers WHERE id = ? AND user_id = ?',
      [targetId, userId]
    );

    if (!paper) {
      res.status(404).json({ error: 'Paper not found or unauthorized' });
      return;
    }

    const metadata = await queryOne(
      'SELECT * FROM paper_metadata WHERE paper_id = ?',
      [paper.id]
    );

    let structuredAnalysis = null;
    if (metadata?.structured_analysis_json) {
      try {
        structuredAnalysis = JSON.parse(metadata.structured_analysis_json);
      } catch {}
    }

    res.json({
      paper,
      metadata,
      analysis: structuredAnalysis
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch analysis' });
  }
});

export default router;

