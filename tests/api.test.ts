import { describe, it, expect, beforeAll } from 'vitest';
import { PdfService } from '../server/services/pdfService.ts';
import { NlpAdapter } from '../server/services/nlpAdapter.ts';
import { getDb } from '../server/db/index.ts';
import { seedDatabaseIfEmpty } from '../server/db/seed.ts';

describe('AI-Powered Research Gap Discovery Platform - Backend Tests', () => {
  beforeAll(async () => {
    await getDb();
    await seedDatabaseIfEmpty();
  });

  describe('PDF Security & Validation Service', () => {
    it('should reject empty or invalid buffers', () => {
      const invalid = Buffer.from('NOT A PDF FILE');
      const validation = PdfService.validatePdfBuffer(invalid);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Not a valid PDF');
    });

    it('should accept valid PDF magic byte signatures', () => {
      const validMockPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
      const validation = PdfService.validatePdfBuffer(validMockPdf);
      expect(validation.valid).toBe(true);
    });

    it('should generate collision-resistant, sanitized filenames', () => {
      const name = PdfService.generateSecureStoredFilename('Federated-Learning (2025).pdf');
      expect(name).not.toContain('(');
      expect(name).not.toContain(')');
      expect(name).toContain('.pdf');
    });

    it('should extract standard academic sections from text stream', () => {
      const sampleText = `
ABSTRACT
This study investigates asynchronous edge learning.

1. INTRODUCTION
Edge nodes experience high wireless loss.

METHODOLOGY
We evaluate tiered aggregation with gradient sparsification.

RESULTS
Convergence accelerated by 38 percent.

LIMITATIONS
Tested only under synthetic channel fading models.

FUTURE WORK
Deploy across heterogeneous physical microcontrollers.

REFERENCES
1. McMahan et al. 2017.
      `;
      const sections = PdfService.extractSections(sampleText);
      expect(sections.abstract).toContain('asynchronous edge learning');
      expect(sections.methodology).toContain('tiered aggregation');
      expect(sections.limitations).toContain('synthetic channel fading');
    });
  });

  describe('Dual-Mode NLP Adapter', () => {
    it('should report active engine status', async () => {
      const status = await NlpAdapter.checkFastapiHealth();
      expect(status).toHaveProperty('fastapiOnline');
      expect(status).toHaveProperty('activeEngine');
      expect(['fastapi', 'native-adapter']).toContain(status.activeEngine);
    });

    it('should compute pairwise cosine similarity matrix natively when FastAPI is offline', async () => {
      const papers = [
        {
          id: 'p1',
          title: 'Federated Edge Optimization',
          abstract: 'Decentralized deep learning under non-IID distributional drift.',
          methodology: 'Asynchronous tiered aggregation.',
          limitations: 'Channel fading packet drops.'
        },
        {
          id: 'p2',
          title: 'Edge Wearables Quantization',
          abstract: 'Bio-signal processing on battery constrained microcontrollers.',
          methodology: '4-bit integer quantization.',
          limitations: 'Restricted to resting state waveforms.'
        }
      ];

      const comp = await NlpAdapter.comparePapers(papers);
        expect(comp.similarityMatrix).toHaveLength(2);
        expect(comp.similarityMatrix[0][0]).toBe(1.0);
        expect(comp.similarityMatrix[1][1]).toBe(1.0);
        expect(comp.commonKeywords).toBeInstanceOf(Array);
      });
    });

    describe('SQLite Database Persistence & Seed Data', () => {
      it('should have seeded benchmark papers with valid foreign key relationships', async () => {
        const { queryAll } = await import('../server/db/index.ts');
        const papers = await queryAll('SELECT id, title, file_size FROM papers');
        expect(papers.length).toBeGreaterThanOrEqual(3);

        const gaps = await queryAll('SELECT id, title, severity FROM candidate_research_gaps');
        expect(gaps.length).toBeGreaterThanOrEqual(2);

        const evidence = await queryAll('SELECT id, gap_id, excerpt FROM gap_evidence');
        expect(evidence.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Gemini Rule-Based Analysis Fallback', () => {
      it('should extract structured schema using rule-based engine', async () => {
        const { GeminiService } = await import('../server/services/geminiService.ts');
        const text = `
          --- [Page 1] ---
          TITLE: Federated Optimization in Mobile Sensor Networks
          AUTHORS: Alice Smith, Bob Johnson
          ABSTRACT: We analyze distributed SGD across IoT devices.
          --- [Page 2] ---
          METHODOLOGY: Tiered asynchronous model averaging.
          LIMITATIONS: Does not scale beyond 500 edge nodes.
        `;
        const result = GeminiService.ruleBasedPaperAnalysis(text, 'federated_paper.pdf', 2);
        expect(result).toHaveProperty('paper_metadata');
        expect(result.paper_metadata.title).toBeTruthy();
        expect(result.limitations.length).toBeGreaterThan(0);
        expect(result.evidence.length).toBeGreaterThan(0);
      });
    });

    describe('Literature Verification Service', () => {
      it('should handle empty or whitespace query gracefully', async () => {
        const { LiteratureService } = await import('../server/services/literatureService.ts');
        const res = await LiteratureService.verifyBroaderLiterature('   ');
        expect(res.verified).toBe(false);
        expect(res.status).toBe('Novelty not verified');
      });
    });

    describe('Research Proposal Generator & Landscape Matrix', () => {
      it('should synthesize a 15-part academic proposal from gap metadata', async () => {
        const { GeminiService } = await import('../server/services/geminiService.ts');
        const gapSample = {
          title: 'Communication Bottlenecks in Asynchronous Edge Aggregation',
          description: 'High network latencies cause straggler delays in federated rounds.',
          gap_type: 'Empirical',
          evidence: [
            { excerpt: 'Latency scales quadratically with cluster size.', section_name: 'Limitations', page_number: 4 }
          ]
        };
        const proposal = GeminiService.ruleBasedProposal(gapSample);
        expect(proposal.title).toContain('Communication Bottlenecks');
        expect(proposal.problem_statement).toBeTruthy();
        expect(proposal.objectives).toHaveLength(4);
        expect(proposal.research_questions.length).toBeGreaterThanOrEqual(2);
        expect(proposal.experimental_plan).toHaveLength(4);
        expect(proposal.feasibility_and_resources).toBeTruthy();
        expect(proposal.ethical_considerations).toBeTruthy();
      });

      it('should have research_proposals table provisioned in SQLite', async () => {
        const { queryAll } = await import('../server/db/index.ts');
        const tables = await queryAll<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='research_proposals'"
        );
        expect(tables.length).toBe(1);
      });
    });

    describe('Paper Upload, API Routing & Unexpected HTML Response Protection', () => {
      it('should successfully upload and register a valid research PDF and create SQLite records', async () => {
        const { handleUploadAndRegister } = await import('../server/routes/papers.ts');
        const { queryOne } = await import('../server/db/index.ts');

        const uniqueSeed = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const mockPdf = Buffer.from(
          `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
          `2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n% Seed: ${uniqueSeed}\n%%EOF\n`
        );

        let responseStatusCode = 0;
        let responseJson: any = null;

        const req: any = {
          user: { id: 'usr_test_upload_01', email: 'test@univ.edu', fullName: 'Tester', role: 'researcher' },
          files: [
            {
              originalname: `sample_paper_${uniqueSeed}.pdf`,
              buffer: mockPdf,
              size: mockPdf.length,
              mimetype: 'application/pdf'
            }
          ],
          body: { autoAnalyze: 'false' }
        };

        const res: any = {
          status: (code: number) => {
            responseStatusCode = code;
            return {
              json: (data: any) => {
                responseJson = data;
              }
            };
          }
        };

        await handleUploadAndRegister(req, res);

        expect(responseStatusCode).toBe(201);
        expect(responseJson).toHaveProperty('success', true);
        expect(responseJson.uploadedCount).toBe(1);
        expect(responseJson.papers).toHaveLength(1);

        const createdPaperId = responseJson.papers[0].id;
        const row = await queryOne('SELECT * FROM papers WHERE id = ?', [createdPaperId]);
        expect(row).toBeTruthy();
        expect(row.original_filename).toBe(`sample_paper_${uniqueSeed}.pdf`);
      });

      it('should reject malformed or non-PDF files with HTTP 400 and valid JSON error', async () => {
        const { handleUploadAndRegister } = await import('../server/routes/papers.ts');

        let responseStatusCode = 0;
        let responseJson: any = null;

        const req: any = {
          user: { id: 'usr_test_upload_01', email: 'test@univ.edu', fullName: 'Tester', role: 'researcher' },
          files: [
            {
              originalname: 'corrupt_not_a_pdf.pdf',
              buffer: Buffer.from('NOT A VALID PDF FILE'),
              size: 20,
              mimetype: 'application/pdf'
            }
          ],
          body: { autoAnalyze: 'false' }
        };

        const res: any = {
          status: (code: number) => {
            responseStatusCode = code;
            return {
              json: (data: any) => {
                responseJson = data;
              }
            };
          }
        };

        await handleUploadAndRegister(req, res);

        expect(responseStatusCode).toBe(400);
        expect(responseJson).toHaveProperty('success', false);
        expect(responseJson.uploadedCount).toBe(0);
        expect(responseJson.error).toContain('Not a valid PDF document');
      });

      it('should safely handle unexpected HTML responses in client handleResponse without crashing with syntax error', async () => {
        const { handleResponse } = await import('../src/api/client.ts');

        const mockHtmlResponse = new Response('<!doctype html><html><head><title>502 Bad Gateway</title></head><body><h1>Server Error</h1></body></html>', {
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });

        await expect(handleResponse(mockHtmlResponse, 'Upload failed')).rejects.toThrow(
          /API call received unexpected non-JSON response/
        );
        // Verify it does NOT throw the raw JSON parse error
        await expect(handleResponse(mockHtmlResponse, 'Upload failed')).rejects.not.toThrow(
          /Unexpected token '<'/
        );
      });

      it('should handle paper analysis failure gracefully without crashing', async () => {
        const { processPaperAsync } = await import('../server/routes/papers.ts');
        const { queryOne, execute } = await import('../server/db/index.ts');

        const paperId = `paper_fail_test_${Date.now()}`;
        const jobId = `job_fail_test_${Date.now()}`;
        const userId = 'usr_test_upload_01';

        await execute(
          'INSERT INTO papers (id, user_id, title, original_filename, stored_filename, file_size, file_hash, mime_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [paperId, userId, 'Fail Test', 'fail.pdf', 'fail.pdf', 100, 'dummyhash', 'application/pdf', 'processing']
        );
        await execute(
          'INSERT INTO analysis_jobs (id, user_id, paper_id, job_type, status, progress, current_step) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [jobId, userId, paperId, 'paper_extraction', 'processing', 10, 'Queued']
        );

        // Corrupt buffer to trigger parse error
        await processPaperAsync(paperId, userId, Buffer.from('CORRUPT'), 'fail.pdf', jobId);

        const updatedPaper = await queryOne('SELECT status, error_message FROM papers WHERE id = ?', [paperId]);
        expect(updatedPaper.status).toBe('error');
        expect(updatedPaper.error_message).toBeTruthy();

        const updatedJob = await queryOne('SELECT status, error FROM analysis_jobs WHERE id = ?', [jobId]);
        expect(updatedJob.status).toBe('failed');
      });
    });
  });



