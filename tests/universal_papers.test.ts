import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PdfService } from '../server/services/pdfService.ts';
import { GeminiService } from '../server/services/geminiService.ts';
import { handleUploadAndRegister, processPaperAsync } from '../server/routes/papers.ts';
import { getDb, queryOne, queryAll, execute } from '../server/db/index.ts';

// Helper to create genuine, valid PDF buffers with extractable multiline text streams
// Helper to create genuine, valid PDF buffers with extractable multiline text streams
function createPdfBuffer(textContent: string): Buffer {
  const clean = textContent.replace(/[\(\)]/g, ' ');
  const rawLines = clean.split('\n').filter((l) => l.trim().length > 0);
  
  // Wrap lines to <= 60 characters so PDF viewers/parsers do not clip text outside media box
  const lines: string[] = [];
  for (const line of rawLines) {
    if (line.length <= 60) {
      lines.push(line);
    } else {
      const words = line.split(' ');
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).trim().length <= 60) {
          cur = (cur + ' ' + w).trim();
        } else {
          if (cur) lines.push(cur);
          cur = w;
        }
      }
      if (cur) lines.push(cur);
    }
  }

  let stream = 'BT /F1 10 Tf 14 TL 40 750 Td ';
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) stream += 'T* ';
    stream += '(' + lines[i] + ') Tj ';
  }
  stream += 'ET';

  const parts = [
    '%PDF-1.4\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`
  ];

  const offsets = [0];
  let currentOffset = parts[0].length;
  for (let i = 1; i <= 4; i++) {
    offsets.push(currentOffset);
    currentOffset += parts[i].length;
  }

  const startXref = currentOffset;
  let xref = 'xref\n0 5\n0000000000 65535 f \n';
  for (let i = 1; i <= 4; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  const trailer = `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(parts.join('') + xref + trailer, 'utf-8');
}


// Helper to create a scanned/image-only PDF with zero selectable text
function createScannedPdfBuffer(): Buffer {
  const stream = '% Scanned image bitmap without character text layer\nq 100 0 0 100 50 700 cm /Im1 Do Q';
  const len = stream.length;
  const uniqueSeed = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const pdf =
    '%PDF-1.4\n' +
    '1 0 obj\n' +
    '<< /Type /Catalog /Pages 2 0 R >>\n' +
    'endobj\n' +
    '2 0 obj\n' +
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n' +
    'endobj\n' +
    '3 0 obj\n' +
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\n' +
    'endobj\n' +
    '4 0 obj\n' +
    '<< /Length ' + len + ' >>\n' +
    'stream\n' +
    stream + '\n' +
    'endstream\n' +
    'endobj\n' +
    `% Seed: ${uniqueSeed}\n` +
    'xref\n' +
    '0 5\n' +
    '0000000000 65535 f \n' +
    '0000000009 00000 n \n' +
    '0000000058 00000 n \n' +
    '0000000115 00000 n \n' +
    '0000000220 00000 n \n' +
    'trailer\n' +
    '<< /Size 5 /Root 1 0 R >>\n' +
    'startxref\n' +
    '300\n' +
    '%%EOF\n';

  return Buffer.from(pdf, 'utf-8');
}

describe('Universal Multi-Domain PDF Processing & Isolation Regression Suite', () => {
  let testUserId: string;

  beforeAll(async () => {
    await getDb();
    testUserId = `usr_univ_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  });

  // 1. Plant Disease Review Paper
  it('should accurately extract metadata, domain, and limitations from a Plant Disease review paper', async () => {
    const plantPaperText = [
      'A Comprehensive Review of Tomato Leaf Disease Detection Using Deep Convolutional Neural Networks',
      'Elena Rostova, Carlos Mendez, David Thorne',
      'Published: 2023, Journal of Agricultural Informatics',
      'ABSTRACT',
      'Tomato crops worldwide suffer from severe fungal and bacterial pathogens including early blight and leaf mold. In this review, we examine the deployment of deep convolutional neural networks for automated field diagnosis.',
      'METHODOLOGY',
      'We evaluated ResNet-50 and YOLOv8 architectures across controlled laboratory and open greenhouse environments. The dataset consists of PlantVillage and field-collected specimens.',
      'RESULTS',
      'ResNet-50 achieved an accuracy of 96.4 percent under uniform illumination.',
      'LIMITATIONS',
      'Evaluations were restricted to isolated single-leaf images with plain backgrounds, failing to generalize under dense canopy occlusions.',
      'FUTURE WORK',
      'Future research must investigate multi-spectral drone sensing and edge deployment on agricultural robotics.',
      'REFERENCES',
      '1. Hughes et al. PlantVillage dataset 2015.'
    ].join('\n');

    const pdfBuf = createPdfBuffer(plantPaperText);
    const parsed = await PdfService.parsePdfContent(pdfBuf);
    expect(parsed.characterCount).toBeGreaterThan(100);
    expect(parsed.isScanned).toBe(false);

    const analysis = GeminiService.ruleBasedPaperAnalysis(parsed.text, 'tomato_disease_review.pdf', parsed.pageCount);

    expect(analysis.paper_metadata.title).toBe(
      'A Comprehensive Review of Tomato Leaf Disease Detection Using Deep Convolutional Neural Networks'
    );
    expect(analysis.paper_metadata.authors).toEqual(['Elena Rostova', 'Carlos Mendez', 'David Thorne']);
    expect(analysis.paper_metadata.publication_year).toBe(2023);
    expect(analysis.paper_metadata.research_domain).toBe('Agricultural Sciences & Plant Pathology');
    expect(analysis.datasets).toContain('PlantVillage');
    expect(analysis.algorithms_and_models).toContain('ResNet-50');
    expect(analysis.limitations.some((l) => l.toLowerCase().includes('canopy occlusions'))).toBe(true);
    expect(analysis.future_work.some((fw) => fw.toLowerCase().includes('drone'))).toBe(true);
  });

  // 2. Paper from a completely different research domain (Quantum Astrophysics / Physics)
  it('should accurately extract metadata, domain, and limitations from a Quantum Physics paper without domain cross-contamination', async () => {
    const quantumPaperText = [
      'Decoherence Dynamics in Superconducting Transmon Qubits Under Cryogenic Noise',
      'Kenji Takahashi, Sarah Al-Mansoor',
      'Accepted: 2024, Physical Review Quantum',
      'ABSTRACT',
      'Superconducting transmon architectures face severe decoherence caused by two-level system defects at cryogenic temperatures. We investigate magnetic flux noise mitigation.',
      'METHODOLOGY',
      'We performed Ramsey fringe measurements and quantum state tomography on a 7-qubit superconducting transmon processor.',
      'RESULTS',
      'Coherence time T1 reached 142 microseconds using tantalum resonators.',
      'LIMITATIONS',
      'Cryogenic dilution refrigerator cooling capacity limits scaling beyond 100 physical qubits.',
      'FUTURE WORK',
      'We plan to test 3D topological waveguides and error-mitigated surface codes.',
      'REFERENCES',
      '1. Koch et al. Transmon qubits 2007.'
    ].join('\n');

    const pdfBuf = createPdfBuffer(quantumPaperText);
    const parsed = await PdfService.parsePdfContent(pdfBuf);
    const analysis = GeminiService.ruleBasedPaperAnalysis(parsed.text, 'transmon_decoherence.pdf', parsed.pageCount);

    expect(analysis.paper_metadata.title).toBe(
      'Decoherence Dynamics in Superconducting Transmon Qubits Under Cryogenic Noise'
    );
    expect(analysis.paper_metadata.authors).toEqual(['Kenji Takahashi', 'Sarah Al-Mansoor']);
    expect(analysis.paper_metadata.publication_year).toBe(2024);
    expect(analysis.paper_metadata.research_domain).toBe('Physics & Astronomy');
    expect(analysis.limitations.some((l) => l.toLowerCase().includes('dilution refrigerator'))).toBe(true);
    // Ensure no contamination from agriculture/telehealth
    expect(analysis.datasets).not.toContain('PlantVillage');
    expect(analysis.algorithms_and_models).not.toContain('ResNet-50');
  });

  // 3. PDF with missing metadata or no abstract
  it('should honestly report unsupported fields as "Not found in the document" when metadata is absent', async () => {
    const rawNoteText = [
      'Technical Laboratory Report on Acoustic Resonance Testing',
      'We set up microphone arrays in an anechoic chamber to observe resonant frequencies.',
      'Signal amplitudes were recorded between 20 Hz and 20 kHz.'
    ].join('\n');

    const pdfBuf = createPdfBuffer(rawNoteText);
    const parsed = await PdfService.parsePdfContent(pdfBuf);
    const analysis = GeminiService.ruleBasedPaperAnalysis(parsed.text, 'acoustic_notes.pdf', parsed.pageCount);

    expect(analysis.paper_metadata.authors).toHaveLength(0);
    expect(analysis.paper_metadata.publication_year).toBeNull();
    expect(analysis.structured_summary).toBeTruthy();
    expect(analysis.limitations).toHaveLength(0);
    expect(analysis.future_work).toHaveLength(0);
  });

  // 4. Malformed PDF rejection
  it('should reject malformed non-PDF files with HTTP 400 and clear JSON error message', async () => {
    let statusCode = 0;
    let jsonResponse: any = null;

    const req: any = {
      user: { id: testUserId, role: 'researcher' },
      files: [
        {
          originalname: 'corrupt_document.pdf',
          buffer: Buffer.from('NOT A VALID PDF FILE AT ALL'),
          size: 28,
          mimetype: 'application/pdf'
        }
      ],
      body: { autoAnalyze: 'false' }
    };

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return { json: (d: any) => { jsonResponse = d; } };
      }
    };

    await handleUploadAndRegister(req, res);

    expect(statusCode).toBe(400);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toContain('Not a valid PDF document');
  });

  // 5. Scanned / Image-Only PDF detection (OCR Required, never false Analyzed)
  it('should detect scanned image-only PDFs and report that OCR is required rather than producing a false Analyzed status', async () => {
    const scannedBuf = createScannedPdfBuffer();
    const paperId = `paper_scanned_${Date.now()}`;
    const jobId = `job_scanned_${Date.now()}`;

    await execute(
      'INSERT INTO papers (id, user_id, title, original_filename, stored_filename, file_size, file_hash, mime_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [paperId, testUserId, 'Scanned Document', 'scan.pdf', 'scan.pdf', scannedBuf.length, `scanned_hash_${Date.now()}`, 'application/pdf', 'processing']
    );

    await execute(
      'INSERT INTO analysis_jobs (id, user_id, paper_id, job_type, status, progress, current_step) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [jobId, testUserId, paperId, 'paper_extraction', 'processing', 10, 'Extracting']
    );

    await processPaperAsync(paperId, testUserId, scannedBuf, 'scan.pdf', jobId);

    const paperRow = await queryOne('SELECT status, error_message FROM papers WHERE id = ?', [paperId]);
    expect(paperRow.status).toBe('error');
    expect(paperRow.error_message).toContain('Text extraction requires OCR');
    expect(paperRow.status).not.toBe('analyzed');

    const jobRow = await queryOne('SELECT status, current_step FROM analysis_jobs WHERE id = ?', [jobId]);
    expect(jobRow.status).toBe('failed');
    expect(jobRow.current_step).toContain('OCR');
  });

  // 6. Two different papers uploaded together in one batch
  it('should upload two distinct papers in one batch with strict multi-paper isolation and download integrity', async () => {
    const plantText = [
      'Field Evaluation of Deep Neural Networks for Foliage Disease Detection',
      'Maria Gomez, Liam Patel',
      'Published: 2023, Phytopathology Informatics',
      'ABSTRACT',
      'Early detection of foliage blight in solanaceous crops is vital for agricultural yield.',
      'METHODOLOGY',
      'We trained MobileNetV3 and YOLOv5 on 12,000 leaf images.',
      'LIMITATIONS',
      'Evaluations were restricted to dry weather conditions; droplet specular reflections degrade accuracy.',
      'FUTURE WORK',
      'Multi-spectral cameras must be benchmarked under simulated rain conditions.',
      'REFERENCES',
      '1. Gomez et al. 2023.'
    ].join('\n');

    const chemistryText = [
      'Catalytic Hydrogenation of Carbon Dioxide Using Heterogeneous Ruthenium Complexes',
      'Hans Richter, Chen Wei',
      'Published: 2024, Journal of Molecular Catalysis',
      'ABSTRACT',
      'Direct conversion of carbon dioxide to methanol requires high-selectivity heterogeneous catalysts.',
      'METHODOLOGY',
      'We synthesized ruthenium nanoparticles anchored on silica supports.',
      'LIMITATIONS',
      'Catalyst deactivation occurs after 48 hours of continuous operation due to carbon fouling.',
      'FUTURE WORK',
      'Regeneration protocols using supercritical solvents will be tested.',
      'REFERENCES',
      '1. Richter et al. 2024.'
    ].join('\n');

    const plantBuf = createPdfBuffer(plantText);
    const chemBuf = createPdfBuffer(chemistryText);

    let statusCode = 0;
    let jsonResponse: any = null;

    const batchUserId = `usr_batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const req: any = {
      user: { id: batchUserId, role: 'researcher' },
      files: [
        {
          originalname: `plant_disease_foliage_${Date.now()}.pdf`,
          buffer: plantBuf,
          size: plantBuf.length,
          mimetype: 'application/pdf'
        },
        {
          originalname: `ruthenium_catalysis_${Date.now()}.pdf`,
          buffer: chemBuf,
          size: chemBuf.length,
          mimetype: 'application/pdf'
        }
      ],
      body: { autoAnalyze: 'false' }
    };

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return { json: (d: any) => { jsonResponse = d; } };
      }
    };

    await handleUploadAndRegister(req, res);

    expect(statusCode).toBe(201);
    expect(jsonResponse.uploadedCount).toBe(2);
    expect(jsonResponse.papers).toHaveLength(2);

    const p1Id = jsonResponse.papers[0].id;
    const p2Id = jsonResponse.papers[1].id;
    expect(p1Id).not.toBe(p2Id);

    // Process both asynchronously and verify isolation
    await processPaperAsync(p1Id, batchUserId, plantBuf, req.files[0].originalname);
    await processPaperAsync(p2Id, batchUserId, chemBuf, req.files[1].originalname);

    const p1Row = await queryOne('SELECT * FROM papers WHERE id = ?', [p1Id]);
    const p2Row = await queryOne('SELECT * FROM papers WHERE id = ?', [p2Id]);
    expect(p1Row.status).toBe('analyzed');
    expect(p2Row.status).toBe('analyzed');

    const p1Meta = await queryOne('SELECT * FROM paper_metadata WHERE paper_id = ?', [p1Id]);
    const p2Meta = await queryOne('SELECT * FROM paper_metadata WHERE paper_id = ?', [p2Id]);

    // Verify paper 1 attributes
    expect(p1Meta.research_domain).toMatch(/Agricultural|Phytopathology|Plant/i);
    expect(p1Meta.limitations).toContain('specular reflections');
    expect(p1Meta.algorithms).toContain('MobileNetV3');

    // Verify paper 2 attributes
    expect(p2Meta.research_domain).toMatch(/Chemical|Catalysis|Materials/i);
    expect(p2Meta.limitations).toContain('carbon fouling');
    expect(p2Meta.algorithms).not.toContain('MobileNetV3');

    // Verify isolation: Paper 1 contains NO chemistry text, Paper 2 contains NO plant text
    expect(p1Meta.limitations).not.toContain('carbon fouling');
    expect(p2Meta.limitations).not.toContain('specular reflections');

    // Verify downloaded file matches original uploaded PDF buffer
    const uploadsDir = PdfService.getUploadsDir();
    const diskP1Buf = fs.readFileSync(path.join(uploadsDir, p1Row.stored_filename));
    const diskP2Buf = fs.readFileSync(path.join(uploadsDir, p2Row.stored_filename));
    expect(diskP1Buf.equals(plantBuf)).toBe(true);
    expect(diskP2Buf.equals(chemBuf)).toBe(true);

    // Verify Research Gap Discovery between the two papers
    const papersForGap = [
      {
        id: p1Id,
        title: p1Row.title,
        abstract: p1Meta.abstract,
        methodology: p1Meta.methodology,
        limitations: JSON.parse(p1Meta.limitations),
        futureWork: JSON.parse(p1Meta.future_work),
        datasets: JSON.parse(p1Meta.datasets),
        algorithms: JSON.parse(p1Meta.algorithms)
      },
      {
        id: p2Id,
        title: p2Row.title,
        abstract: p2Meta.abstract,
        methodology: p2Meta.methodology,
        limitations: JSON.parse(p2Meta.limitations),
        futureWork: JSON.parse(p2Meta.future_work),
        datasets: JSON.parse(p2Meta.datasets),
        algorithms: JSON.parse(p2Meta.algorithms)
      }
    ];

    const discoveredGaps = GeminiService.ruleBasedGapDiscovery(papersForGap);
    expect(discoveredGaps.length).toBeGreaterThanOrEqual(1);

    const firstGap = discoveredGaps[0];
    expect(firstGap.validation_status).toBe('requires_review');
    expect(firstGap.supporting_papers).toContain(p1Id);
    expect(firstGap.supporting_papers).toContain(p2Id);
    // Supporting evidence must contain the real limitations from the two papers
    expect(firstGap.supporting_evidence.some((e) => e.excerpt.includes('specular reflections'))).toBe(true);
    expect(firstGap.supporting_evidence.some((e) => e.excerpt.includes('carbon fouling'))).toBe(true);
    // Scores breakdown formula must be populated
    expect(firstGap.scores_breakdown?.composite_score).toBeGreaterThan(0.7);
  }, 60000);
});
