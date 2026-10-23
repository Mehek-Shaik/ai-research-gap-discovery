export const INITIAL_MIGRATION = `
-- AI-Powered Research Gap Discovery Platform Database Schema
-- SQLite Migrations with Foreign Key Integrity & Indexes

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'researcher',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS paper_metadata (
  id TEXT PRIMARY KEY,
  paper_id TEXT UNIQUE NOT NULL,
  abstract TEXT,
  authors TEXT,
  publication_year INTEGER,
  keywords TEXT,
  research_domain TEXT,
  problem_statement TEXT,
  methodology TEXT,
  algorithms TEXT,
  datasets TEXT,
  metrics TEXT,
  results_contributions TEXT,
  limitations TEXT,
  future_work TEXT,
  references_list TEXT,
  related_work TEXT,
  discussion TEXT,
  conclusion TEXT,
  page_count INTEGER DEFAULT 1,
  raw_extracted_text TEXT,
  pages_json TEXT,
  structured_analysis_json TEXT,
  is_scanned INTEGER DEFAULT 0,
  ocr_required INTEGER DEFAULT 0,
  analysis_warnings_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  paper_id TEXT,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  current_step TEXT,
  error TEXT,
  result_json TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS candidate_research_gaps (
  id TEXT PRIMARY KEY,
  gap_id TEXT,
  user_id TEXT NOT NULL,
  paper_ids TEXT NOT NULL,
  gap_title TEXT NOT NULL,
  title TEXT,
  gap_description TEXT NOT NULL,
  description TEXT,
  gap_category TEXT NOT NULL,
  gap_type TEXT,
  research_domain TEXT,
  severity TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  validation_status TEXT DEFAULT 'requires_review',
  supporting_papers TEXT,
  supporting_evidence TEXT,
  page_references TEXT,
  reasoning TEXT,
  counterevidence TEXT,
  confidence REAL DEFAULT 0.85,
  proposed_research_question TEXT,
  suggested_methodology TEXT,
  potential_datasets TEXT,
  evaluation_metrics TEXT,
  expected_contribution TEXT,
  limitations_of_this_assessment TEXT,
  scores_breakdown TEXT,
  literature_novelty_status TEXT DEFAULT 'Novelty not verified',
  literature_references TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gap_evidence (
  id TEXT PRIMARY KEY,
  gap_id TEXT NOT NULL,
  paper_id TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  section_name TEXT NOT NULL,
  page_number INTEGER DEFAULT 1,
  confidence_score REAL DEFAULT 0.85,
  explanation TEXT NOT NULL,
  verification_status TEXT DEFAULT 'verified',
  FOREIGN KEY (gap_id) REFERENCES candidate_research_gaps(id) ON DELETE CASCADE,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  gap_id TEXT,
  user_id TEXT NOT NULL,
  recommendation_title TEXT NOT NULL,
  proposed_methodology TEXT NOT NULL,
  expected_impact TEXT NOT NULL,
  feasibility_rating TEXT NOT NULL,
  potential_challenges TEXT,
  suggested_datasets TEXT,
  research_question TEXT,
  hypothesis TEXT,
  experiment_plan TEXT,
  required_resources TEXT,
  ethical_considerations TEXT,
  evidence_excerpts TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (gap_id) REFERENCES candidate_research_gaps(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS paper_comparisons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  paper_ids TEXT NOT NULL,
  comparison_result_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_id TEXT,
  entity_type TEXT,
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_proposals (
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
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_papers_user ON papers(user_id);
CREATE INDEX IF NOT EXISTS idx_papers_status ON papers(status);
CREATE INDEX IF NOT EXISTS idx_metadata_paper ON paper_metadata(paper_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_gaps_user ON candidate_research_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_gap ON gap_evidence(gap_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_user ON paper_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user ON research_proposals(user_id);
`;

