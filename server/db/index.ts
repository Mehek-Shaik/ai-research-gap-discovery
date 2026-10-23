import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { INITIAL_MIGRATION } from './migrations.ts';

let dbInstance: Database | null = null;
const dbFilePath = process.env.DATABASE_PATH || './data/research_platform.sqlite';

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure data directory exists
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(dbFilePath);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Failed to load existing SQLite file, creating fresh database:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  // Run migrations
  dbInstance.run(INITIAL_MIGRATION);
  applyIncrementalMigrations(dbInstance);
  saveDb();

  return dbInstance;
}

function applyIncrementalMigrations(db: Database) {
  const safeAddColumns = [
    { table: 'paper_metadata', column: 'related_work', type: 'TEXT' },
    { table: 'paper_metadata', column: 'discussion', type: 'TEXT' },
    { table: 'paper_metadata', column: 'conclusion', type: 'TEXT' },
    { table: 'paper_metadata', column: 'pages_json', type: 'TEXT' },
    { table: 'paper_metadata', column: 'structured_analysis_json', type: 'TEXT' },
    { table: 'paper_metadata', column: 'is_scanned', type: 'INTEGER DEFAULT 0' },
    { table: 'paper_metadata', column: 'ocr_required', type: 'INTEGER DEFAULT 0' },
    { table: 'paper_metadata', column: 'analysis_warnings_json', type: 'TEXT' },
    { table: 'analysis_jobs', column: 'current_step', type: 'TEXT' },
    { table: 'analysis_jobs', column: 'result_json', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'gap_id', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'title', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'description', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'gap_type', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'priority', type: 'TEXT DEFAULT "medium"' },
    { table: 'candidate_research_gaps', column: 'research_domain', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'supporting_papers', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'supporting_evidence', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'page_references', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'reasoning', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'counterevidence', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'confidence', type: 'REAL DEFAULT 0.85' },
    { table: 'candidate_research_gaps', column: 'proposed_research_question', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'suggested_methodology', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'potential_datasets', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'evaluation_metrics', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'expected_contribution', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'limitations_of_this_assessment', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'scores_breakdown', type: 'TEXT' },
    { table: 'candidate_research_gaps', column: 'literature_novelty_status', type: 'TEXT DEFAULT "Novelty not verified"' },
    { table: 'candidate_research_gaps', column: 'literature_references', type: 'TEXT' },
    { table: 'gap_evidence', column: 'verification_status', type: 'TEXT DEFAULT "verified"' },
    { table: 'recommendations', column: 'research_question', type: 'TEXT' },
    { table: 'recommendations', column: 'hypothesis', type: 'TEXT' },
    { table: 'recommendations', column: 'experiment_plan', type: 'TEXT' },
    { table: 'recommendations', column: 'required_resources', type: 'TEXT' },
    { table: 'recommendations', column: 'ethical_considerations', type: 'TEXT' },
    { table: 'recommendations', column: 'evidence_excerpts', type: 'TEXT' }
  ];

  for (const { table, column, type } of safeAddColumns) {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
    } catch {
      // Column already exists or table not yet created
    }
  }

  // Ensure comparisons table exists
  try {
    db.run(`CREATE TABLE IF NOT EXISTS paper_comparisons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      paper_ids TEXT NOT NULL,
      comparison_result_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);
  } catch {}

  // Ensure research_proposals table exists
  try {
    db.run(`CREATE TABLE IF NOT EXISTS research_proposals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      gap_id TEXT,
      gap_title TEXT,
      title TEXT NOT NULL,
      problem_statement TEXT NOT NULL,
      motivation TEXT,
      objectives TEXT,
      research_questions TEXT,
      hypothesis TEXT,
      proposed_methodology TEXT,
      candidate_datasets TEXT,
      baselines_and_metrics TEXT,
      experimental_plan TEXT,
      expected_contribution TEXT,
      feasibility_and_resources TEXT,
      ethical_considerations TEXT,
      limitations_and_future_work TEXT,
      supporting_literature TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (gap_id) REFERENCES candidate_research_gaps(id) ON DELETE SET NULL
    );`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_proposals_user ON research_proposals(user_id);`);
  } catch {}
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

export async function query<T = any>(sqlQuery: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sqlQuery);
  const results: T[] = [];
  try {
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
  } finally {
    stmt.free();
  }
  return results;
}

export const queryAll = query;

export async function queryOne<T = any>(sqlQuery: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sqlQuery, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sqlQuery: string, params: any[] = []): Promise<{ changes: number }> {
  const db = await getDb();
  if (params.length > 0) {
    const stmt = db.prepare(sqlQuery);
    try {
      stmt.run(params);
    } finally {
      stmt.free();
    }
  } else {
    db.run(sqlQuery);
  }
  saveDb();
  return { changes: db.getRowsModified() };
}
