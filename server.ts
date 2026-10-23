import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRoutes from './server/routes/auth.ts';
import paperRoutes from './server/routes/papers.ts';
import analysisRoutes from './server/routes/analysis.ts';
import systemRoutes from './server/routes/system.ts';
import { getDb } from './server/db/index.ts';
import { seedDatabaseIfEmpty } from './server/db/seed.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Mount REST APIs
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/system', systemRoutes);

// Direct paper registration and upload aliases
app.use('/api/upload', paperRoutes);
app.use('/api/register-papers', paperRoutes);
app.use('/api/register', (req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    paperRoutes(req, res, next);
  } else {
    authRoutes(req, res, next);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AI-Powered Research Gap Discovery Platform'
  });
});

// Strict JSON 404 catch-all for any unhandled /api/* routes (prevents Vite HTML fallback for APIs)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.path}`,
    status: 404,
    path: req.path
  });
});

// Global API error handler ensuring all backend errors return valid JSON with appropriate HTTP status codes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.status || err.statusCode || 500;
  let errorMessage = err.message || 'Internal Server Error';

  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorMessage = `File size exceeds the limit of ${process.env.MAX_UPLOAD_SIZE_MB || '20'} MB.`;
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      errorMessage = 'Too many files uploaded in a single batch (maximum 10).';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      errorMessage = `Unexpected file field "${err.field}". Please submit files using "files" or "file".`;
    }
  }

  if (req.path.startsWith('/api') || req.headers.accept?.includes('application/json')) {
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      status: statusCode,
      code: err.code || err.name || 'ERROR'
    });
    return;
  }

  next(err);
});

async function startServer() {
  // Initialize SQLite database and seed initial synthetic data if empty
  try {
    await getDb();
    await seedDatabaseIfEmpty();
    console.log('Database initialized and ready.');
  } catch (err) {
    console.error('Database initialization error:', err);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite dev middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
