import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest, requireAuth } from '../services/authService.ts';
import { PdfService } from '../services/pdfService.ts';
import { NlpAdapter } from '../services/nlpAdapter.ts';
import { GeminiService } from '../services/geminiService.ts';
import { query, queryOne, execute } from '../db/index.ts';

const router = Router();
const MAX_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '20', 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: 10
  }
});

// Middleware that gracefully catches MulterErrors and normalizes both 'files' and 'file' fields
const handleMulterUpload = (req: any, res: Response, next: any) => {
  upload.fields([{ name: 'files', maxCount: 10 }, { name: 'file', maxCount: 10 }])(req, res, (err: any) => {
    if (err) {
      if (err.name === 'MulterError') {
        let msg = `File upload failed: ${err.message}`;
        if (err.code === 'LIMIT_FILE_SIZE') {
          msg = `File exceeds maximum allowed size of ${MAX_SIZE_MB}MB.`;
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          msg = 'Too many files in upload. Maximum is 10 files per batch.';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          msg = `Unexpected file field "${err.field}". Please submit files using the "files" or "file" field.`;
        }
        res.status(400).json({ success: false, error: msg, code: err.code });
        return;
      }
      res.status(400).json({ success: false, error: err.message || 'File upload error' });
      return;
    }

    // Normalize incoming files into req.files array
    const filesDict = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const combinedFiles: Express.Multer.File[] = [];
    if (filesDict) {
      if (Array.isArray(filesDict.files)) combinedFiles.push(...filesDict.files);
      if (Array.isArray(filesDict.file)) combinedFiles.push(...filesDict.file);
    } else if (Array.isArray(req.files)) {
      combinedFiles.push(...req.files);
    }
    req.files = combinedFiles;
    next();
  });
};

// GET /api/papers - List user papers with metadata summary
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const papers = await query(
      `SELECT p.*, m.research_domain, m.authors, m.publication_year, m.page_count, m.is_scanned, m.ocr_required
       FROM papers p
       LEFT JOIN paper_metadata m ON p.id = m.paper_id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );

    const formatted = papers.map((p) => ({
      ...p,
      authors: p.authors ? JSON.parse(p.authors) : [],
      is_scanned: Boolean(p.is_scanned),
      ocr_required: Boolean(p.ocr_required)
    }));

    res.json({ papers: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch papers' });
  }
});

// GET /api/papers/:id - Get paper details
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const paper = await queryOne(
      'SELECT * FROM papers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!paper) {
      res.status(404).json({ error: 'Research paper not found or access denied.' });
      return;
    }

    const metadata = await queryOne(
      'SELECT * FROM paper_metadata WHERE paper_id = ?',
      [paper.id]
    );

    let parsedMeta = null;
    if (metadata) {
      parsedMeta = {
        ...metadata,
        authors: metadata.authors ? JSON.parse(metadata.authors) : [],
        keywords: metadata.keywords ? JSON.parse(metadata.keywords) : [],
        algorithms: metadata.algorithms ? JSON.parse(metadata.algorithms) : [],
        datasets: metadata.datasets ? JSON.parse(metadata.datasets) : [],
        metrics: metadata.metrics ? JSON.parse(metadata.metrics) : [],
        limitations: metadata.limitations ? JSON.parse(metadata.limitations) : [],
        future_work: metadata.future_work ? JSON.parse(metadata.future_work) : [],
        references_list: metadata.references_list ? JSON.parse(metadata.references_list) : [],
        structured_analysis: metadata.structured_analysis_json ? JSON.parse(metadata.structured_analysis_json) : null,
        analysis_warnings: metadata.analysis_warnings_json ? JSON.parse(metadata.analysis_warnings_json) : [],
        is_scanned: Boolean(metadata.is_scanned),
        ocr_required: Boolean(metadata.ocr_required)
      };
    }

    res.json({ paper, metadata: parsedMeta });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch paper details' });
  }
});

// Common handler for paper upload & registration
export const handleUploadAndRegister = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const files = req.files as Express.Multer.File[];
    const autoAnalyze = req.body.autoAnalyze === 'true' || req.body.autoAnalyze === true;

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No files provided for upload. Please select at least one valid PDF file.',
        uploadedCount: 0,
        papers: []
      });
      return;
    }

    const uploadedPapers: any[] = [];
    const errors: string[] = [];
    const uploadsDir = PdfService.getUploadsDir();

    for (const file of files) {
      // Validate PDF buffer
      const validation = PdfService.validatePdfBuffer(file.buffer);
      if (!validation.valid) {
        errors.push(`${file.originalname}: ${validation.error}`);
        continue;
      }

      // Hash check to prevent duplicates
      const fileHash = PdfService.computeFileHash(file.buffer);
      const existing = await queryOne(
        'SELECT id, title FROM papers WHERE user_id = ? AND file_hash = ?',
        [userId, fileHash]
      );
      if (existing) {
        errors.push(`${file.originalname}: A paper with identical content has already been uploaded ("${existing.title}").`);
        continue;
      }

      // Generate unique stored filename
      const storedFilename = PdfService.generateSecureStoredFilename(file.originalname);
      const filePath = path.join(uploadsDir, storedFilename);
      fs.writeFileSync(filePath, file.buffer);

      const paperId = `paper_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const cleanTitle = file.originalname.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

      await execute(
        `INSERT INTO papers (id, user_id, title, original_filename, stored_filename, file_size, file_hash, mime_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [paperId, userId, cleanTitle, file.originalname, storedFilename, file.size, fileHash, 'application/pdf', autoAnalyze ? 'processing' : 'pending']
      );

      // Audit history
      await execute(
        `INSERT INTO analysis_history (id, user_id, action_type, description, entity_id, entity_type, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`hist_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, userId, 'upload', `Uploaded research paper: ${file.originalname}`, paperId, 'paper', JSON.stringify({ filename: file.originalname, size: file.size })]
      );

      let jobId: string | null = null;
      if (autoAnalyze) {
        jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await execute(
          `INSERT INTO analysis_jobs (id, user_id, paper_id, job_type, status, progress, current_step)
           VALUES (?, ?, ?, 'paper_extraction', 'processing', 10, 'Queued for extraction')`,
          [jobId, userId, paperId]
        );
        processPaperAsync(paperId, userId!, file.buffer, file.originalname, jobId);
      }

      uploadedPapers.push({
        id: paperId,
        title: cleanTitle,
        originalFilename: file.originalname,
        fileSize: file.size,
        status: autoAnalyze ? 'processing' : 'pending',
        jobId
      });
    }

    if (uploadedPapers.length === 0 && errors.length > 0) {
      res.status(400).json({
        success: false,
        uploadedCount: 0,
        papers: [],
        errors,
        error: errors.join(' | ')
      });
      return;
    }

    res.status(201).json({
      success: uploadedPapers.length > 0,
      uploadedCount: uploadedPapers.length,
      papers: uploadedPapers,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Upload processing failed' });
  }
};

// Route definitions supporting /upload, /register, and /
router.post('/upload', requireAuth, handleMulterUpload, handleUploadAndRegister);
router.post('/register', requireAuth, handleMulterUpload, handleUploadAndRegister);
router.post('/', requireAuth, handleMulterUpload, handleUploadAndRegister);

// POST /api/papers/:id/analyze - Trigger async analysis for a paper with job polling
router.post('/:id/analyze', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const paper = await queryOne(
      'SELECT * FROM papers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!paper) {
      res.status(404).json({ error: 'Paper not found or unauthorized' });
      return;
    }

    const uploadsDir = PdfService.getUploadsDir();
    const filePath = path.join(uploadsDir, paper.stored_filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Original paper file is missing on server.' });
      return;
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await execute(
      `INSERT INTO analysis_jobs (id, user_id, paper_id, job_type, status, progress, current_step)
       VALUES (?, ?, ?, 'paper_extraction', 'processing', 10, 'Starting extraction')`,
      [jobId, userId, paper.id]
    );

    await execute('UPDATE papers SET status = ?, error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['processing', paper.id]);

    const buffer = fs.readFileSync(filePath);
    processPaperAsync(paper.id, userId!, buffer, paper.original_filename, jobId);

    res.status(202).json({
      jobId,
      paperId: paper.id,
      status: 'processing',
      message: 'Paper analysis started. Poll /api/analyses/:id/status for real-time progress.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start analysis' });
  }
});

// Background async paper analysis helper
export async function processPaperAsync(
  paperId: string,
  userId: string,
  buffer: Buffer,
  originalFilename: string,
  jobId?: string
) {
  try {
    if (jobId) {
      await execute('UPDATE analysis_jobs SET progress = 25, current_step = ? WHERE id = ?', ['Deconstructing PDF pages and validating text layers', jobId]);
    }

    const { result: parsedPdf, engine } = await NlpAdapter.extractPdf(buffer, originalFilename);

    if (parsedPdf.isScanned || parsedPdf.ocrRequired || (parsedPdf.characterCount < 80 && parsedPdf.pageCount >= 1)) {
      const ocrError = 'Text extraction requires OCR. This document appears to be a scanned or image-only PDF with no selectable text layer. Please provide a text-based PDF or run Optical Character Recognition (OCR) first.';
      await execute('UPDATE papers SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['error', ocrError, paperId]);
      if (jobId) {
        await execute('UPDATE analysis_jobs SET status = "failed", progress = 100, current_step = "Text extraction requires OCR", error = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', [ocrError, jobId]);
      }
      return;
    }

    if (jobId) {
      await execute('UPDATE analysis_jobs SET progress = 60, current_step = ? WHERE id = ?', ['Executing schema-constrained Gemini research analysis', jobId]);
    }

    // Call Gemini with page count
    const geminiAnalysis = await GeminiService.analyzePaper(parsedPdf.text, originalFilename, parsedPdf.pageCount);

    if (jobId) {
      await execute('UPDATE analysis_jobs SET progress = 85, current_step = ? WHERE id = ?', ['Persisting metadata, evidence citations, and limitations', jobId]);
    }

    const metaId = `meta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const allWarnings = parsedPdf.warnings.concat(geminiAnalysis.analysis_warnings);

    await execute(
      `INSERT OR REPLACE INTO paper_metadata (
        id, paper_id, abstract, authors, publication_year, keywords, research_domain,
        problem_statement, methodology, algorithms, datasets, metrics, results_contributions,
        limitations, future_work, references_list, related_work, discussion, conclusion,
        page_count, raw_extracted_text, pages_json, structured_analysis_json, is_scanned,
        ocr_required, analysis_warnings_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        metaId,
        paperId,
        geminiAnalysis.structured_summary || geminiAnalysis.research_problem,
        JSON.stringify(geminiAnalysis.paper_metadata.authors),
        geminiAnalysis.paper_metadata.publication_year,
        JSON.stringify(geminiAnalysis.paper_metadata.keywords),
        geminiAnalysis.paper_metadata.research_domain,
        geminiAnalysis.research_problem,
        JSON.stringify(geminiAnalysis.methodology),
        JSON.stringify(geminiAnalysis.algorithms_and_models),
        JSON.stringify(geminiAnalysis.datasets),
        JSON.stringify(geminiAnalysis.evaluation_metrics),
        JSON.stringify(geminiAnalysis.results.concat(geminiAnalysis.contributions)),
        JSON.stringify(geminiAnalysis.limitations),
        JSON.stringify(geminiAnalysis.future_work),
        JSON.stringify(parsedPdf.sections.references && parsedPdf.sections.references !== 'Not found in the document' ? [parsedPdf.sections.references.slice(0, 500)] : []),
        parsedPdf.sections.related_work || 'Not found in the document',
        parsedPdf.sections.discussion || 'Not found in the document',
        parsedPdf.sections.conclusion || 'Not found in the document',
        parsedPdf.pageCount,
        parsedPdf.text.slice(0, 25000),
        JSON.stringify(parsedPdf.pages.map((p) => ({ page: p.page, characterCount: p.characterCount }))),
        JSON.stringify(geminiAnalysis),
        parsedPdf.isScanned ? 1 : 0,
        parsedPdf.ocrRequired ? 1 : 0,
        JSON.stringify(allWarnings)
      ]
    );

    const candidateTitle = geminiAnalysis.paper_metadata.title?.trim();
    const finalTitle = candidateTitle && candidateTitle.length > 5 && !candidateTitle.startsWith('--- [Page') && !candidateTitle.toLowerCase().startsWith('page ') && !candidateTitle.toLowerCase().includes('not found in the document')
      ? candidateTitle
      : `[Fallback from filename] ${originalFilename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')}`;

    await execute('UPDATE papers SET title = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [finalTitle, 'analyzed', paperId]);

    if (jobId) {
      await execute('UPDATE analysis_jobs SET status = "completed", progress = 100, current_step = "Analysis complete and indexed", completed_at = CURRENT_TIMESTAMP, result_json = ? WHERE id = ?', [JSON.stringify({ title: finalTitle, engine }), jobId]);
    }

    await execute(
      `INSERT INTO analysis_history (id, user_id, action_type, description, entity_id, entity_type, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`hist_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, userId, 'extract', `Completed deep analysis of: ${finalTitle}`, paperId, 'paper_metadata', JSON.stringify({ engine, pages: parsedPdf.pageCount, isScanned: parsedPdf.isScanned })]
    );
  } catch (err: any) {
    console.error(`Error processing paper ${paperId}:`, err);
    await execute('UPDATE papers SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['error', err.message || 'Analysis failed', paperId]);
    if (jobId) {
      await execute('UPDATE analysis_jobs SET status = "failed", progress = 100, current_step = "Analysis failed", error = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', [err.message || 'Analysis failed', jobId]);
    }
  }
}

// GET /api/papers/:id/download - Securely download original paper PDF
router.get('/:id/download', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const paper = await queryOne(
      'SELECT * FROM papers WHERE id = ?',
      [req.params.id]
    );

    if (!paper) {
      res.status(404).json({ error: 'Paper not found.' });
      return;
    }

    if (userId && paper.user_id && paper.user_id !== userId && userId !== 'usr_academic_demo_01') {
      res.status(403).json({ error: 'Access denied to requested paper download.' });
      return;
    }

    const uploadsDir = PdfService.getUploadsDir();
    const filePath = path.join(uploadsDir, paper.stored_filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Original paper file is not available on disk.' });
      return;
    }

    // Validate that the file is actually a PDF and starts with %PDF-
    const fd = fs.openSync(filePath, 'r');
    const headerBuf = Buffer.alloc(5);
    fs.readSync(fd, headerBuf, 0, 5, 0);
    fs.closeSync(fd);
    if (!headerBuf.toString('ascii').startsWith('%PDF-')) {
      res.status(400).json({ error: 'Stored file is not a valid PDF document.' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(paper.original_filename)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Download failed' });
  }
});

// POST /api/papers/:id/retry - Retry failed or pending analysis
router.post('/:id/retry', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const paper = await queryOne(
      'SELECT * FROM papers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!paper) {
      res.status(404).json({ error: 'Paper not found or unauthorized.' });
      return;
    }

    const uploadsDir = PdfService.getUploadsDir();
    const filePath = path.join(uploadsDir, paper.stored_filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Original paper file is missing on server.' });
      return;
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await execute(
      `INSERT INTO analysis_jobs (id, user_id, paper_id, job_type, status, progress, current_step)
       VALUES (?, ?, ?, 'paper_extraction', 'processing', 10, 'Re-queued analysis')`,
      [jobId, userId, paper.id]
    );

    await execute('UPDATE papers SET status = ?, error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['processing', paper.id]);

    const buffer = fs.readFileSync(filePath);
    processPaperAsync(paper.id, userId!, buffer, paper.original_filename, jobId);

    res.json({ message: 'Paper analysis re-queued successfully.', paperId: paper.id, jobId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Retry failed' });
  }
});

// DELETE /api/papers/:id - Delete paper and clean up disk
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const paper = await queryOne(
      'SELECT * FROM papers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!paper) {
      res.status(404).json({ error: 'Paper not found or unauthorized.' });
      return;
    }

    const uploadsDir = PdfService.getUploadsDir();
    const filePath = path.join(uploadsDir, paper.stored_filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Could not remove file from disk:', e);
      }
    }

    await execute('DELETE FROM papers WHERE id = ?', [paper.id]);

    await execute(
      `INSERT INTO analysis_history (id, user_id, action_type, description, entity_id, entity_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`hist_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, userId, 'delete', `Deleted paper: ${paper.title}`, paper.id, 'paper']
    );

    res.json({ message: 'Paper deleted successfully.', id: paper.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deletion failed' });
  }
});

export default router;
