/**
 * EVO Intelligence Layer — Evolution Cycle Workflow
 *
 * The central heartbeat of the EIL: a 7-step workflow that runs on a
 * configurable interval (default 30 min). Each step feeds into the next.
 *
 * Steps:
 *   1. collect-findings — Harvest buffered findings from all supervisor agents
 *   2. score-agents — Update agent evaluation scores from recent findings
 *   3. cluster-compress — Have supervisors compress cluster findings into summaries
 *   4. meta-synthesize — Have meta-agents synthesize cross-colony patterns
 *   5. directive-issue — Issue research directives from discovered patterns
 *   6. optimize — Run prompt optimization on bottom-performing agents
 *   7. persist — Persist all state changes to storage
 *
 * EVO: This workflow is designed to be suspend/resume safe. Each step
 * produces serializable output that the next step consumes.
 */

import type { EvoConfig, ScoredFinding, ClusterSummary, CrossColonyPattern, ResearchDirective, OptimizationResult } from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoEventBus } from '../core/event-bus.js';
import type { EvoStorage } from '../core/storage.js';
import type { EvoSupervisorAgent } from '../agents/supervisor-agent.js';
import type { EvoMetaAgent } from '../agents/meta-agent.js';

// ─── Step Output Types ────────────────────────────────────────────────────────

export interface CollectFindingsOutput {
  totalFindings: number;
  findingsByCluster: Record<string, ScoredFinding[]>;
}

export interface ScoreAgentsOutput {
  updatedAgentCount: number;
  bottomPerformers: string[];
}

export interface ClusterCompressOutput {
  summaries: ClusterSummary[];
}

export interface MetaSynthesizeOutput {
  patterns: CrossColonyPattern[];
}

export interface DirectiveIssueOutput {
  directives: ResearchDirective[];
}

export interface OptimizeOutput {
  results: OptimizationResult[];
}

export interface PersistOutput {
  findingsSaved: number;
  directivesSaved: number;
  snapshotsSaved: number;
}

export interface EvolutionCycleResult {
  cycleId: string;
  startedAt: string;
  completedAt: string;
  findings: CollectFindingsOutput;
  scores: ScoreAgentsOutput;
  summaries: ClusterCompressOutput;
  patterns: MetaSynthesizeOutput;
  directives: DirectiveIssueOutput;
  optimization: OptimizeOutput;
  persistence: PersistOutput;
}

// ─── Evolution Cycle Workflow ─────────────────────────────────────────────────

export class EvolutionCycleWorkflow {
  private config: EvoConfig;
  private registry: EvoRegistry;
  private eventBus: EvoEventBus;
  private storage: EvoStorage;
  private supervisors: Map<string, EvoSupervisorAgent>;
  private metaAgents: EvoMetaAgent[];

  /** External hook: called during the optimize step. */
  private optimizeFn:
    | ((bottomPerformers: string[]) => Promise<OptimizationResult[]>)
    | undefined;

  private cycleCount = 0;

  constructor(deps: {
    config: EvoConfig;
    registry: EvoRegistry;
    eventBus: EvoEventBus;
    storage: EvoStorage;
    supervisors: Map<string, EvoSupervisorAgent>;
    metaAgents: EvoMetaAgent[];
    optimizeFn?: (bottomPerformers: string[]) => Promise<OptimizationResult[]>;
  }) {
    this.config = deps.config;
    this.registry = deps.registry;
    this.eventBus = deps.eventBus;
    this.storage = deps.storage;
    this.supervisors = deps.supervisors;
    this.metaAgents = deps.metaAgents;
    this.optimizeFn = deps.optimizeFn;
  }

  // ── Full Cycle Execution ──────────────────────────────────────────────────

  async runCycle(): Promise<EvolutionCycleResult> {
    const cycleId = `cycle-${++this.cycleCount}-${Date.now()}`;
    const startedAt = new Date().toISOString();

    this.eventBus.emit('evolution:cycle:start', { cycleId, startedAt });

    // Step 1: Collect findings
    const findings = await this.stepCollectFindings();

    // Step 2: Score agents
    const scores = await this.stepScoreAgents(findings);

    // Step 3: Cluster compress
    const summaries = await this.stepClusterCompress();

    // Step 4: Meta-synthesize
    const patterns = await this.stepMetaSynthesize(summaries);

    // Step 5: Issue directives
    const directives = await this.stepIssueDirectives(patterns);

    // Steps 6 & 7: Optimize + Persist (can run in parallel conceptually,
    // but we serialize to avoid storage contention)
    const optimization = await this.stepOptimize(scores.bottomPerformers);
    const persistence = await this.stepPersist(findings, directives);

    const completedAt = new Date().toISOString();

    const result: EvolutionCycleResult = {
      cycleId,
      startedAt,
      completedAt,
      findings,
      scores,
      summaries,
      patterns,
      directives,
      optimization,
      persistence,
    };

    this.eventBus.emit('evolution:cycle:complete', {
      cycleId,
      completedAt,
      findingsCollected: findings.totalFindings,
      patternsFound: patterns.patterns.length,
      directivesIssued: directives.directives.length,
    });

    return result;
  }

  // ── Step 1: Collect Findings ──────────────────────────────────────────────

  /**
   * EVO: Harvest all buffered scored findings from storage.
   * Grouped by cluster for downstream processing.
   */
  private async stepCollectFindings(): Promise<CollectFindingsOutput> {
    const findingsByCluster: Record<string, ScoredFinding[]> = {};
    let total = 0;

    // Get recent findings from storage (last cycle window)
    const cutoff = new Date(Date.now() - this.config.cycleDurationMs * 2).toISOString();

    const allClusters = this.registry.getAllClusterIds();
    for (const clusterId of allClusters) {
      // EVO: getCluster returns string[] of agentIds
      const clusterAgents = this.registry.getCluster(clusterId);
      if (clusterAgents.length === 0) continue;

      const findings: ScoredFinding[] = [];
      for (const agentId of clusterAgents) {
        const agentFindings = await this.storage.getFindingsForAgent(agentId, cutoff);
        findings.push(...agentFindings);
      }

      if (findings.length > 0) {
        findingsByCluster[clusterId] = findings;
        total += findings.length;
      }
    }

    return { totalFindings: total, findingsByCluster };
  }

  // ── Step 2: Score Agents ──────────────────────────────────────────────────

  /**
   * EVO: Compute running evaluation scores for each agent based on
   * their recent findings. Identify bottom performers for optimization.
   */
  private async stepScoreAgents(
    findingsOutput: CollectFindingsOutput,
  ): Promise<ScoreAgentsOutput> {
    const agentScores = new Map<string, number[]>();

    // Collect scores per agent
    for (const findings of Object.values(findingsOutput.findingsByCluster)) {
      for (const finding of findings) {
        const existing = agentScores.get(finding.agentId) ?? [];
        existing.push(finding.compositeScore);
        agentScores.set(finding.agentId, existing);
      }
    }

    // Update registry
    let updatedCount = 0;
    for (const [agentId, scores] of agentScores) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      this.registry.updateAgentScore(agentId, avg);
      await this.storage.saveAgentScore(agentId, avg);
      updatedCount++;
    }

    // Identify bottom 10% performers
    const allScored: Array<{ agentId: string; score: number }> = [];
    for (const [agentId, scores] of agentScores) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      allScored.push({ agentId, score: avg });
    }
    allScored.sort((a, b) => a.score - b.score);

    const bottomCount = Math.max(1, Math.floor(allScored.length * 0.1));
    const bottomPerformers = allScored.slice(0, bottomCount).map(a => a.agentId);

    return { updatedAgentCount: updatedCount, bottomPerformers };
  }

  // ── Step 3: Cluster Compress ──────────────────────────────────────────────

  /**
   * EVO: Have each supervisor compress their buffered findings into
   * a cluster summary suitable for meta-agent consumption.
   */
  private async stepClusterCompress(): Promise<ClusterCompressOutput> {
    const summaries: ClusterSummary[] = [];

    for (const [, supervisor] of this.supervisors) {
      const summary = await supervisor.compressClusterFindings();
      if (summary) {
        summaries.push(summary);
        this.eventBus.emit('cluster:summary', summary);
      }
    }

    return { summaries };
  }

  // ── Step 4: Meta-Synthesize ───────────────────────────────────────────────

  /**
   * EVO: Each meta-agent synthesizes cross-colony patterns from the
   * summaries that pertain to their assigned colonies.
   */
  private async stepMetaSynthesize(
    compressOutput: ClusterCompressOutput,
  ): Promise<MetaSynthesizeOutput> {
    const allPatterns: CrossColonyPattern[] = [];

    for (const meta of this.metaAgents) {
      // Meta-agents have internal subscription to cluster:summary events,
      // but we can also pass summaries directly for deterministic testing
      const patterns = await meta.synthesizeCrossColony(compressOutput.summaries);
      allPatterns.push(...patterns);
    }

    return { patterns: allPatterns };
  }

  // ── Step 5: Issue Directives ──────────────────────────────────────────────

  /**
   * EVO: Convert confirmed patterns into research directives and
   * distribute them through the event bus.
   */
  private async stepIssueDirectives(
    synthesisOutput: MetaSynthesizeOutput,
  ): Promise<DirectiveIssueOutput> {
    const directives: ResearchDirective[] = [];

    for (const pattern of synthesisOutput.patterns) {
      // Only issue directives for confident-enough patterns
      if (pattern.confidence >= this.config.findingThreshold) {
        for (const meta of this.metaAgents) {
          if (
            pattern.sourceColonies.some(c =>
              meta.getAssignedColonies().includes(c),
            )
          ) {
            const directive = await meta.issueResearchDirective(pattern);
            directives.push(directive);
            break; // one directive per pattern is enough
          }
        }
      }
    }

    return { directives };
  }

  // ── Step 6: Optimize ──────────────────────────────────────────────────────

  /**
   * EVO: Run prompt optimization on bottom-performing agents.
   * Delegates to the optimizer manager via injected function.
   */
  private async stepOptimize(bottomPerformers: string[]): Promise<OptimizeOutput> {
    if (!this.optimizeFn || bottomPerformers.length === 0) {
      return { results: [] };
    }

    const results = await this.optimizeFn(bottomPerformers);
    return { results };
  }

  // ── Step 7: Persist ───────────────────────────────────────────────────────

  /**
   * EVO: Persist all accumulated state to durable storage.
   */
  private async stepPersist(
    findingsOutput: CollectFindingsOutput,
    directivesOutput: DirectiveIssueOutput,
  ): Promise<PersistOutput> {
    let findingsSaved = 0;
    let directivesSaved = 0;

    // Save findings that haven't been persisted yet
    for (const findings of Object.values(findingsOutput.findingsByCluster)) {
      for (const finding of findings) {
        await this.storage.saveFinding(finding);
        findingsSaved++;
      }
    }

    // Save directives
    for (const directive of directivesOutput.directives) {
      await this.storage.saveDirective(directive);
      directivesSaved++;
    }

    return {
      findingsSaved,
      directivesSaved,
      snapshotsSaved: 0, // topology snapshots saved in the topology workflow
    };
  }

  // ── Injection Updates ─────────────────────────────────────────────────────

  setOptimizeFn(
    fn: (bottomPerformers: string[]) => Promise<OptimizationResult[]>,
  ): void {
    this.optimizeFn = fn;
  }

  get currentCycleCount(): number {
    return this.cycleCount;
  }
}
