export interface Paper {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  file_hash: string;
  mime_type: string;
  status: 'pending' | 'processing' | 'analyzed' | 'error';
  error_message?: string;
  research_domain?: string;
  authors?: string[];
  publication_year?: number;
  page_count?: number;
  is_scanned?: boolean;
  ocr_required?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StructuredPaperAnalysisPayload {
  paper_metadata: {
    title: string | null;
    authors: string[];
    publication_year: number | null;
    research_domain: string | null;
    keywords: string[];
  };
  research_problem: string;
  objectives: string[];
  methodology: string[];
  algorithms_and_models: string[];
  datasets: string[];
  evaluation_metrics: string[];
  results: string[];
  contributions: string[];
  limitations: string[];
  future_work: string[];
  research_questions: string[];
  structured_summary: string;
  evidence: {
    claim: string;
    category: string;
    page_number: number | null;
    supporting_excerpt: string;
    confidence: number;
    verification_status: 'verified' | 'inferred';
  }[];
  analysis_warnings: string[];
}

export interface PaperMetadata {
  id: string;
  paper_id: string;
  abstract: string;
  authors: string[];
  publication_year: number;
  keywords: string[];
  research_domain: string;
  problem_statement: string;
  methodology: string;
  algorithms: string[];
  datasets: string[];
  metrics: Record<string, string> | string[];
  results_contributions: string;
  limitations: string[];
  future_work: string[];
  references_list: string[];
  related_work?: string;
  discussion?: string;
  conclusion?: string;
  page_count: number;
  is_scanned?: boolean;
  ocr_required?: boolean;
  raw_extracted_text?: string;
  structured_analysis?: StructuredPaperAnalysisPayload | null;
  analysis_warnings?: string[];
  created_at: string;
}

export interface GapEvidence {
  id: string;
  gap_id: string;
  paper_id: string;
  paper_title?: string;
  excerpt: string;
  section_name: string;
  page_number: number;
  confidence_score: number;
  explanation: string;
  verification_status?: 'verified' | 'inferred';
}

export interface GapScoresBreakdown {
  evidence_strength: number;
  recurrence_score: number;
  cross_paper_agreement: number;
  impact_score: number;
  composite_score: number;
  formula_explanation: string;
}

export interface ScholarlyWorkItem {
  id: string;
  title: string;
  authors: string[];
  publicationYear: number | null;
  doi?: string;
  url?: string;
  citedByCount: number;
  retrievedAt: string;
  source: 'OpenAlex';
}

export interface ResearchGap {
  id: string;
  gap_id?: string;
  user_id: string;
  paper_ids?: string[];
  gap_title?: string;
  title: string;
  gap_description?: string;
  description: string;
  gap_category?: string;
  gap_type: 'Methodological' | 'Empirical' | 'Theoretical' | 'Practical/Application' | 'Benchmark & Evaluation';
  research_domain?: string;
  severity?: 'High' | 'Medium' | 'Low';
  priority: 'high' | 'medium' | 'low';
  validation_status: 'requires_review' | 'validated' | 'refuted';
  supporting_papers?: string[];
  supporting_evidence?: {
    paper_id: string;
    excerpt: string;
    section: string;
    page: number | null;
    confidence: number;
  }[];
  page_references?: (number | string)[];
  reasoning?: string;
  counterevidence?: string[];
  confidence: number;
  proposed_research_question?: string;
  suggested_methodology?: string[];
  potential_datasets?: string[];
  evaluation_metrics?: string[];
  expected_contribution?: string;
  limitations_of_this_assessment?: string[];
  scores_breakdown?: GapScoresBreakdown | null;
  literature_novelty_status?: 'Verified novel' | 'Prior art detected' | 'Novelty not verified';
  literature_references?: ScholarlyWorkItem[];
  created_at: string;
  evidence: GapEvidence[];
}

export interface Recommendation {
  id: string;
  gap_id?: string;
  gap_title?: string;
  gap_category?: string;
  gap_severity?: string;
  recommendation_title: string;
  research_question?: string;
  hypothesis?: string;
  proposed_methodology: string;
  baseline_approaches?: string[];
  experiment_plan?: string;
  expected_impact: string;
  feasibility_rating: 'High' | 'Moderate' | 'Challenging';
  required_resources?: string;
  ethical_considerations?: string;
  potential_challenges?: string;
  suggested_datasets: string[];
  evidence_excerpts?: string[];
  created_at: string;
}

export interface AnalysisHistoryItem {
  id: string;
  user_id: string;
  action_type: 'upload' | 'extract' | 'gap_discovery' | 'compare' | 'recommendation_generated' | 'delete';
  description: string;
  entity_id?: string;
  entity_type?: string;
  metadata_json?: string;
  created_at: string;
}

export interface DashboardStats {
  totalPapers: number;
  analyzedPapers: number;
  pendingPapers: number;
  errorPapers: number;
  totalGaps: number;
  validatedGaps: number;
  candidateGaps: number;
  totalRecommendations: number;
  domainBreakdown: { name: string; value: number }[];
  severityBreakdown: { name: string; value: number }[];
  recentPapers: { id: string; title: string; status: string; file_size: number; created_at: string }[];
  recentActivity: AnalysisHistoryItem[];
}

export interface ComparisonResult {
  id?: string;
  engine: 'fastapi' | 'native-adapter';
  titles: string[];
  paperIds: string[];
  similarityMatrix: number[][];
  commonKeywords: string[];
  divergencePoints: string[];
  recurringLimitations?: string[];
  comparisonTable: {
    id: string;
    title: string;
    algorithms: string[];
    datasets: string[];
    metrics: Record<string, string> | any;
    limitations: string[];
  }[];
}

export interface AnalysisJobStatus {
  jobId: string;
  paperId?: string;
  jobType: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface LiteratureCheckResult {
  verified: boolean;
  status: 'Verified novel' | 'Prior art detected' | 'Novelty not verified';
  query: string;
  totalWorksFound: number;
  works: ScholarlyWorkItem[];
  retrievalTimestamp: string;
  attribution: string;
  notes: string;
}

export interface SystemStatus {
  environment: {
    nodeVersion: string;
    platform: string;
    serverTime: string;
  };
  database: {
    engine: string;
    filePath: string;
    fileSizeBytes: number;
    status: string;
    records: {
      papers: number;
      gaps: number;
      recommendations: number;
    };
  };
  geminiAi: {
    sdk: string;
    model: string;
    keyConfigured: boolean;
    status: string;
  };
  nlpMicroservice: {
    fastapiOnline: boolean;
    fastapiUrl: string;
    activeEngine: 'fastapi' | 'native-adapter';
    details: string;
  };
  storage: {
    directory: string;
    fileCount: number;
    maxUploadMb: number;
  };
}

export interface ResearchProposal {
  id: string;
  user_id: string;
  gap_id?: string;
  gap_title?: string;
  title: string;
  problem_statement: string;
  motivation: string;
  objectives: string[];
  research_questions: string[];
  hypothesis?: string;
  proposed_methodology: string;
  candidate_datasets: string[];
  baselines_and_metrics: string[];
  experimental_plan: Array<{ phase: string; description: string; duration?: string }> | string;
  expected_contribution: string;
  feasibility_and_resources: string;
  ethical_considerations: string;
  limitations_and_future_work: string;
  supporting_literature: string[];
  status: 'draft' | 'under_review' | 'finalized';
  created_at: string;
  updated_at: string;
}

export interface LandscapeNode {
  id: string;
  label: string;
  type: 'paper' | 'domain' | 'method' | 'dataset' | 'limitation' | 'gap';
  details?: string;
  category?: string;
  parentId?: string;
  paperId?: string;
  gapId?: string;
  severity?: string;
}

export interface LandscapeLink {
  source: string;
  target: string;
  relation: string;
  weight?: number;
}

export interface LandscapeGraphData {
  nodes: LandscapeNode[];
  links: LandscapeLink[];
  stats: {
    totalPapers: number;
    totalMethods: number;
    totalDatasets: number;
    totalLimitations: number;
    totalGaps: number;
  };
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

