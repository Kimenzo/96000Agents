/**
 * EVO Intelligence Layer — Switch Types
 *
 * SWITCH: All shared TypeScript types for the Cyclic ⟷ Neural runtime
 * mode architecture. Every mode-sensitive subsystem programs against
 * IEvoExecutionStrategy — never against Cyclic or Neural directly.
 */

import type { EvoAgentMeta, Finding, EvoLLM } from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoEventBus } from '../core/event-bus.js';
import type { EvoAgentHarness } from '../agents/evo-agent-harness.js';

// ─── Runtime Mode ─────────────────────────────────────────────────────────────

export type RuntimeMode = 'CYCLIC' | 'NEURAL';

// ─── Execution Strategy Interface ─────────────────────────────────────────────

/**
 * SWITCH: The single interface every mode-sensitive subsystem uses.
 * When the switch flips, the implementation behind this interface changes.
 * The subsystems never know.
 */
export interface IEvoExecutionStrategy {
  readonly mode: RuntimeMode;

  /** Called by each EvoAgentHarness to determine if it should generate now. */
  shouldAgentGenerate(agentId: string, meta: EvoAgentMeta): boolean;

  /** Called after an agent generates — strategy decides what to do next. */
  onAgentGenerated(agentId: string, finding: Finding | null): void;

  /** Called by supervisors — strategy decides when to compress/integrate. */
  onFindingReceived(clusterId: string, finding: Finding): void;

  /** Called by meta-agents — strategy decides when to synthesize. */
  onClusterSignalReceived(colonyId: string, signal: ClusterSignal): void;

  /** Lifecycle */
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  getMetrics(): StrategyMetrics;
}

// ─── Strategy Metrics ─────────────────────────────────────────────────────────

/** Metrics every strategy must expose for comparison. */
export interface StrategyMetrics {
  mode: RuntimeMode;
  generationsPerMinute: number;
  averageAgentLatencyMs: number;
  findingsPropagatedPerMinute: number;
  gpuUtilizationPercent: number;
  queueDepth: number;
  idleAgentPercent: number;
  activeAgentPercent: number;
  /** Cyclic only — time to complete one evolution cycle. */
  cycleCompletionTimeMs?: number;
  /** Neural only — median charge level across all agents. */
  medianThresholdChargePercent?: number;
}

// ─── Cluster Signal ───────────────────────────────────────────────────────────

/** Signal emitted by a supervisor when a cluster accumulates significance. */
export interface ClusterSignal {
  clusterId: string;
  colonyId: string;
  accumulatedSignificance: number;
  findingCount: number;
  dominantDomain: string;
  timestamp: string;
}

// ─── Domain Signal ────────────────────────────────────────────────────────────

/** Per-finding signal broadcast to agents for neural charge computation. */
export interface DomainSignal {
  domainTag: string;
  significance: number;
}

// ─── Neural Agent State ───────────────────────────────────────────────────────

/** Per-agent charge state in neural mode. */
export interface NeuralAgentState {
  charge: number;            // 0.0 – 1.0
  lastFiredAt: number;       // epoch ms
  lastChargedAt: number;     // epoch ms
  meta: EvoAgentMeta;
  skillDomain: string;
}

// ─── Neural Supervisor State ──────────────────────────────────────────────────

/** Per-supervisor integration state in neural mode. */
export interface NeuralSupervisorState {
  clusterId: string;
  accumulatedSignificance: number;
  lastFiredAt: number;
  findingSinceLastFire: number;
}

// ─── Configs ──────────────────────────────────────────────────────────────────

export interface CyclicConfig {
  /** Milliseconds between evolution cycles. Default: 3,600,000 (1 hour). */
  cycleIntervalMs: number;
}

export const DEFAULT_CYCLIC_CONFIG: CyclicConfig = {
  cycleIntervalMs: 3_600_000,
};

export interface NeuralConfig {
  /** Charge increment per domain-relevant signal. Default: 0.15. */
  chargeIncrement: number;
  /** Charge decay per second of no signal. Default: 0.05. */
  chargeDecayPerSecond: number;
  /** Initial seed charge for all agents. Default: 0.3. */
  initialSeedCharge: number;
  /** Significance threshold for supervisor firing. Default: 5.0. */
  supervisorThreshold: number;
  /** Decay loop interval in ms. Default: 1000. */
  decayIntervalMs: number;
  /** Registry for domain proximity lookups. */
  registry: EvoRegistry;
  /** Event bus for signal propagation. */
  eventBus: EvoEventBus;
  /** Harness map — agentId → harness reference. */
  harnessMap: Map<string, EvoAgentHarness>;
}

export const DEFAULT_NEURAL_CONFIG: Omit<NeuralConfig, 'registry' | 'eventBus' | 'harnessMap'> = {
  chargeIncrement: 0.15,
  chargeDecayPerSecond: 0.05,
  initialSeedCharge: 0.3,
  supervisorThreshold: 5.0,
  decayIntervalMs: 1000,
};

// ─── Switch Records ───────────────────────────────────────────────────────────

export interface SwitchRecord {
  from: RuntimeMode;
  to: RuntimeMode;
  reason: string;
  timestamp: number;
  metricsAtSwitch: StrategyMetrics;
}

export interface SwitchResult {
  success: boolean;
  from?: RuntimeMode;
  to?: RuntimeMode;
  reason?: string;
  transitionDurationMs?: number;
}

// ─── Mode Transition Checkpoint ───────────────────────────────────────────────

export interface ModeTransitionCheckpoint {
  from: RuntimeMode;
  to: RuntimeMode;
  timestamp: number;
  metricsAtTransition: StrategyMetrics;
}

// ─── Metrics History ──────────────────────────────────────────────────────────

export interface ModeMetricsRecord extends StrategyMetrics {
  timestamp: number;
}

export interface AggregatedMetrics {
  avgGenerationsPerMinute: number;
  avgAgentLatencyMs: number;
  avgFindingsPerMinute: number;
  avgGpuUtilization: number;
  avgIdleAgentPercent: number;
  sampleCount: number;
}

export interface ComparisonReport {
  windowMs: number;
  cyclic: AggregatedMetrics | null;
  neural: AggregatedMetrics | null;
  winner: RuntimeMode | 'INSUFFICIENT_DATA';
  recommendation: string;
}

// ─── Tier Assigner ────────────────────────────────────────────────────────────

/** Agent generation tier — determines frequency of generation in cyclic mode. */
export type AgentTier = 1 | 2 | 3;
