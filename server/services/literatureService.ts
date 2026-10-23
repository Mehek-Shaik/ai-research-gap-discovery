export interface ScholarlyWork {
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

export interface LiteratureCheckResult {
  verified: boolean;
  status: 'Verified novel' | 'Prior art detected' | 'Novelty not verified';
  query: string;
  totalWorksFound: number;
  works: ScholarlyWork[];
  retrievalTimestamp: string;
  attribution: string;
  notes: string;
}

export class LiteratureService {
  private static cache = new Map<string, { timestamp: number; result: LiteratureCheckResult }>();
  private static CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

  /**
   * Search OpenAlex API for scholarly works matching the research gap query.
   * Uses OpenAlex public polite pool with mailto attribution header.
   */
  public static async verifyBroaderLiterature(queryText: string): Promise<LiteratureCheckResult> {
    const cleanQuery = queryText.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().slice(0, 150);
    const now = new Date().toISOString();

    if (!cleanQuery) {
      return {
        verified: false,
        status: 'Novelty not verified',
        query: queryText,
        totalWorksFound: 0,
        works: [],
        retrievalTimestamp: now,
        attribution: 'OpenAlex Scholarly API',
        notes: 'Query is empty or could not be formulated.'
      };
    }

    // Check cache
    const cached = this.cache.get(cleanQuery);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
      return cached.result;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const url = `https://api.openalex.org/works?search=${encodeURIComponent(cleanQuery)}&per-page=5&select=id,doi,title,publication_year,authorships,primary_location,cited_by_count`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ResearchGapDiscoveryPlatform/1.0 (mailto:academic-research-gap@univ.edu)'
        }
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          verified: false,
          status: 'Novelty not verified',
          query: cleanQuery,
          totalWorksFound: 0,
          works: [],
          retrievalTimestamp: now,
          attribution: 'OpenAlex Scholarly API',
          notes: `Scholarly API responded with HTTP status ${res.status}.`
        };
      }

      const data = await res.json();
      const count = data.meta?.count || 0;
      const results: any[] = data.results || [];

      const works: ScholarlyWork[] = results.map((item: any) => ({
        id: item.id || '',
        title: item.title || 'Untitled Work',
        authors: (item.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean),
        publicationYear: item.publication_year || null,
        doi: item.doi || undefined,
        url: item.primary_location?.landing_page_url || item.doi || undefined,
        citedByCount: item.cited_by_count || 0,
        retrievedAt: now,
        source: 'OpenAlex'
      }));

      // If related works exist with identical exact phrases, prior art may exist
      const status = count > 15 ? 'Prior art detected' : 'Verified novel';
      const result: LiteratureCheckResult = {
        verified: true,
        status,
        query: cleanQuery,
        totalWorksFound: count,
        works,
        retrievalTimestamp: now,
        attribution: 'Data provided by OpenAlex (CC0 Public Domain)',
        notes: count > 15
          ? `Found ${count} related indexed publications in external literature; prior art requires review.`
          : `Found only ${count} related publications in global literature. The candidate gap exhibits high potential novelty.`
      };

      this.cache.set(cleanQuery, { timestamp: Date.now(), result });
      return result;
    } catch (err: any) {
      return {
        verified: false,
        status: 'Novelty not verified',
        query: cleanQuery,
        totalWorksFound: 0,
        works: [],
        retrievalTimestamp: now,
        attribution: 'OpenAlex Scholarly API',
        notes: `External scholarly verification unreachable (${err.message || 'Network timeout'}). Novelty not verified.`
      };
    }
  }
}
