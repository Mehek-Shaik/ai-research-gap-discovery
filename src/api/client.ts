import {
  DashboardStats,
  Paper,
  PaperMetadata,
  ResearchGap,
  Recommendation,
  AnalysisHistoryItem,
  ComparisonResult,
  SystemStatus,
  AnalysisJobStatus,
  LiteratureCheckResult,
  ResearchProposal,
  LandscapeGraphData,
  User,
  AuthResponse
} from '../types/index.ts';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...init, headers });
}

/**
 * Safely parses responses and detects non-JSON or HTML content before JSON decoding.
 * Guarantees that HTML error documents or 404/500 pages do not produce:
 * "Unexpected token '<', '<!doctype '... is not valid JSON"
 */
export async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json') || contentType.includes('+json');

  if (isJson) {
    let data: any;
    try {
      data = await res.json();
    } catch (parseErr: any) {
      throw new Error(`Failed to parse server JSON response (HTTP ${res.status}): ${parseErr.message}`);
    }

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      throw new Error(data.error || 'Authentication required or session expired. Please log in.');
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || `${fallbackError} (HTTP ${res.status})`);
    }
    return data as T;
  }

  // Handle unexpected non-JSON response (e.g. HTML fallback page, proxy error)
  const rawText = await res.text();
  let snippet = rawText.trim();
  if (snippet.includes('<html') || snippet.includes('<!doctype') || snippet.includes('<!DOCTYPE')) {
    const preMatch = snippet.match(/<pre>([\s\S]*?)<\/pre>/i);
    const titleMatch = snippet.match(/<title>([\s\S]*?)<\/title>/i);
    if (preMatch && preMatch[1]) {
      snippet = preMatch[1].replace(/<[^>]*>/g, '').trim();
    } else if (titleMatch && titleMatch[1]) {
      snippet = `Server Error Page: ${titleMatch[1].trim()}`;
    } else {
      snippet = 'Server returned an HTML document instead of JSON';
    }
  }

  const cleanSnippet = snippet.replace(/\s+/g, ' ').slice(0, 140);
  throw new Error(
    `API call received unexpected non-JSON response (HTTP ${res.status}, ${contentType || 'no content-type'}): ${cleanSnippet || fallbackError}`
  );
}

export const api = {
  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse<AuthResponse>(res, 'Login failed');
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(fullName: string, email: string, password: string, role = 'researcher'): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password, role })
    });
    const data = await handleResponse<AuthResponse>(res, 'Registration failed');
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  async getCurrentUser(): Promise<User | null> {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const res = await authFetch(`${API_BASE}/auth/me`);
      const data = await handleResponse<{ user: User }>(res, 'Failed to fetch current user');
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return data.user;
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      return null;
    }
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Stats
  async getStats(): Promise<DashboardStats> {
    const res = await authFetch(`${API_BASE}/analysis/stats`);
    return handleResponse<DashboardStats>(res, 'Failed to fetch dashboard stats');
  },

  // Papers
  async getPapers(): Promise<Paper[]> {
    const res = await authFetch(`${API_BASE}/papers`);
    const data = await handleResponse<{ papers: Paper[] }>(res, 'Failed to fetch papers');
    return data.papers;
  },

  async getPaper(id: string): Promise<{ paper: Paper; metadata: PaperMetadata | null }> {
    const res = await authFetch(`${API_BASE}/papers/${id}`);
    return handleResponse<{ paper: Paper; metadata: PaperMetadata | null }>(res, 'Failed to fetch paper details');
  },

  async uploadPapers(formData: FormData): Promise<{ success: boolean; uploadedCount: number; papers: any[]; errors?: string[] }> {
    const res = await authFetch(`${API_BASE}/papers/upload`, {
      method: 'POST',
      body: formData
    });
    return handleResponse<{ success: boolean; uploadedCount: number; papers: any[]; errors?: string[] }>(res, 'Failed to upload papers');
  },

  async registerPapers(formData: FormData): Promise<{ success: boolean; uploadedCount: number; papers: any[]; errors?: string[] }> {
    return this.uploadPapers(formData);
  },

  async deletePaper(id: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/papers/${id}`, { method: 'DELETE' });
    await handleResponse<{ success?: boolean }>(res, 'Failed to delete paper');
  },

  async retryPaper(id: string): Promise<{ message: string; paperId: string; jobId?: string }> {
    const res = await authFetch(`${API_BASE}/papers/${id}/retry`, { method: 'POST' });
    return handleResponse<{ message: string; paperId: string; jobId?: string }>(res, 'Failed to re-queue paper analysis');
  },

  getDownloadUrl(id: string): string {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? `${API_BASE}/papers/${id}/download?token=${encodeURIComponent(token)}` : `${API_BASE}/papers/${id}/download`;
  },

  // Analysis & Job Polling
  async startPaperAnalysis(paperId: string): Promise<{ jobId: string; paperId: string; status: string; message: string }> {
    const res = await authFetch(`${API_BASE}/papers/${paperId}/analyze`, { method: 'POST' });
    return handleResponse<{ jobId: string; paperId: string; status: string; message: string }>(res, 'Failed to trigger paper analysis');
  },

  async extractPaper(paperId: string): Promise<{ jobId: string; paperId: string; status: string; message: string }> {
    return this.startPaperAnalysis(paperId);
  },

  async getJobStatus(jobId: string): Promise<AnalysisJobStatus> {
    const res = await authFetch(`${API_BASE}/analyses/${jobId}/status`);
    return handleResponse<AnalysisJobStatus>(res, 'Failed to poll analysis job status');
  },

  async getAnalysis(id: string): Promise<any> {
    const res = await authFetch(`${API_BASE}/analyses/${id}`);
    return handleResponse<any>(res, 'Failed to fetch analysis details');
  },

  // Research Gaps
  async discoverGaps(paperIds?: string[]): Promise<{ success: boolean; gapsFound: number; gaps: ResearchGap[] }> {
    const res = await authFetch(`${API_BASE}/analysis/gaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperIds })
    });
    return handleResponse<{ success: boolean; gapsFound: number; gaps: ResearchGap[] }>(res, 'Gap discovery failed');
  },

  async getGaps(): Promise<ResearchGap[]> {
    const res = await authFetch(`${API_BASE}/analysis/gaps`);
    const data = await handleResponse<{ gaps: ResearchGap[] }>(res, 'Failed to fetch research gaps');
    return data.gaps;
  },

  async getGap(id: string): Promise<{ gap: ResearchGap }> {
    const res = await authFetch(`${API_BASE}/analysis/gaps/${id}`);
    return handleResponse<{ gap: ResearchGap }>(res, 'Failed to fetch gap details');
  },

  async updateGapStatus(id: string, status: 'requires_review' | 'validated' | 'refuted' | 'Candidate' | 'Validated' | 'Refuted'): Promise<void> {
    const res = await authFetch(`${API_BASE}/analysis/gaps/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    await handleResponse<{ success?: boolean }>(res, 'Failed to update gap status');
  },

  // Literature Novelty Verification (OpenAlex API)
  async verifyLiterature(queryText: string): Promise<LiteratureCheckResult> {
    const res = await authFetch(`${API_BASE}/analysis/literature/verify?query=${encodeURIComponent(queryText)}`);
    return handleResponse<LiteratureCheckResult>(res, 'Literature verification failed');
  },

  // Recommendations
  async generateRecommendations(gapId: string): Promise<{ success: boolean; recommendations: Recommendation[] }> {
    const res = await authFetch(`${API_BASE}/analysis/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gapId })
    });
    return handleResponse<{ success: boolean; recommendations: Recommendation[] }>(res, 'Failed to generate recommendations');
  },

  async getRecommendations(): Promise<Recommendation[]> {
    const res = await authFetch(`${API_BASE}/analysis/recommendations`);
    const data = await handleResponse<{ recommendations: Recommendation[] }>(res, 'Failed to fetch recommendations');
    return data.recommendations;
  },

  // Comparisons
  async comparePapers(paperIds: string[]): Promise<ComparisonResult> {
    const res = await authFetch(`${API_BASE}/analysis/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperIds })
    });
    return handleResponse<ComparisonResult>(res, 'Failed to compare papers');
  },

  async getComparison(id: string): Promise<ComparisonResult> {
    const res = await authFetch(`${API_BASE}/analysis/comparisons/${id}`);
    return handleResponse<ComparisonResult>(res, 'Failed to fetch comparison');
  },

  // History & Export
  async getHistory(): Promise<AnalysisHistoryItem[]> {
    const res = await authFetch(`${API_BASE}/analysis/history`);
    const data = await handleResponse<{ history: AnalysisHistoryItem[] }>(res, 'Failed to fetch history');
    return data.history;
  },

  getExportReportUrl(format: 'json' | 'markdown' | 'html' = 'json'): string {
    const token = getAuthToken();
    return token
      ? `${API_BASE}/analysis/export/report?format=${format}&token=${encodeURIComponent(token)}`
      : `${API_BASE}/analysis/export/report?format=${format}`;
  },

  // Research Proposals Workspace
  async getProposals(): Promise<ResearchProposal[]> {
    const res = await authFetch(`${API_BASE}/analysis/proposals`);
    const data = await handleResponse<{ proposals: ResearchProposal[] }>(res, 'Failed to fetch research proposals');
    return data.proposals;
  },

  async getProposal(id: string): Promise<ResearchProposal> {
    const res = await authFetch(`${API_BASE}/analysis/proposals/${id}`);
    const data = await handleResponse<{ proposal: ResearchProposal }>(res, 'Failed to fetch research proposal');
    return data.proposal;
  },

  async generateProposalFromGap(gapId: string): Promise<{ success: boolean; proposalId: string; proposal: ResearchProposal }> {
    const res = await authFetch(`${API_BASE}/analysis/proposals/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gapId })
    });
    return handleResponse<{ success: boolean; proposalId: string; proposal: ResearchProposal }>(res, 'Failed to synthesize proposal');
  },

  saveProposal(data: Partial<ResearchProposal>): Promise<{ success: boolean; proposalId: string }> {
    return this.createProposal(data);
  },

  async createProposal(data: Partial<ResearchProposal>): Promise<{ success: boolean; proposalId: string }> {
    const res = await authFetch(`${API_BASE}/analysis/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<{ success: boolean; proposalId: string }>(res, 'Failed to save proposal');
  },

  async updateProposal(id: string, data: Partial<ResearchProposal>): Promise<void> {
    const res = await authFetch(`${API_BASE}/analysis/proposals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await handleResponse<{ success?: boolean }>(res, 'Failed to update proposal');
  },

  async deleteProposal(id: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/analysis/proposals/${id}`, { method: 'DELETE' });
    await handleResponse<{ success?: boolean }>(res, 'Failed to delete proposal');
  },

  // Research Landscape Visualization
  async getLandscapeData(): Promise<LandscapeGraphData> {
    const res = await authFetch(`${API_BASE}/analysis/landscape`);
    return handleResponse<LandscapeGraphData>(res, 'Failed to fetch research landscape');
  },

  getLandscape(): Promise<LandscapeGraphData> {
    return this.getLandscapeData();
  },

  // System Diagnostics
  async getSystemStatus(): Promise<SystemStatus> {
    const res = await authFetch(`${API_BASE}/system/status`);
    return handleResponse<SystemStatus>(res, 'Failed to fetch system status');
  },

  async resetDemo(): Promise<void> {
    const res = await authFetch(`${API_BASE}/system/reset-demo`, { method: 'POST' });
    await handleResponse<{ success?: boolean }>(res, 'Failed to reset demo dataset');
  }
};
