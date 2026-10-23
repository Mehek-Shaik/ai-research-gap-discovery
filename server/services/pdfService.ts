import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFParse } from 'pdf-parse';

export interface PageTextData {
  page: number;
  text: string;
  characterCount: number;
}

export interface ExtractedSections {
  title?: string;
  abstract: string;
  introduction: string;
  related_work: string;
  methodology: string;
  results: string;
  discussion: string;
  limitations: string;
  conclusion: string;
  future_work: string;
  references: string;
}

export interface BoundedChunk {
  chunkIndex: number;
  section: string;
  startPage: number;
  endPage: number;
  text: string;
  tokenEstimate: number;
}

export interface PdfParseResult {
  text: string;
  pageCount: number;
  pages: PageTextData[];
  sections: ExtractedSections;
  characterCount: number;
  isScanned: boolean;
  ocrRequired: boolean;
  warnings: string[];
  chunks: BoundedChunk[];
}

export class PdfService {
  private static uploadsDir = process.env.STORAGE_DIR || './uploads';
  private static maxSizeBytes = (parseInt(process.env.MAX_UPLOAD_SIZE_MB || '20', 10)) * 1024 * 1024;

  public static getUploadsDir(): string {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    return this.uploadsDir;
  }

  public static validatePdfBuffer(buffer: Buffer): { valid: boolean; error?: string } {
    if (!buffer || buffer.length === 0) {
      return { valid: false, error: 'File is empty.' };
    }

    if (buffer.length > this.maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds configured limit of ${this.maxSizeBytes / (1024 * 1024)} MB.`
      };
    }

    // Validate magic bytes: PDF files start with %PDF- (0x25 0x50 0x44 0x46 0x2D)
    const header = buffer.subarray(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      return { valid: false, error: 'Invalid file signature: Not a valid PDF document.' };
    }

    return { valid: true };
  }

  public static computeFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  public static generateSecureStoredFilename(originalName: string): string {
    const sanitizedBase = path.basename(originalName).replace(/[^a-zA-Z0-9.-]/g, '_');
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}_${randomSuffix}_${sanitizedBase}`;
  }

  public static async parsePdfContent(buffer: Buffer): Promise<PdfParseResult> {
    const warnings: string[] = [];

    try {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const pageCount = textResult.total || (textResult.pages ? textResult.pages.length : 1);

      // Extract text page by page with preservation of page numbers
      const rawPages: PageTextData[] = [];
      if (textResult.pages && textResult.pages.length > 0) {
        for (const p of textResult.pages) {
          rawPages.push({
            page: p.num,
            text: p.text || '',
            characterCount: (p.text || '').length
          });
        }
      } else {
        rawPages.push({
          page: 1,
          text: textResult.text || '',
          characterCount: (textResult.text || '').length
        });
      }

      await parser.destroy();

      // Clean page text: remove repeated headers/footers, multi-column hyphenations, normalize whitespace
      const cleanedPages = this.cleanPages(rawPages);
      const totalChars = cleanedPages.reduce((acc, p) => acc + p.characterCount, 0);

      // Check for scanned or image-only PDF
      let isScanned = false;
      let ocrRequired = false;
      if (pageCount >= 1 && totalChars < 80) {
        isScanned = true;
        ocrRequired = true;
        warnings.push('Scanned or image-only PDF detected. The document contains visual pages with negligible selectable text; Optical Character Recognition (OCR) is required.');
      }

      // Reconstruct combined text with clear page boundary markers
      const fullText = cleanedPages
        .map((p) => `--- [Page ${p.page}] ---\n${p.text}`)
        .join('\n\n');

      // Detect structured academic sections
      const sections = this.extractSections(fullText);

      // Form bounded chunks for model context preservation
      const chunks = this.createBoundedChunks(cleanedPages, sections);

      return {
        text: fullText,
        pageCount,
        pages: cleanedPages,
        sections,
        characterCount: totalChars,
        isScanned,
        ocrRequired,
        warnings,
        chunks
      };
    } catch (err: any) {
      throw new Error(`Failed to parse PDF document: ${err.message || 'Corrupted or encrypted PDF'}`);
    }
  }

  /**
   * Cleans page texts:
   * 1. Detects and strips repeated headers and footers across pages.
   * 2. Unwraps hyphenated line breaks (e.g., 'trans- \nformer' -> 'transformer').
   * 3. Normalizes multiple whitespace and blank lines.
   */
  private static cleanPages(pages: PageTextData[]): PageTextData[] {
    if (pages.length === 0) return [];

    // Identify candidates for repeated headers (first line) and footers (last line)
    const headerCounts = new Map<string, number>();
    const footerCounts = new Map<string, number>();

    for (const p of pages) {
      const lines = p.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length > 2) {
        const top = lines[0].toLowerCase();
        const bottom = lines[lines.length - 1].toLowerCase();
        if (top.length < 100 && !/^\d+$/.test(top)) {
          headerCounts.set(top, (headerCounts.get(top) || 0) + 1);
        }
        if (bottom.length < 80) {
          footerCounts.set(bottom, (footerCounts.get(bottom) || 0) + 1);
        }
      }
    }

    const minRepeats = Math.max(2, Math.floor(pages.length * 0.4));
    const repeatedHeaders = new Set<string>();
    const repeatedFooters = new Set<string>();

    for (const [line, count] of headerCounts.entries()) {
      if (count >= minRepeats) repeatedHeaders.add(line);
    }
    for (const [line, count] of footerCounts.entries()) {
      if (count >= minRepeats) repeatedFooters.add(line);
    }

    return pages.map((p) => {
      let lines = p.text.split('\n');

      // Strip repeated headers/footers
      if (lines.length > 2) {
        if (repeatedHeaders.has(lines[0].trim().toLowerCase())) {
          lines.shift();
        }
        if (lines.length > 0 && repeatedFooters.has(lines[lines.length - 1].trim().toLowerCase())) {
          lines.pop();
        }
      }

      let text = lines.join('\n');

      // Unhyphenate line breaks: e.g. "approxi-\nmate" -> "approximate"
      text = text.replace(/(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)/g, '$1$2');

      // Normalize multi-whitespace
      text = text
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return {
        page: p.page,
        text,
        characterCount: text.length
      };
    });
  }

  /**
  /**
   * Robust academic title extractor ignoring header metadata, journals, and page numbers.
   */
  public static extractTitle(text: string): string | undefined {
    // Strip leading page boundary markers
    const cleanedText = text.replace(/^---\s*\[Page\s*\d+\]\s*---\s*/gm, '').trim();
    const lines = cleanedText.split(/[\n\r\t]+/).map((l) => l.trim()).filter((l) => l.length > 0);

    const skipPrefixes = [
      'arxiv:', 'doi:', 'issn', 'isbn', 'volume', 'issue', 'journal', 'proceedings',
      'ieee', 'acm', 'springer', 'elsevier', 'wiley', 'mdpi', 'frontiers', 'nature',
      'science', 'sciencedirect', 'research article', 'review article', 'original research',
      'open access', 'published:', 'received:', 'accepted:', 'page ', 'pp.', 'copyright',
      'http://', 'https://', 'www.', 'abstract', 'keywords'
    ];

    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      // Skip lines starting with title metadata or headers
      if (skipPrefixes.some((p) => lower.startsWith(p) || (p.includes(':') && lower.includes(p)))) {
        continue;
      }
      if (/^\d+$/.test(line) || /^[0-9\.\-\/\s]+$/.test(line)) {
        continue;
      }
      // Skip pure author email or affiliation lines
      if (/@|university|department|faculty|institute|college|laboratory/i.test(line)) {
        continue;
      }

      // Valid candidate title line: 12-220 characters
      if (line.length >= 12 && line.length <= 220 && /^[A-Za-z0-9"']/.test(line)) {
        let fullTitle = line;
        // Check if title continues onto the next line
        if (i + 1 < lines.length) {
          const next = lines[i + 1];
          const nextLower = next.toLowerCase();
          const isAuthorLike =
            /^(?:by\s+|author|contributor)/i.test(next) ||
            /^[A-Z][a-zA-Z\.\-']+\s+[A-Z][a-zA-Z\.\-']+(?:,\s*[A-Z][a-zA-Z\.\-']+\s+[A-Z][a-zA-Z\.\-']+)+/i.test(next) ||
            /@|university|department|faculty|institute|college|laboratory/i.test(next);

          if (
            next.length > 5 &&
            next.length < 140 &&
            !isAuthorLike &&
            !nextLower.startsWith('abstract') &&
            !nextLower.startsWith('keywords') &&
            !skipPrefixes.some((p) => nextLower.startsWith(p)) &&
            !fullTitle.endsWith('.')
          ) {
            fullTitle += ' ' + next;
          }
        }
        return fullTitle.trim().replace(/^["']|["']$/g, '');
      }
    }
    return undefined;
  }

  /**
   * Robust academic section detector supporting diverse academic formatting and section naming conventions.
   */
  public static extractSections(text: string): ExtractedSections {
    const patterns = {
      abstract: /(?:(?:^|[\n\r\t])\s*(?:abstract|summary|executive summary)\s*[:\n\r\t]+)([\s\S]*?)(?=(?:[\n\r\t]\s*(?:(?:[0-9]+[\.\s]+)?(?:introduction|keywords|background|index terms|methodology|methods|materials)|$)))/i,
      introduction: /(?:(?:^|[\n\r\t])\s*(?:(?:1[\.\s]+)?introduction|background and introduction)\s*[:\n\r\t]+)([\s\S]*?)(?=(?:[\n\r\t]\s*(?:(?:2[\.\s]+)?(?:related work|prior work|background|literature review|methodology|proposed method|methods)|(?:2\.0\s+)|$)))/i,
      related_work: /(?:(?:^|[\n\r\t])\s*(?:(?:2[\.\s]+)?(?:related work|prior work|background|literature review|state of the art))\s*[:\n\r\t]+)([\s\S]*?)(?=(?:[\n\r\t]\s*(?:(?:3[\.\s]+)?(?:methodology|methods|proposed|system model|architecture)|(?:3\.0\s+)|$)))/i,
      methodology: /(?:(?:^|[\n\r\t])\s*(?:(?:(?:3|2)[\.\s]+)?(?:methodology|proposed method|methods|materials and methods|architecture|system model|experimental setup|experimental design))\s*[:\n\r\t]+)([\s\S]*?)(?=(?:[\n\r\t]\s*(?:(?:(?:4|3)[\.\s]+)?(?:experimental|results|evaluation|experiments|performance evaluation)|(?:4\.0\s+)|$)))/i,
      results: /(?:(?:^|[\n\r\t])\s*(?:(?:(?:4|3)[\.\s]+)?(?:results and discussion|results|evaluation|experiments|performance evaluation|findings))\s*[:\n\r\t]+)([\s\S]*?)(?=(?:[\n\r\t]\s*(?:(?:(?:5|4)[\.\s]+)?(?:discussion|limitations|conclusion|future work)|(?:5\.0\s+)|$)))/i,
      discussion: /(?:(?:^|[\n\r\t])\s*(?:(?:(?:5|4)[\.\s]+)?(?:discussion|comparative analysis))\s*[:\n\r\t]+)([\s\S]*?)(?=(?:[\n\r\t]\s*(?:(?:(?:6|5)[\.\s]+)?(?:limitations|conclusion|future work)|(?:6\.0\s+)|$)))/i,
      limitations: /(?:(?:^|[\n\r\t])\s*(?:limitations|threats to validity|open challenges|shortcomings|scope and limitations|practical limitations)\s*[:\n\r\t]+)([\s\S]*?)(?=(?:[\n\r\t]\s*(?:(?:(?:7|6)[\.\s]+)?(?:future work|conclusion|references|acknowledgements)|(?:7\.0\s+)|$)))/i,
      conclusion: /(?:(?:^|[\n\r\t])\s*(?:(?:(?:[0-9]+[\.\s]+)?(?:conclusion and future work|conclusions|conclusion|concluding remarks|summary and conclusions))\s*[:\n\r\t]+))([\s\S]*?)(?=(?:[\n\r\t]\s*(?:future work|future directions|references|acknowledgements|bibliography|$)))/i,
      future_work: /(?:(?:^|[\n\r\t])\s*(?:future work|future directions|future research|promising directions|open directions|perspectives)\s*[:\n\r\t]+)([\s\S]*?)(?=(?:[\n\r\t]\s*(?:references|acknowledgements|bibliography|$)))/i,
      references: /(?:(?:^|[\n\r\t])\s*(?:references|bibliography|literature cited)\s*[:\n\r\t]+)([\s\S]*)/i
    };

    const notFound = 'Not found in the document';
    const extract = (regex: RegExp, maxLen = 3500) => {
      const match = text.match(regex);
      if (match && match[1] && match[1].trim().length > 15) {
        const cleaned = match[1].trim();
        return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '...' : cleaned;
      }
      return notFound;
    };

    const title = this.extractTitle(text);

    return {
      title,
      abstract: extract(patterns.abstract, 2000),
      introduction: extract(patterns.introduction, 2500),
      related_work: extract(patterns.related_work, 2500),
      methodology: extract(patterns.methodology, 3500),
      results: extract(patterns.results, 3500),
      discussion: extract(patterns.discussion, 2500),
      limitations: extract(patterns.limitations, 2500),
      conclusion: extract(patterns.conclusion, 2000),
      future_work: extract(patterns.future_work, 2000),
      references: extract(patterns.references, 4000)
    };
  }

  /**
   * Bounded chunking: splits long papers into manageable segments annotated with start and end pages.
   */
  private static createBoundedChunks(pages: PageTextData[], sections: ExtractedSections): BoundedChunk[] {
    const chunks: BoundedChunk[] = [];
    const MAX_CHUNK_CHARS = 4000;
    let currentChunkText = '';
    let startPage = pages[0]?.page || 1;
    let endPage = startPage;
    let chunkIndex = 1;

    for (const p of pages) {
      if ((currentChunkText.length + p.text.length) > MAX_CHUNK_CHARS && currentChunkText.length > 500) {
        chunks.push({
          chunkIndex,
          section: 'Section Slice',
          startPage,
          endPage,
          text: currentChunkText.trim(),
          tokenEstimate: Math.round(currentChunkText.length / 4)
        });
        chunkIndex++;
        currentChunkText = '';
        startPage = p.page;
      }
      currentChunkText += `\n[Page ${p.page}]\n` + p.text;
      endPage = p.page;
    }

    if (currentChunkText.trim().length > 0) {
      chunks.push({
        chunkIndex,
        section: 'Section Slice',
        startPage,
        endPage,
        text: currentChunkText.trim(),
        tokenEstimate: Math.round(currentChunkText.length / 4)
      });
    }

    return chunks;
  }
}
