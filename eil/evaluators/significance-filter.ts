/**
 * EVO Intelligence Layer — Significance Filter
 *
 * Adaptive thresholds that tighten with agent maturity. Young agents
 * get more lenient thresholds (encouraging exploration), mature agents
 * face stricter standards (demanding genuine contribution).
 *
 * EVO: This is the selective pressure mechanism. Without it, the system
 * drowns in low-quality findings. With it, only the genuinely significant
 * findings propagate upward through the hierarchy.
 *
 * Threshold curve:
 *   threshold(generation) = baseThreshold + (maxTightening * (1 - e^(-generation / halfLife)))
 *
 * This gives an exponential approach to the maximum threshold.
 */

import type { ScoredFinding, EvoAgentMeta, EvoConfig } from '../core/types.js';

// ─── Config ───────────────────────────────────────────────────────────────────

export interface SignificanceFilterConfig {
  /** Base threshold for brand-new agents (generation 0). */
  baseThreshold: number;
  /** Maximum additional tightening at full maturity. */
  maxTightening: number;
  /** Generations at which half of maxTightening is applied. */
  halfLife: number;
  /** Override threshold for each finding type (optional). */
  typeOverrides?: Partial<Record<string, number>>;
}

export const DEFAULT_SIGNIFICANCE_CONFIG: SignificanceFilterConfig = {
  baseThreshold: 0.35,
  maxTightening: 0.35,
  halfLife: 10,
};

// ─── Significance Filter ──────────────────────────────────────────────────────

export class SignificanceFilter {
  private config: SignificanceFilterConfig;

  constructor(config?: Partial<SignificanceFilterConfig>) {
    this.config = { ...DEFAULT_SIGNIFICANCE_CONFIG, ...config };
  }

  // ── Threshold Computation ─────────────────────────────────────────────────

  /**
   * EVO: Compute the adaptive threshold for a given agent.
   * Uses an exponential saturation curve based on generation count.
   */
  computeThreshold(agentMeta: EvoAgentMeta): number {
    const gen = agentMeta.generationCount;
    const base = this.config.baseThreshold;
    const maxT = this.config.maxTightening;
    const hl = this.config.halfLife;

    // Exponential saturation: threshold = base + maxT * (1 - e^(-gen / halfLife))
    const maturityFactor = 1 - Math.exp(-gen / hl);
    return base + maxT * maturityFactor;
  }

  /**
   * Compute threshold with optional type-specific override.
   */
  computeThresholdForType(
    agentMeta: EvoAgentMeta,
    findingType: string,
  ): number {
    const baseThreshold = this.computeThreshold(agentMeta);

    // Check for type-specific overrides
    const override = this.config.typeOverrides?.[findingType];
    if (override !== undefined) {
      return override;
    }

    // EVO: Cross-domain resonances get a LOWER threshold (easier to pass)
    // because they are inherently rare and valuable
    if (findingType === 'CROSS_DOMAIN_RESONANCE') {
      return baseThreshold * 0.8;
    }

    // Confirmed hypotheses get a HIGHER threshold (harder to pass)
    // because confirmation alone has diminishing value
    if (findingType === 'CONFIRMED_HYPOTHESIS') {
      return baseThreshold * 1.15;
    }

    return baseThreshold;
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  /**
   * EVO: Apply the significance filter to a single finding.
   * Returns true if the finding passes the threshold.
   */
  isSignificant(finding: ScoredFinding, agentMeta: EvoAgentMeta): boolean {
    const threshold = this.computeThresholdForType(agentMeta, finding.type);
    return finding.compositeScore >= threshold;
  }

  /**
   * Filter a batch of findings, returning only the significant ones.
   */
  filterBatch(
    findings: ScoredFinding[],
    agentMetaMap: Map<string, EvoAgentMeta>,
  ): ScoredFinding[] {
    return findings.filter(finding => {
      const meta = agentMetaMap.get(finding.agentId);
      if (!meta) {
        // Unknown agent — apply base threshold only
        return finding.compositeScore >= this.config.baseThreshold;
      }
      return this.isSignificant(finding, meta);
    });
  }

  /**
   * Partition findings into significant and filtered-out groups.
   */
  partition(
    findings: ScoredFinding[],
    agentMetaMap: Map<string, EvoAgentMeta>,
  ): { significant: ScoredFinding[]; filtered: ScoredFinding[] } {
    const significant: ScoredFinding[] = [];
    const filtered: ScoredFinding[] = [];

    for (const finding of findings) {
      const meta = agentMetaMap.get(finding.agentId);
      if (!meta) {
        if (finding.compositeScore >= this.config.baseThreshold) {
          significant.push(finding);
        } else {
          filtered.push(finding);
        }
        continue;
      }

      if (this.isSignificant(finding, meta)) {
        significant.push(finding);
      } else {
        filtered.push(finding);
      }
    }

    return { significant, filtered };
  }

  // ── Statistics ────────────────────────────────────────────────────────────

  /**
   * EVO: Compute filter statistics for monitoring.
   */
  getThresholdSummary(
    agentMetas: EvoAgentMeta[],
  ): {
    minThreshold: number;
    maxThreshold: number;
    avgThreshold: number;
    medianThreshold: number;
  } {
    if (agentMetas.length === 0) {
      return {
        minThreshold: this.config.baseThreshold,
        maxThreshold: this.config.baseThreshold,
        avgThreshold: this.config.baseThreshold,
        medianThreshold: this.config.baseThreshold,
      };
    }

    const thresholds = agentMetas.map(m => this.computeThreshold(m)).sort((a, b) => a - b);
    const sum = thresholds.reduce((a, b) => a + b, 0);
    const mid = Math.floor(thresholds.length / 2);

    return {
      minThreshold: thresholds[0]!,
      maxThreshold: thresholds[thresholds.length - 1]!,
      avgThreshold: sum / thresholds.length,
      medianThreshold:
        thresholds.length % 2 === 0
          ? (thresholds[mid - 1]! + thresholds[mid]!) / 2
          : thresholds[mid]!,
    };
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  updateConfig(partial: Partial<SignificanceFilterConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getConfig(): Readonly<SignificanceFilterConfig> {
    return { ...this.config };
  }
}
