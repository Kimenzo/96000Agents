/**
 * EVO Intelligence Layer — EvoScorer
 *
 * Three-dimensional scoring system for findings:
 *   - Relevance (0.35 weight) — How pertinent is the finding to the agent's domain?
 *   - Novelty   (0.45 weight) — Does this add genuinely new information?
 *   - Coherence (0.20 weight) — Is the finding internally consistent and well-formed?
 *
 * EVO: The weights are intentionally tilted toward novelty. In a 96,000-agent
 * system, redundancy is the enemy. We want agents that contribute NEW knowledge,
 * not agents that restate what's already known.
 */

import type { EvoLLM, Finding, ScoredFinding, FindingType } from '../core/types.js';

// ─── Config ───────────────────────────────────────────────────────────────────

export interface EvoScorerConfig {
  weights: {
    relevance: number;
    novelty: number;
    coherence: number;
  };
  /** Use LLM for scoring (true) or heuristic only (false). */
  useLLMScoring: boolean;
}

export const DEFAULT_SCORER_CONFIG: EvoScorerConfig = {
  weights: {
    relevance: 0.35,
    novelty: 0.45,
    coherence: 0.20,
  },
  useLLMScoring: true,
};

// ─── EvoScorer ────────────────────────────────────────────────────────────────

export class EvoScorer {
  private llm: EvoLLM;
  private config: EvoScorerConfig;

  /** Cache of recently seen content hashes for novelty detection. */
  private contentHashCache: Set<string> = new Set();
  private readonly maxCacheSize = 50_000;

  constructor(deps: {
    llm: EvoLLM;
    config?: Partial<EvoScorerConfig>;
  }) {
    this.llm = deps.llm;
    this.config = {
      ...DEFAULT_SCORER_CONFIG,
      ...deps.config,
      weights: { ...DEFAULT_SCORER_CONFIG.weights, ...deps.config?.weights },
    };
  }

  // ── Main Scoring ──────────────────────────────────────────────────────────

  /**
   * Score a finding on all three dimensions and return a ScoredFinding.
   */
  async score(finding: Finding, domainContext?: string): Promise<ScoredFinding> {
    let relevanceScore: number;
    let noveltyScore: number;
    let coherenceScore: number;

    if (this.config.useLLMScoring) {
      const scores = await this.scoreLLM(finding, domainContext);
      relevanceScore = scores.relevance;
      noveltyScore = scores.novelty;
      coherenceScore = scores.coherence;
    } else {
      relevanceScore = this.heuristicRelevance(finding, domainContext);
      noveltyScore = this.heuristicNovelty(finding);
      coherenceScore = this.heuristicCoherence(finding);
    }

    const w = this.config.weights;
    const compositeScore =
      relevanceScore * w.relevance +
      noveltyScore * w.novelty +
      coherenceScore * w.coherence;

    return {
      ...finding,
      relevanceScore,
      noveltyScore,
      coherenceScore,
      compositeScore,
    };
  }

  /**
   * Score a batch of findings.
   */
  async scoreBatch(
    findings: Finding[],
    domainContext?: string,
  ): Promise<ScoredFinding[]> {
    const results: ScoredFinding[] = [];
    for (const finding of findings) {
      const scored = await this.score(finding, domainContext);
      results.push(scored);
    }
    return results;
  }

  // ── LLM Scoring ──────────────────────────────────────────────────────────

  private async scoreLLM(
    finding: Finding,
    domainContext?: string,
  ): Promise<{ relevance: number; novelty: number; coherence: number }> {
    const prompt = [
      `Score the following research finding on three dimensions (0.0-1.0 each).`,
      '',
      `Finding type: ${finding.type}`,
      `Content: ${finding.content.slice(0, 500)}`,
      `Domain: ${finding.domainTag ?? 'unspecified'}`,
      domainContext ? `Domain context: ${domainContext}` : '',
      '',
      `Dimensions:`,
      `1. RELEVANCE — How pertinent is this to its stated domain?`,
      `2. NOVELTY — Does this provide genuinely new, non-obvious information?`,
      `3. COHERENCE — Is this internally consistent and well-structured?`,
      '',
      `Respond in this exact JSON format:`,
      `{"relevance": 0.0, "novelty": 0.0, "coherence": 0.0}`,
    ].join('\n');

    try {
      const response = await this.llm.generate(prompt);
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) return this.fallbackScores(finding, domainContext);

      const parsed = JSON.parse(jsonMatch[0]) as {
        relevance?: number;
        novelty?: number;
        coherence?: number;
      };

      return {
        relevance: clamp(parsed.relevance ?? 0.5),
        novelty: clamp(parsed.novelty ?? 0.5),
        coherence: clamp(parsed.coherence ?? 0.5),
      };
    } catch {
      return this.fallbackScores(finding, domainContext);
    }
  }

  private fallbackScores(
    finding: Finding,
    domainContext?: string,
  ): { relevance: number; novelty: number; coherence: number } {
    return {
      relevance: this.heuristicRelevance(finding, domainContext),
      novelty: this.heuristicNovelty(finding),
      coherence: this.heuristicCoherence(finding),
    };
  }

  // ── Heuristic Scoring ─────────────────────────────────────────────────────

  /**
   * EVO: Heuristic relevance — keyword overlap between finding and domain.
   */
  private heuristicRelevance(finding: Finding, domainContext?: string): number {
    if (!domainContext || !finding.domainTag) return 0.5;

    const findingWords = new Set(
      finding.content.toLowerCase().split(/\s+/).filter(w => w.length > 3),
    );
    const domainWords = domainContext.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    if (domainWords.length === 0) return 0.5;

    let overlap = 0;
    for (const word of domainWords) {
      if (findingWords.has(word)) overlap++;
    }

    return Math.min(1, overlap / Math.max(1, domainWords.length) * 2);
  }

  /**
   * EVO: Heuristic novelty — check content hash cache for duplicates.
   * Penalize findings that are very similar to what we've seen before.
   */
  private heuristicNovelty(finding: Finding): number {
    const hash = this.simpleHash(finding.content);

    if (this.contentHashCache.has(hash)) {
      return 0.1; // near-duplicate
    }

    // Add to cache
    if (this.contentHashCache.size >= this.maxCacheSize) {
      // Evict oldest (convert to array, remove first 10%)
      const entries = Array.from(this.contentHashCache);
      const toRemove = Math.floor(entries.length * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.contentHashCache.delete(entries[i]!);
      }
    }
    this.contentHashCache.add(hash);

    // Type-based novelty bonus
    const typeBonus: Record<FindingType, number> = {
      CROSS_DOMAIN_RESONANCE: 0.9,
      NOVEL_PATTERN: 0.8,
      ANOMALY: 0.7,
      CONTRADICTION: 0.6,
      CONFIRMED_HYPOTHESIS: 0.4,
    };

    return typeBonus[finding.type] ?? 0.5;
  }

  /**
   * EVO: Heuristic coherence — basic structural quality checks.
   */
  private heuristicCoherence(finding: Finding): number {
    const content = finding.content;
    let score = 0.5;

    // Length check — not too short, not too long
    if (content.length > 50 && content.length < 5000) score += 0.15;
    else if (content.length < 10 || content.length > 20000) score -= 0.2;

    // Sentence structure — has multiple sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
    if (sentences.length >= 2) score += 0.1;
    if (sentences.length >= 4) score += 0.1;

    // Has evidence references
    if (finding.evidenceBase && finding.evidenceBase.length > 0) score += 0.15;

    return clamp(score);
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  /**
   * EVO: Fast non-cryptographic hash for content deduplication.
   * djb2 variant.
   */
  private simpleHash(str: string): string {
    let hash = 5381;
    const normalized = str.toLowerCase().trim().replace(/\s+/g, ' ');
    for (let i = 0; i < normalized.length; i++) {
      hash = ((hash << 5) + hash + normalized.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  }

  clearCache(): void {
    this.contentHashCache.clear();
  }

  get cacheSize(): number {
    return this.contentHashCache.size;
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}
