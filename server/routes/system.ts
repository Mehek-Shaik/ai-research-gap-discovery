import { Router, Response } from 'express';
import fs from 'fs';
import { AuthenticatedRequest, requireAuth } from '../services/authService.ts';
import { GeminiService } from '../services/geminiService.ts';
import { NlpAdapter } from '../services/nlpAdapter.ts';
import { queryOne, execute } from '../db/index.ts';
import { seedDatabaseIfEmpty } from '../db/seed.ts';

const router = Router();

// GET /api/system/status - Full health check and viva diagnostics
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dbPath = process.env.DATABASE_PATH || './data/research_platform.sqlite';
    const dbExists = fs.existsSync(dbPath);
    let dbSize = 0;
    if (dbExists) {
      dbSize = fs.statSync(dbPath).size;
    }

    const uploadsDir = process.env.STORAGE_DIR || './uploads';
    let uploadsCount = 0;
    if (fs.existsSync(uploadsDir)) {
      uploadsCount = fs.readdirSync(uploadsDir).length;
    }

    const nlpStatus = await NlpAdapter.checkFastapiHealth();
    const geminiConfigured = GeminiService.isConfigured();

    const counts = await queryOne<{ papers: number; gaps: number; recs: number }>(`
      SELECT
        (SELECT COUNT(*) FROM papers) as papers,
        (SELECT COUNT(*) FROM candidate_research_gaps) as gaps,
        (SELECT COUNT(*) FROM recommendations) as recs
    `);

    res.json({
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        serverTime: new Date().toISOString()
      },
      database: {
        engine: 'SQLite (WebAssembly sql.js with ACID disk persistence)',
        filePath: dbPath,
        fileSizeBytes: dbSize,
        status: dbExists ? 'healthy' : 'initializing',
        records: {
          papers: counts?.papers || 0,
          gaps: counts?.gaps || 0,
          recommendations: counts?.recs || 0
        }
      },
      geminiAi: {
        sdk: '@google/genai (Official SDK)',
        model: GeminiService.getModel(),
        keyConfigured: geminiConfigured,
        status: geminiConfigured ? 'Operational' : 'Fallback Rule-Based Mode Active'
      },
      nlpMicroservice: nlpStatus,
      storage: {
        directory: uploadsDir,
        fileCount: uploadsCount,
        maxUploadMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '20', 10)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to inspect system status' });
  }
});

// POST /api/system/reset-demo - Reset database to clean synthetic benchmark dataset
router.post('/reset-demo', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await execute('DELETE FROM analysis_history');
    await execute('DELETE FROM recommendations');
    await execute('DELETE FROM gap_evidence');
    await execute('DELETE FROM candidate_research_gaps');
    await execute('DELETE FROM analysis_jobs');
    await execute('DELETE FROM paper_metadata');
    await execute('DELETE FROM papers');
    await execute('DELETE FROM users');

    await seedDatabaseIfEmpty();

    res.json({ message: 'Synthetic benchmark demonstration dataset restored successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Reset failed' });
  }
});

export default router;
