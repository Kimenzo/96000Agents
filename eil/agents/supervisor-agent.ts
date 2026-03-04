/**
 * EVO Intelligence Layer — Supervisor Agent
 *
 * Each cluster of 1,000 agents has one supervisor. The supervisor:
 *   - Listens for LOCAL findings from its cluster members
 *   - Classifies and scores findings for cluster-level significance
 *   - Compresses cluster findings into summaries for the meta layer
 *   - Routes research directives to the most relevant agents in the cluster
 *
 * EVO: The supervisor uses a small, fast LLM (e.g. gpt-4o-mini) for
 * classification decisions. Speed matters here, not depth.
 */

import type {
  EvoLLM,
  EvoAgentMeta,
  Finding,
  ScoredFinding,
  ResearchDirective,
  ClusterSummary,
} from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoEventBus } from '../core/event-bus.js';
import type { EvoStorage } from '../core/storage.js';
import type { EvoAgentHarness } from './evo-agent-harness.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Supervisor ───────────────────────────────────────────────────────────────

export class EvoSupervisorAgent {
  readonly clusterId: string;
  readonly colonyId: string;

  private llm: EvoLLM;
  private registry: EvoRegistry;
  private eventBus: EvoEventBus;
  private storage: EvoStorage;
  private harnesses: Map<string, EvoAgentHarness>;
  private significanceThreshold: number;

  /** Buffer of findings received since last compression. */
  private pendingFindings: Finding[] = [];

  constructor(deps: {
    clusterId: string;
    colonyId?: string;
    llm: EvoLLM;
    registry: EvoRegistry;
    eventBus: EvoEventBus;
    storage: EvoStorage;
    harnesses?: EvoAgentHarness[];
    significanceThreshold?: number;
  }) {
    this.clusterId = deps.clusterId;
    // EVO: Derive colonyId from registry when not explicitly provided
    this.colonyId = deps.colonyId ?? deps.registry.getColonyForCluster(deps.clusterId) ?? '';
    this.llm = deps.llm;
    this.registry = deps.registry;
    this.eventBus = deps.eventBus;
    this.storage = deps.storage;
    this.significanceThreshold = deps.significanceThreshold ?? 0.6;

    this.harnesses = new Map();
    if (deps.harnesses) {
      for (const h of deps.harnesses) {
        this.harnesses.set(h.meta.agentId, h);
      }
    }

    // EVO: Subscribe to LOCAL findings from agents in this cluster
    this.eventBus.on('finding:local', (finding: Finding) => {
      if (this.isOwnAgent(finding.agentId)) {
        this.handleLocalFinding(finding);
      }
    });

    // EVO: Subscribe to directives targeting our colony
    this.eventBus.on('directive:issued', (directive: ResearchDirective) => {
      const colonyForCluster = this.registry.getColonyForCluster(this.clusterId);
      if (directive.targetColonies.includes(colonyForCluster ?? '')) {
        this.issueClusterDirective(directive.conceptSpace, directive);
      }
    });
  }

  // ── Finding Handling ──────────────────────────────────────────────────────

  private isOwnAgent(agentId: string): boolean {
    if (this.harnesses.size > 0) {
      return this.harnesses.has(agentId);
    }
    // EVO: Fallback to registry when harnesses not yet attached
    return this.registry.getCluster(this.clusterId).includes(agentId);
  }

  /**
   * EVO: Receives a LOCAL finding from a cluster member.
   * Classifies significance and decides whether to escalate.
   */
  private async handleLocalFinding(finding: Finding): Promise<void> {
    this.pendingFindings.push(finding);

    // Quick significance check — only escalate high-confidence findings immediately
    if (finding.confidenceScore >= 0.7) {
      const scored = await this.scoreFinding(finding);
      if (scored.compositeScore >= this.significanceThreshold) {
        scored.propagationLevel = 'CLUSTER';
        this.eventBus.emit('finding:cluster', scored);
        await this.storage.saveFinding(scored);
      }
    }
  }

  /**
   * EVO: Uses the fast LLM to score a finding on relevance, novelty, coherence.
   * This is NOT the full EvoScorer — it's a lightweight classification for
   * real-time escalation decisions.
   */
  private async scoreFinding(finding: Finding): Promise<ScoredFinding> {
    const prompt = [
      'Score this research finding on three dimensions (0.0-1.0 each):',
      `Domain: ${finding.domainTag}`,
      `Type: ${finding.type}`,
      `Content: ${finding.content.slice(0, 500)}`,
      '',
      'Respond in exactly this format:',
      'relevance: <score>',
      'novelty: <score>',
      'coherence: <score>',
    ].join('\n');

    try {
      const response = await this.llm.generate(prompt);
      const scores = this.parseScores(response);

      return {
        ...finding,
        relevanceScore: scores.relevance,
        noveltyScore: scores.novelty,
        coherenceScore: scores.coherence,
        // EVO: Novelty weighted at 0.45 — discovery > reproduction
        compositeScore: 0.35 * scores.relevance + 0.45 * scores.novelty + 0.20 * scores.coherence,
      };
    } catch {
      // EVO: On LLM failure, assign neutral scores and don't escalate
      return {
        ...finding,
        relevanceScore: 0.5,
        noveltyScore: 0.5,
        coherenceScore: 0.5,
        compositeScore: 0.5,
      };
    }
  }

  private parseScores(response: string): { relevance: number; novelty: number; coherence: number } {
    const extract = (key: string): number => {
      const match = response.match(new RegExp(`${key}:\\s*([0-9.]+)`));
      const val = match ? parseFloat(match[1] ?? '0.5') : 0.5;
      return Math.max(0, Math.min(1, val));
    };
    return {
      relevance: extract('relevance'),
      novelty: extract('novelty'),
      coherence: extract('coherence'),
    };
  }

  // ── Cluster Compression ───────────────────────────────────────────────────

  /**
   * EVO: Aggregates all pending findings into a structured ClusterSummary.
   * Called on a timer cycle by the evolution workflow.
   */
  async compressClusterFindings(): Promise<ClusterSummary> {
    const findings = [...this.pendingFindings];
    this.pendingFindings = [];

    const scored: ScoredFinding[] = [];
    for (const f of findings) {
      scored.push(await this.scoreFinding(f));
    }

    // Sort by composite score descending, keep top 10
    scored.sort((a, b) => b.compositeScore - a.compositeScore);
    const topFindings = scored.slice(0, 10);

    // Compute stats
    const avgScore = scored.length > 0
      ? scored.reduce((sum, f) => sum + f.compositeScore, 0) / scored.length
      : 0;

    const domainCounts = new Map<string, number>();
    for (const f of scored) {
      domainCounts.set(f.domainTag, (domainCounts.get(f.domainTag) ?? 0) + 1);
    }
    const dominantDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain]) => domain);

    const summary: ClusterSummary = {
      clusterId: this.clusterId,
      colonyId: this.colonyId,
      findingCount: scored.length,
      topFindings,
      averageScore: avgScore,
      dominantDomains,
      timestamp: new Date().toISOString(),
    };

    this.eventBus.emit('cluster:summary', summary);
    return summary;
  }

  // ── Directive Distribution ────────────────────────────────────────────────

  /**
   * EVO: Routes a research directive to the most relevant agents in the cluster
   * based on skill alignment. Not all 1,000 agents need the directive —
   * only those whose skill domain overlaps with the directive's concept space.
   */
  issueClusterDirective(conceptSpace: string, directive: ResearchDirective): void {
    const conceptLower = conceptSpace.toLowerCase();

    if (this.harnesses.size > 0) {
      for (const [agentId, harness] of this.harnesses) {
        const meta = this.registry.getAgentMeta(agentId);
        if (!meta) continue;

        // EVO: Simple keyword overlap for directive routing.
        const domainLower = meta.skillDomain.toLowerCase();
        const overlap = conceptLower.split(/\s+/).some(word =>
          domainLower.includes(word),
        );

        if (overlap) {
          harness.receiveDirective(directive);
        }
      }
    }
    // EVO: When no harnesses are attached, directive routing is deferred
    // until harnesses are connected via attachHarness()
  }

  // ── Harness Management ────────────────────────────────────────────────────

  /** Attach a harness after construction. Used when supervisors are created before agents are loaded. */
  attachHarness(harness: EvoAgentHarness): void {
    this.harnesses.set(harness.meta.agentId, harness);
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  get agentCount(): number {
    return this.harnesses.size;
  }

  get pendingFindingCount(): number {
    return this.pendingFindings.length;
  }

  getHarness(agentId: string): EvoAgentHarness | undefined {
    return this.harnesses.get(agentId);
  }

  getAllHarnesses(): EvoAgentHarness[] {
    return Array.from(this.harnesses.values());
  }
}
