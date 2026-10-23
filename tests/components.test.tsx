import { describe, it, expect } from 'vitest';
import { api } from '../src/api/client.ts';

describe('Frontend API Client & Formatting Helpers', () => {
  it('should expose API methods for all 9 dashboard operations plus authentication', () => {
    expect(typeof api.getStats).toBe('function');
    expect(typeof api.getPapers).toBe('function');
    expect(typeof api.getPaper).toBe('function');
    expect(typeof api.uploadPapers).toBe('function');
    expect(typeof api.deletePaper).toBe('function');
    expect(typeof api.retryPaper).toBe('function');
    expect(typeof api.getDownloadUrl).toBe('function');
    expect(typeof api.extractPaper).toBe('function');
    expect(typeof api.discoverGaps).toBe('function');
    expect(typeof api.getGaps).toBe('function');
    expect(typeof api.updateGapStatus).toBe('function');
    expect(typeof api.generateRecommendations).toBe('function');
    expect(typeof api.getRecommendations).toBe('function');
    expect(typeof api.comparePapers).toBe('function');
    expect(typeof api.getHistory).toBe('function');
    expect(typeof api.getSystemStatus).toBe('function');
    expect(typeof api.resetDemo).toBe('function');
    expect(typeof api.getProposals).toBe('function');
    expect(typeof api.createProposal).toBe('function');
    expect(typeof api.updateProposal).toBe('function');
    expect(typeof api.deleteProposal).toBe('function');
    expect(typeof api.generateProposalFromGap).toBe('function');
    expect(typeof api.getLandscape).toBe('function');
    expect(typeof api.login).toBe('function');
    expect(typeof api.register).toBe('function');
    expect(typeof api.getCurrentUser).toBe('function');
    expect(typeof api.logout).toBe('function');
  });

  it('should generate valid download URLs with id parameter', () => {
    const url = api.getDownloadUrl('paper_test_123');
    expect(url).toBe('/api/papers/paper_test_123/download');
  });

  it('should ensure search inputs maintain dark background and light text in dark mode', async () => {
    const fs = await import('fs');
    const libraryCode = fs.readFileSync('src/pages/LibraryPage.tsx', 'utf-8');
    const gapsCode = fs.readFileSync('src/pages/GapsPage.tsx', 'utf-8');
    const cssCode = fs.readFileSync('src/index.css', 'utf-8');

    // Library page search input checks
    expect(libraryCode).toContain('dark:focus:bg-slate-800');
    expect(libraryCode).toContain('dark:focus:text-white');
    expect(libraryCode).toContain('dark:text-slate-100');
    expect(libraryCode).toContain('dark:placeholder-slate-400');
    expect(libraryCode).not.toMatch(/focus:bg-white(?![^>]*dark:focus:bg-)/);

    // Gaps page search input checks
    expect(gapsCode).toContain('dark:focus:bg-slate-800');
    expect(gapsCode).toContain('dark:focus:text-white');

    // CSS autofill and color-scheme checks
    expect(cssCode).toContain('color-scheme: dark');
    expect(cssCode).toContain('-webkit-autofill');
  });

  it('should enforce backend route protection with HTTP 401 when unauthenticated', async () => {
    const { requireAuth } = await import('../server/services/authService.ts');

    let statusCode = 0;
    let jsonResult: any = null;
    let nextCalled = false;

    const unauthReq: any = {
      headers: {},
      query: {}
    };

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            jsonResult = data;
          }
        };
      }
    };

    const next = () => {
      nextCalled = true;
    };

    await requireAuth(unauthReq, res, next);
    expect(statusCode).toBe(401);
    expect(jsonResult.error).toContain('Authentication required');
    expect(nextCalled).toBe(false);
  });

  it('should allow authenticated access with valid JWT token', async () => {
    const { AuthService, requireAuth } = await import('../server/services/authService.ts');
    const { getDb } = await import('../server/db/index.ts');
    await getDb();

    // Register a test user
    const testEmail = `reviewer_${Date.now()}@academic.edu`;
    const regResult = await AuthService.register(testEmail, 'validpass123', 'Prof. Evaluation Reviewer');
    expect(regResult.token).toBeTruthy();
    expect(regResult.user.email).toBe(testEmail);

    let nextCalled = false;
    const authReq: any = {
      headers: { authorization: `Bearer ${regResult.token}` },
      query: {}
    };
    const res: any = {};
    const next = () => {
      nextCalled = true;
    };

    await requireAuth(authReq, res, next);
    expect(nextCalled).toBe(true);
    expect(authReq.user.email).toBe(testEmail);
  });

  it('should verify Home, Login, and Registration pages exist and contain critical UX elements', async () => {
    const fs = await import('fs');
    const homeCode = fs.readFileSync('src/pages/HomePage.tsx', 'utf-8');
    const loginCode = fs.readFileSync('src/pages/LoginPage.tsx', 'utf-8');
    const regCode = fs.readFileSync('src/pages/RegisterPage.tsx', 'utf-8');
    const appCode = fs.readFileSync('src/App.tsx', 'utf-8');

    // Home Page
    expect(homeCode).toContain('AI-Powered Research Gap Discovery Platform');
    expect(homeCode).toContain('How the Discovery Pipeline Works');
    expect(homeCode).toContain('Specialized Research Modules');
    expect(homeCode).toContain('About the Final-Year Engineering Project');
    expect(homeCode).not.toContain('PDF deconstructed');
    expect(homeCode).not.toContain('Zero data loss');
    expect(homeCode).not.toContain('Schema-grounded');
    expect(homeCode).not.toContain('Gemini AI & SQLite ACID Architecture');
    expect(homeCode).not.toContain('Port 3000 Active');

    // Login Page
    expect(loginCode).toContain('Sign in to your research workspace');
    expect(loginCode).toContain('academic123');
    expect(loginCode).toContain('researcher@univ.edu');

    // Register Page
    expect(regCode).toContain('Create an academic research account');
    expect(regCode).toContain('confirmPassword');

    // App routes
    expect(appCode).toContain('AuthProvider');
    expect(appCode).toContain('ProtectedRoute');
    expect(appCode).toContain('/dashboard');
  });
});

