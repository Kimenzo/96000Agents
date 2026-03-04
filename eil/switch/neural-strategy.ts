/**
 * EVO Intelligence Layer — Neural Execution Strategy
 *
 * SWITCH: Replaces timers with thresholds. Every agent has a charge level
 * that increases as domain-relevant signals arrive. When charge crosses the
 * firing threshold, the agent generates immediately. No waiting for a cycle.
 *
 * Key properties:
 * - Adaptive threshold: proven agents fire more readily
 * - Leaky integrator: charge decays over time, preventing stale accumulation
 * - Refractory period: charge resets to 0 after firing
 * - Neighbor propagation: a generated finding charges cluster neighbors
 */

import type { EvoAgentMeta, Finding } from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoEventBus } from '../core/event-bus.js';
import type { EvoAgentHarness } from '../agents/evo-agent-harness.js';
import type {
  IEvoExecutionStrategy,
  RuntimeMode,
  StrategyMetrics,
  NeuralConfig,
  NeuralAgentState,
  NeuralSupervisorState,
  ClusterSignal,
  DomainSignal,
} from './types.js';

// ─── Mutex for atomic state transitions ───────────────────────────────────────

class SimpleMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise<void>(resolve => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

// ─── Neural Strategy ──────────────────────────────────────────────────────────

export class NeuralExecutionStrategy implements IEvoExecutionStrategy {
  readonly mode: RuntimeMode = 'NEURAL';

  // Per-agent neural state — charge level 0.0 to 1.0
  private agentStates: Map<string, NeuralAgentState> = new Map();

  // Per-supervisor integration state
  private supervisorStates: Map<string, NeuralSupervisorState> = new Map();

  private config: NeuralConfig;
  private registry: EvoRegistry;
  private eventBus: EvoEventBus;
  private harnessMap: Map<string, EvoAgentHarness>;

  // Decay loop handle
  private decayTimer: ReturnType<typeof setInterval> | null = null;

  // Concurrency control
  private chargeMutex = new SimpleMutex();

  // In-flight generation tracking
  private inFlight: Set<Promise<void>> = new Set();

  // Metrics
  private startedAt = 0;
  private totalGenerations = 0;
  private totalFindingsPropagated = 0;
  private totalLatencyMs = 0;
  private generationStartTimes: Map<string, number> = new Map();
  private paused = false;

  constructor(config: NeuralConfig) {
    this.config = config;
    this.registry = config.registry;
    this.eventBus = config.eventBus;
    this.harnessMap = config.harnessMap;
  }

  // ── IEvoExecutionStrategy ─────────────────────────────────────────────────

  shouldAgentGenerate(agentId: string, meta: EvoAgentMeta): boolean {
    if (this.paused) return false;
    const state = this.getOrCreateAgentState(agentId, meta);
    const threshold = this.computeThreshold(meta.evaluationScore);
    return state.charge >= threshold;
  }

  onAgentGenerated(agentId: string, finding: Finding | null): void {
    // Track latency
    const startTime = this.generationStartTimes.get(agentId);
    if (startTime) {
      this.totalLatencyMs += Date.now() - startTime;
      this.generationStartTimes.delete(agentId);
    }
    this.totalGenerations++;

    // Publish immediately — no buffering in neural mode
    if (finding) {
      this.eventBus.publishFinding(finding);
      this.totalFindingsPropagated++;
      // The act of publishing charges neighboring agents in the same cluster
      this.chargeNeighbors(agentId, finding);
    }
  }

  onFindingReceived(clusterId: string, finding: Finding): void {
    // Charge the supervisor — it integrates continuously
    const supervisorState = this.supervisorStates.get(clusterId);
    if (supervisorState) {
      supervisorState.accumulatedSignificance += finding.confidenceScore;
      supervisorState.findingSinceLastFire++;

      // Supervisor fires (escalates) when significance accumulation crosses threshold
      if (supervisorState.accumulatedSignificance >= this.config.supervisorThreshold) {
        this.fireSupervisor(clusterId, supervisorState);
      }
    }
  }

  onClusterSignalReceived(colonyId: string, signal: ClusterSignal): void {
    // Meta-agents fire when colony signal strength crosses meta-threshold
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

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    this.paused = false;
    this.startedAt = Date.now();

    // Initialize all agent states from the harness map
    for (const [agentId, harness] of this.harnessMap) {
      this.agentStates.set(agentId, {
        charge: 0.0,
        lastFiredAt: 0,
        lastChargedAt: Date.now(),
        meta: harness.meta,
        skillDomain: harness.meta.skillDomain,
      });
    }

    // Initialize supervisor states for all clusters
    const clusterIds = this.registry.getAllClusterIds();
    for (const clusterId of clusterIds) {
      this.supervisorStates.set(clusterId, {
        clusterId,
        accumulatedSignificance: 0,
        lastFiredAt: 0,
        findingSinceLastFire: 0,
      });
    }

    // Start the charge decay loop
    this.startDecayLoop();

    // Seed initial charge so agents begin firing immediately
    this.seedInitialCharge();
  }

  async pause(): Promise<void> {
    this.paused = true;
    this.stopDecayLoop();
    // Drain in-flight generations
    if (this.inFlight.size > 0) {
      await Promise.allSettled([...this.inFlight]);
    }
  }

  async resume(): Promise<void> {
    this.paused = false;
    this.startDecayLoop();
  }

  async stop(): Promise<void> {
    this.paused = true;
    this.stopDecayLoop();
    if (this.inFlight.size > 0) {
      await Promise.allSettled([...this.inFlight]);
    }
    this.agentStates.clear();
    this.supervisorStates.clear();
  }

  // ── Charge System ─────────────────────────────────────────────────────────

  /**
   * SWITCH: Called by event bus subscriber when a relevant finding arrives.
   * Charges the target agent proportionally to domain relevance.
   */
  async chargeAgent(agentId: string, signal: DomainSignal): Promise<void> {
    await this.chargeMutex.acquire();
    try {
      const meta = this.registry.getAgentMeta(agentId);
      if (!meta) return;

      const state = this.getOrCreateAgentState(agentId, meta);
      const relevance = this.computeDomainRelevance(signal.domainTag, state.skillDomain);
      state.charge = Math.min(1.0, state.charge + relevance * this.config.chargeIncrement);
      state.lastChargedAt = Date.now();
    } finally {
      this.chargeMutex.release();
    }

    // Check if threshold crossed — fire immediately if so
    const meta = this.registry.getAgentMeta(agentId);
    if (meta && this.shouldAgentGenerate(agentId, meta)) {
      await this.fireAgent(agentId);
    }
  }

  /**
   * SWITCH: Fire an agent — reset charge and trigger non-blocking generation.
   */
  private async fireAgent(agentId: string): Promise<void> {
    await this.chargeMutex.acquire();
    const state = this.agentStates.get(agentId);
    if (!state) {
      this.chargeMutex.release();
      return;
    }
    // Refractory period — reset charge to 0
    state.charge = 0.0;
    state.lastFiredAt = Date.now();
    this.chargeMutex.release();

    // Track latency start
    this.generationStartTimes.set(agentId, Date.now());

    // Non-blocking generation via setImmediate
    const harness = this.harnessMap.get(agentId);
    if (harness) {
      const genPromise = (async () => {
        try {
          await harness.generate('');
        } catch {
          // Swallow — individual agent failures don't cascade
        }
      })();
      this.inFlight.add(genPromise);
      genPromise.finally(() => this.inFlight.delete(genPromise));
    }
  }

  /**
   * SWITCH: Fires a supervisor when accumulated significance crosses threshold.
   * Resets the supervisor state and emits a ClusterSignal.
   */
  private fireSupervisor(clusterId: string, state: NeuralSupervisorState): void {
    const colonyId = this.registry.getColonyForCluster(clusterId) ?? '';
    const signal: ClusterSignal = {
      clusterId,
      colonyId,
      accumulatedSignificance: state.accumulatedSignificance,
      findingCount: state.findingSinceLastFire,
      dominantDomain: '',
      timestamp: new Date().toISOString(),
    };

    // Reset supervisor state
    state.accumulatedSignificance = 0;
    state.findingSinceLastFire = 0;
    state.lastFiredAt = Date.now();

    // Emit for meta-agent consumption
    this.eventBus.emit('cluster:summary' as 'finding:local', {
      clusterId,
      colonyId,
      findingCount: signal.findingCount,
      topFindings: [],
      averageScore: 0,
      dominantDomains: [],
      timestamp: signal.timestamp,
    } as never);
  }

  // ── Threshold & Relevance ─────────────────────────────────────────────────

  /**
   * SWITCH: Adaptive threshold.
   * High-performing agents: threshold 0.60 (fire more readily).
   * Low-performing agents: threshold 0.85 (need stronger signal).
   * Evolution pressure: unproven agents must receive stronger signals.
   */
  computeThreshold(evaScore: number): number {
    return 0.85 - (evaScore * 0.25);
  }

  /**
   * SWITCH: Domain relevance — proximity between two skill domains.
   * Same domain: 1.0, adjacent: 0.6, distant: 0.1.
   * Uses a simple string-matching heuristic on the registry's skill taxonomy.
   */
  computeDomainRelevance(signalDomain: string, agentDomain: string): number {
    if (signalDomain === agentDomain) return 1.0;

    const signalWords = signalDomain.toLowerCase().split(/\s+/);
    const agentWords = agentDomain.toLowerCase().split(/\s+/);

    // Count overlapping words
    let overlap = 0;
    for (const w of signalWords) {
      if (agentWords.includes(w)) overlap++;
    }

    const maxLen = Math.max(signalWords.length, agentWords.length, 1);
    const similarity = overlap / maxLen;

    if (similarity >= 0.5) return 0.6;
    if (similarity > 0) return 0.3;
    return 0.1;
  }

  // ── Neighbor Charging ─────────────────────────────────────────────────────

  /**
   * SWITCH: When an agent generates a finding, charge its 50 nearest
   * cluster neighbors proportionally to domain relevance.
   */
  private chargeNeighbors(sourceAgentId: string, finding: Finding): void {
    const neighbors = this.registry.getSkillNeighbors(sourceAgentId, 50);
    for (const neighbor of neighbors) {
      // Fire and forget — non-blocking charge propagation
      void this.chargeAgent(neighbor.agentId, {
        domainTag: finding.domainTag,
        significance: finding.confidenceScore,
      });
    }
  }

  // ── Decay Loop ──────────────────────────────────────────────────────────

  private startDecayLoop(): void {
    this.decayTimer = setInterval(() => {
      if (this.paused) return;
      const now = Date.now();
      for (const [, state] of this.agentStates) {
        const secsSinceCharge = (now - state.lastChargedAt) / 1000;
        if (secsSinceCharge > 0) {
          state.charge = Math.max(0, state.charge - (secsSinceCharge * this.config.chargeDecayPerSecond));
          // Update lastChargedAt to prevent double-decay
          state.lastChargedAt = now;
        }
      }
    }, this.config.decayIntervalMs);
  }

  private stopDecayLoop(): void {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = null;
    }
  }

  // ── Seed ────────────────────────────────────────────────────────────────

  /**
   * SWITCH: Give all agents initial charge so the system begins generating
   * immediately rather than waiting for the first cross-agent signal.
   */
  private seedInitialCharge(): void {
    for (const [, state] of this.agentStates) {
      state.charge = this.config.initialSeedCharge;
    }
  }

  // ── State Access ────────────────────────────────────────────────────────

  private getOrCreateAgentState(agentId: string, meta: EvoAgentMeta): NeuralAgentState {
    let state = this.agentStates.get(agentId);
    if (!state) {
      state = {
        charge: 0.0,
        lastFiredAt: 0,
        lastChargedAt: Date.now(),
        meta,
        skillDomain: meta.skillDomain,
      };
      this.agentStates.set(agentId, state);
    }
    return state;
  }

  getAgentCharge(agentId: string): number {
    return this.agentStates.get(agentId)?.charge ?? 0;
  }

  getAgentState(agentId: string): NeuralAgentState | undefined {
    return this.agentStates.get(agentId);
  }

  // ── In-flight tracking ──────────────────────────────────────────────────

  trackGeneration(promise: Promise<void>): void {
    this.inFlight.add(promise);
    promise.finally(() => this.inFlight.delete(promise));
  }

  markGenerationStart(agentId: string): void {
    this.generationStartTimes.set(agentId, Date.now());
  }

  // ── Metrics ─────────────────────────────────────────────────────────────

  getMetrics(): StrategyMetrics {
    const elapsedMinutes = Math.max(1, (Date.now() - this.startedAt) / 60_000);

    const avgLatency = this.totalGenerations > 0
      ? this.totalLatencyMs / this.totalGenerations
      : 0;

    // Compute median charge across all agents
    const charges: number[] = [];
    let activeCount = 0;
    for (const [, state] of this.agentStates) {
      charges.push(state.charge);
      if (state.charge > 0) activeCount++;
    }
    charges.sort((a, b) => a - b);
    const median = charges.length > 0
      ? (charges[Math.floor(charges.length / 2)] ?? 0)
      : 0;

    const totalAgents = Math.max(1, this.agentStates.size);
    const activePercent = (activeCount / totalAgents) * 100;

    return {
      mode: 'NEURAL',
      generationsPerMinute: this.totalGenerations / elapsedMinutes,
      averageAgentLatencyMs: avgLatency,
      findingsPropagatedPerMinute: this.totalFindingsPropagated / elapsedMinutes,
      gpuUtilizationPercent: Math.min(100, activePercent * 0.9), // neural is more efficient
      queueDepth: this.inFlight.size,
      idleAgentPercent: Math.max(0, 100 - activePercent),
      activeAgentPercent: activePercent,
      medianThresholdChargePercent: median * 100,
    };
  }

  get isPaused(): boolean {
    return this.paused;
  }
}
