/**
 * EVO Intelligence Layer — Meta Agent
 *
 * Three meta-agents total — one for Sciences, one for Engineering & Systems,
 * one for Abstract & Theoretical. Each receives ClusterSummary objects from
 * their associated colonies and synthesizes cross-colony patterns.
 *
 * EVO: Meta-agents run on the SLOWEST cycle. They are not reactive — they
 * are deliberate. This mirrors biological evolution: continuous variation,
 * periodic selection.
 */

import type {
  EvoLLM,
  ClusterSummary,
  CrossColonyPattern,
  ResearchDirective,
  ScoredFinding,
} from '../core/types.js';
import type { EvoEventBus } from '../core/event-bus.js';
import type { EvoStorage } from '../core/storage.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Meta-Agent Domain Assignment ─────────────────────────────────────────────

export type MetaAgentDomain = 'SCIENCES' | 'ENGINEERING_SYSTEMS' | 'ABSTRACT_THEORETICAL';

// ─── Meta-Agent ───────────────────────────────────────────────────────────────

export class EvoMetaAgent {
  readonly domain: MetaAgentDomain;
  readonly metaAgentId: string;

  private llm: EvoLLM;
  private eventBus: EvoEventBus;
  private storage: EvoStorage;

  /** Colony IDs that this meta-agent is responsible for. */
  private assignedColonies: Set<string>;

  /** Buffer of cluster summaries received since last synthesis. */
  private pendingSummaries: ClusterSummary[] = [];

  constructor(deps: {
    domain: MetaAgentDomain;
    llm: EvoLLM;
    eventBus: EvoEventBus;
    storage: EvoStorage;
    assignedColonies: string[];
  }) {
    this.domain = deps.domain;
    this.metaAgentId = `meta-${deps.domain.toLowerCase().replace(/_/g, '-')}`;
    this.llm = deps.llm;
    this.eventBus = deps.eventBus;
    this.storage = deps.storage;
    this.assignedColonies = new Set(deps.assignedColonies);

    // EVO: Listen for cluster summaries from assigned colonies
    this.eventBus.on('cluster:summary', (summary: ClusterSummary) => {
      if (this.assignedColonies.has(summary.colonyId)) {
        this.pendingSummaries.push(summary);
      }
    });
  }

  // ── Cross-Colony Synthesis ────────────────────────────────────────────────

  /**
   * EVO: The core intellectual function of the meta-agent.
   * Takes cluster summaries from multiple colonies and identifies
   * structural resonances — patterns that appear across different
   * domains but share underlying mechanisms.
   */
  async synthesizeCrossColony(
    summaries?: ClusterSummary[],
  ): Promise<CrossColonyPattern[]> {
    const toProcess = summaries ?? this.consumePendingSummaries();

    if (toProcess.length === 0) return [];

    // Build a structured context for the LLM
    const summaryText = toProcess.map((s, i) => {
      const findingsText = s.topFindings
        .slice(0, 3)
        .map(f => `  - [${f.type}] ${f.content.slice(0, 200)}`)
        .join('\n');
      return [
        `Cluster ${i + 1}: ${s.clusterId} (Colony: ${s.colonyId})`,
        `  Domains: ${s.dominantDomains.join(', ')}`,
        `  Finding count: ${s.findingCount}`,
        `  Average score: ${s.averageScore.toFixed(3)}`,
        `  Top findings:`,
        findingsText,
      ].join('\n');
    }).join('\n\n');

    const prompt = [
      `You are a meta-research synthesizer for the ${this.domain} domain.`,
      `Analyze the following cluster summaries from multiple research colonies.`,
      `Identify cross-colony patterns — structural resonances, shared mechanisms,`,
      `contradictions, or emergent themes that span multiple domains.`,
      '',
      summaryText,
      '',
      `For each pattern found, respond in this exact JSON array format:`,
      `[{"description": "...", "confidence": 0.0-1.0, "sourceColonies": ["colony-id", ...], "suggestedDirective": "..."}]`,
      `If no patterns are found, respond with an empty array: []`,
    ].join('\n');

    try {
      const response = await this.llm.generate(prompt);
      const patterns = this.parsePatternsFromResponse(response, toProcess);

      // Publish confirmed patterns
      for (const pattern of patterns) {
        this.eventBus.emit('colony:pattern', pattern);
      }

      return patterns;
    } catch {
      return [];
    }
  }

  private parsePatternsFromResponse(
    response: string,
    summaries: ClusterSummary[],
  ): CrossColonyPattern[] {
    try {
      // Extract JSON array from response (may be wrapped in markdown code fences)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const raw = JSON.parse(jsonMatch[0]) as Array<{
        description: string;
        confidence: number;
        sourceColonies: string[];
        suggestedDirective: string;
      }>;

      // Collect all finding IDs from the summaries for reference
      const allFindingIds = summaries.flatMap(
        s => s.topFindings.map(f => f.findingId),
      );

      return raw.map(item => ({
        patternId: generateId(),
        sourceColonies: item.sourceColonies ?? [],
        description: item.description ?? '',
        confidence: Math.max(0, Math.min(1, item.confidence ?? 0.5)),
        relatedFindings: allFindingIds.slice(0, 10),
        suggestedDirective: item.suggestedDirective ?? '',
      }));
    } catch {
      return [];
    }
  }

  // ── Research Directive Issuance ────────────────────────────────────────────

  /**
   * EVO: Constructs and publishes a research directive from a confirmed pattern.
   * Targets the colonies most likely to have agents that can investigate further.
   */
  async issueResearchDirective(pattern: CrossColonyPattern): Promise<ResearchDirective> {
    const directive: ResearchDirective = {
      directiveId: generateId(),
      sourceColony: this.metaAgentId,
      targetColonies: pattern.sourceColonies.length > 0
        ? pattern.sourceColonies
        : Array.from(this.assignedColonies),
      conceptSpace: pattern.suggestedDirective || pattern.description,
      issuedAt: new Date().toISOString(),
      priority: pattern.confidence,
    };

    this.eventBus.publishDirective(directive);
    await this.storage.saveDirective(directive);

    return directive;
  }

  // ── Global Knowledge Base ─────────────────────────────────────────────────

  /**
   * EVO: Writes confirmed cross-domain findings to persistent storage.
   * This is the permanent record — what the system has actually learned.
   */
  async updateGlobalKnowledgeBase(pattern: CrossColonyPattern): Promise<void> {
    // Store as a global-level finding
    const globalFinding: ScoredFinding = {
      findingId: `global-${pattern.patternId}`,
      agentId: this.metaAgentId,
      type: 'CROSS_DOMAIN_RESONANCE',
      content: pattern.description,
      confidenceScore: pattern.confidence,
      evidenceBase: pattern.relatedFindings,
      domainTag: this.domain,
      timestamp: new Date().toISOString(),
      propagationLevel: 'GLOBAL',
      relevanceScore: pattern.confidence,
      noveltyScore: pattern.confidence, // high confidence cross-domain = high novelty
      coherenceScore: pattern.confidence,
      compositeScore: pattern.confidence,
    };

    await this.storage.saveFinding(globalFinding);
    this.eventBus.emit('finding:global', globalFinding);
  }

  // ── Buffer Management ─────────────────────────────────────────────────────

  private consumePendingSummaries(): ClusterSummary[] {
    const summaries = [...this.pendingSummaries];
    this.pendingSummaries = [];
    return summaries;
  }

  get pendingSummaryCount(): number {
    return this.pendingSummaries.length;
  }

  // ── Colony Management ─────────────────────────────────────────────────────

  addColony(colonyId: string): void {
    this.assignedColonies.add(colonyId);
  }

  removeColony(colonyId: string): void {
    this.assignedColonies.delete(colonyId);
  }

  getAssignedColonies(): string[] {
    return Array.from(this.assignedColonies);
  }
}
