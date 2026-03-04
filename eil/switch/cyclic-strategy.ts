/**
 * EVO Intelligence Layer — Cyclic Execution Strategy
 *
 * SWITCH: Wraps all existing cyclic scheduling logic. Timer fires.
 * Tier 1 and 2 agents generate. Supervisors compress. Meta-agents synthesize.
 * Evolution cycle completes. Repeat.
 *
 * The CyclicExecutionStrategy is what the system has always done —
 * now wrapped in the IEvoExecutionStrategy interface so the switch can swap it.
 */

import type { EvoAgentMeta, Finding } from '../core/types.js';
import type { EvoEventBus } from '../core/event-bus.js';
import type {
  IEvoExecutionStrategy,
  RuntimeMode,
  StrategyMetrics,
  CyclicConfig,
  ClusterSignal,
  AgentTier,
  DEFAULT_CYCLIC_CONFIG as _Default,
} from './types.js';
import { DEFAULT_CYCLIC_CONFIG } from './types.js';

// ─── Tier Assigner ────────────────────────────────────────────────────────────

/**
 * SWITCH: Assigns each agent to a generation tier based on evaluation score.
 * Tier 1 (top performers): every cycle.
 * Tier 2 (mid performers): every 3rd cycle.
 * Tier 3 (low performers / dormant): every 7th cycle, unless directed.
 */
export class EvoTierAssigner {
  getTier(agentId: string, evaScore: number): AgentTier {
    if (evaScore >= 0.7) return 1;
    if (evaScore >= 0.4) return 2;
    return 3;
  }

  isTierActive(tier: AgentTier, cycleNumber: number): boolean {
    if (tier === 1) return true;
    if (tier === 2) return cycleNumber % 3 === 0;
    return cycleNumber % 7 === 0;
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * SWITCH: The central cyclic scheduler. Buffers findings, cluster compressions,
 * and colony signals until the cycle timer fires, then flushes in order.
 */
export class EvoScheduler {
  private cycleTimer: ReturnType<typeof setInterval> | null = null;
  private findingBuffer: Map<string, Finding[]> = new Map();
  private clusterFindingBuffer: Map<string, Finding[]> = new Map();
  private colonySignalBuffer: Map<string, ClusterSignal[]> = new Map();
  private eventBus: EvoEventBus;

  // Metrics tracking
  private generationsThisCycle = 0;
  private findingsPropagatedThisCycle = 0;
  private lastCycleStartMs = 0;
  private lastCycleDurationMs = 0;

  constructor(eventBus: EvoEventBus) {
    this.eventBus = eventBus;
  }

  bufferFinding(agentId: string, finding: Finding): void {
    const existing = this.findingBuffer.get(agentId) ?? [];
    existing.push(finding);
    this.findingBuffer.set(agentId, existing);
    this.generationsThisCycle++;
  }

  bufferClusterFinding(clusterId: string, finding: Finding): void {
    const existing = this.clusterFindingBuffer.get(clusterId) ?? [];
    existing.push(finding);
    this.clusterFindingBuffer.set(clusterId, existing);
  }

  bufferColonySignal(colonyId: string, signal: ClusterSignal): void {
    const existing = this.colonySignalBuffer.get(colonyId) ?? [];
    existing.push(signal);
    this.colonySignalBuffer.set(colonyId, existing);
  }

  startCycleTimer(intervalMs: number, onCycle: () => Promise<void>): void {
    this.cycleTimer = setInterval(() => {
      void onCycle();
    }, intervalMs);
  }

  pauseCycleTimer(): void {
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }

  stopCycleTimer(): void {
    this.pauseCycleTimer();
    this.flushAll();
  }

  /** Publish all buffered findings to the event bus. */
  publishBufferedFindings(): void {
    for (const [, findings] of this.findingBuffer) {
      for (const f of findings) {
        this.eventBus.publishFinding(f);
        this.findingsPropagatedThisCycle++;
      }
    }
    this.findingBuffer.clear();
  }

  /** Emit cluster findings for supervisor compression. */
  flushClusterCompressions(): void {
    for (const [clusterId, findings] of this.clusterFindingBuffer) {
      for (const f of findings) {
        this.eventBus.emit('finding:cluster' as 'finding:local', f);
      }
    }
    this.clusterFindingBuffer.clear();
  }

  /** Emit colony signals for meta-agent synthesis. */
  flushMetaSynthesis(): void {
    for (const [colonyId, signals] of this.colonySignalBuffer) {
      for (const signal of signals) {
        this.eventBus.emit('cluster:summary' as 'finding:local', {
          clusterId: signal.clusterId,
          colonyId,
          findingCount: signal.findingCount,
          topFindings: [],
          averageScore: signal.accumulatedSignificance / Math.max(1, signal.findingCount),
          dominantDomains: [signal.dominantDomain],
          timestamp: signal.timestamp,
        } as never);
      }
    }
    this.colonySignalBuffer.clear();
  }

  flushAll(): void {
    this.publishBufferedFindings();
    this.flushClusterCompressions();
    this.flushMetaSynthesis();
  }

  get isRunning(): boolean {
    return this.cycleTimer !== null;
  }

  get queueDepth(): number {
    let depth = 0;
    for (const [, findings] of this.findingBuffer) depth += findings.length;
    for (const [, findings] of this.clusterFindingBuffer) depth += findings.length;
    for (const [, signals] of this.colonySignalBuffer) depth += signals.length;
    return depth;
  }

  get generationsCount(): number {
    return this.generationsThisCycle;
  }

  get findingsPropagatedCount(): number {
    return this.findingsPropagatedThisCycle;
  }

  markCycleStart(): void {
    this.lastCycleStartMs = Date.now();
    this.generationsThisCycle = 0;
    this.findingsPropagatedThisCycle = 0;
  }

  markCycleEnd(): void {
    this.lastCycleDurationMs = Date.now() - this.lastCycleStartMs;
  }

  get cycleDurationMs(): number {
    return this.lastCycleDurationMs;
  }

  resetMetrics(): void {
    this.generationsThisCycle = 0;
    this.findingsPropagatedThisCycle = 0;
  }
}

// ─── Cyclic Strategy ──────────────────────────────────────────────────────────

export class CyclicExecutionStrategy implements IEvoExecutionStrategy {
  readonly mode: RuntimeMode = 'CYCLIC';

  private scheduler: EvoScheduler;
  private tierAssigner: EvoTierAssigner;
  private currentCycle = 0;
  private cycleIntervalMs: number;
  private totalAgentCount: number;
  private paused = false;

  // In-flight generation tracking for drain
  private inFlight: Set<Promise<void>> = new Set();

  // Metrics accumulation
  private startedAt = 0;
  private totalGenerations = 0;
  private totalLatencyMs = 0;
  private generationStartTimes: Map<string, number> = new Map();

  constructor(
    config: CyclicConfig,
    scheduler: EvoScheduler,
    tierAssigner: EvoTierAssigner,
    totalAgentCount: number,
  ) {
    this.cycleIntervalMs = config.cycleIntervalMs;
    this.scheduler = scheduler;
    this.tierAssigner = tierAssigner;
    this.totalAgentCount = totalAgentCount;
  }

  shouldAgentGenerate(agentId: string, meta: EvoAgentMeta): boolean {
    if (this.paused) return false;
    const tier = this.tierAssigner.getTier(agentId, meta.evaluationScore);
    return this.tierAssigner.isTierActive(tier, this.currentCycle);
  }

  onAgentGenerated(agentId: string, finding: Finding | null): void {
    // Track latency
    const startTime = this.generationStartTimes.get(agentId);
    if (startTime) {
      this.totalLatencyMs += Date.now() - startTime;
      this.generationStartTimes.delete(agentId);
    }
    this.totalGenerations++;

    // Buffer finding for batch publish at cycle end
    if (finding) {
      this.scheduler.bufferFinding(agentId, finding);
    }
  }

  onFindingReceived(clusterId: string, finding: Finding): void {
    // Buffer — supervisors compress at cycle end, not now
    this.scheduler.bufferClusterFinding(clusterId, finding);
  }

  onClusterSignalReceived(colonyId: string, signal: ClusterSignal): void {
    // Buffer — meta-agents synthesize at evolution cycle end
    this.scheduler.bufferColonySignal(colonyId, signal);
  }

  async start(): Promise<void> {
    this.paused = false;
    this.startedAt = Date.now();
    this.scheduler.startCycleTimer(this.cycleIntervalMs, () => this.runCycle());
  }

  async pause(): Promise<void> {
    this.paused = true;
    this.scheduler.pauseCycleTimer();
    // Drain in-flight generations
    await this.drainInFlight();
  }

  async resume(): Promise<void> {
    this.paused = false;
    this.scheduler.startCycleTimer(this.cycleIntervalMs, () => this.runCycle());
  }

  async stop(): Promise<void> {
    this.paused = true;
    this.scheduler.stopCycleTimer();
    await this.drainInFlight();
  }

  // ── In-flight tracking ──────────────────────────────────────────────────

  trackGeneration(promise: Promise<void>): void {
    this.inFlight.add(promise);
    promise.finally(() => this.inFlight.delete(promise));
  }

  markGenerationStart(agentId: string): void {
    this.generationStartTimes.set(agentId, Date.now());
  }

  private async drainInFlight(): Promise<void> {
    if (this.inFlight.size > 0) {
      await Promise.allSettled([...this.inFlight]);
    }
  }

  // ── Cycle Execution ─────────────────────────────────────────────────────

  private async runCycle(): Promise<void> {
    if (this.paused) return;
    this.currentCycle++;
    this.scheduler.markCycleStart();

    // Flush in order: cluster compressions → meta synthesis → publish findings
    this.scheduler.flushClusterCompressions();
    this.scheduler.flushMetaSynthesis();
    this.scheduler.publishBufferedFindings();

    this.scheduler.markCycleEnd();
  }

  // ── Metrics ─────────────────────────────────────────────────────────────

  getMetrics(): StrategyMetrics {
    const elapsedMinutes = Math.max(1, (Date.now() - this.startedAt) / 60_000);
    const avgLatency = this.totalGenerations > 0
      ? this.totalLatencyMs / this.totalGenerations
      : 0;

    // In cyclic mode, agents are idle between cycles
    // Estimate: only tier-active agents are "active" in the current cycle
    const activePercent = this.totalAgentCount > 0
      ? Math.min(100, (this.totalGenerations / Math.max(1, this.currentCycle)) / this.totalAgentCount * 100)
      : 0;

    return {
      mode: 'CYCLIC',
      generationsPerMinute: this.totalGenerations / elapsedMinutes,
      averageAgentLatencyMs: avgLatency,
      findingsPropagatedPerMinute: this.scheduler.findingsPropagatedCount / elapsedMinutes,
      gpuUtilizationPercent: Math.min(100, activePercent * 0.8), // estimate
      queueDepth: this.scheduler.queueDepth,
      idleAgentPercent: Math.max(0, 100 - activePercent),
      activeAgentPercent: activePercent,
      cycleCompletionTimeMs: this.scheduler.cycleDurationMs,
    };
  }

  // ── Accessors ───────────────────────────────────────────────────────────

  get cycle(): number {
    return this.currentCycle;
  }

  get isPaused(): boolean {
    return this.paused;
  }
}
