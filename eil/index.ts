/**
 * EVO Intelligence Layer — Main Entry Point
 *
 * The EvoIntelligenceLayer class is the single integration point for
 * the entire EIL system. It orchestrates initialization, lifecycle,
 * and monitoring for all components.
 *
 * Usage:
 *   const eil = new EvoIntelligenceLayer({ config, llm, storage });
 *   await eil.initialize();
 *   await eil.start();
 *   // ...
 *   await eil.pause();
 *   const status = eil.getStatus();
 *
 * EVO: The EIL is designed to be fully disableable via `enabled: false`
 * in the config. No existing Mastra agent files are ever modified.
 */

// ── Re-exports (barrel) ─────────────────────────────────────────────────────

// Core
export type {
  FindingType,
  EvoAgentMeta,
  Finding,
  ScoredFinding,
  ResearchDirective,
  EvoConfig,
  ClusterSummary,
  CrossColonyPattern,
  OptimizationResult,
  OptimizationState,
  WorkflowTopologySnapshot,
  BenchmarkTask,
  BenchmarkResult,
  ClusterBenchmarkResult,
  TopologyComparisonResult,
  EILStatus,
  EvoLLM,
  EvoStorageAdapter,
} from './core/types.js';
export { DEFAULT_EVO_CONFIG } from './core/types.js';
export { EvoRegistry } from './core/registry.js';
export { EvoEventBus } from './core/event-bus.js';
export { EvoStorage, InMemoryStorageAdapter } from './core/storage.js';

// Agents
export { EvoAgentHarness } from './agents/evo-agent-harness.js';
export type { MastraAgentLike } from './agents/evo-agent-harness.js';
export { EvoSupervisorAgent } from './agents/supervisor-agent.js';
export { EvoMetaAgent } from './agents/meta-agent.js';
export type { MetaAgentDomain } from './agents/meta-agent.js';

// Workflows
export { EvolutionCycleWorkflow } from './workflows/evolution-cycle.workflow.js';
export { TopologyMutationWorkflow } from './workflows/topology-mutation.workflow.js';

// Optimizers
export { TextGradOptimizer } from './optimizers/text-grad.optimizer.js';
export { AFlowOptimizer } from './optimizers/aflow.optimizer.js';
export { MiproOptimizer } from './optimizers/mipro.optimizer.js';
export { OptimizerManager } from './optimizers/optimizer.manager.js';

// Evaluators
export { EvoScorer } from './evaluators/evo-scorer.js';
export { SignificanceFilter } from './evaluators/significance-filter.js';
export { BenchmarkRunner } from './evaluators/benchmark.runner.js';

// Bible (Layer 6)
export { BibleLayer } from './bible/bible-layer.js';
export { BibleEnforcer } from './bible/bible-enforcer.js';
export { ProbationManager } from './bible/probation-manager.js';
export { ConfessionGenerator } from './bible/confession-generator.js';
export { THE_TEN_LAWS, getLawById, getLawByName } from './bible/laws.js';
export type {
  BibleLaw,
  ViolationType,
  Violation,
  ViolationResult,
  ViolationRecord,
  ArchivedAgentState,
  ConfessionStamp,
  AgentState,
  ProbationRecord,
  BibleEnforcerConfig,
  BibleLayerResult,
  LawEvaluationResponse,
} from './bible/types.js';
export { DEFAULT_BIBLE_CONFIG } from './bible/types.js';

// Switch (Cyclic ⟷ Neural Runtime Mode)
export { CyclicExecutionStrategy, EvoTierAssigner, EvoScheduler } from './switch/cyclic-strategy.js';
export { NeuralExecutionStrategy } from './switch/neural-strategy.js';
export { EvoModeController } from './switch/mode-controller.js';
export { EvoModeComparator } from './switch/mode-comparator.js';
export type {
  RuntimeMode,
  IEvoExecutionStrategy,
  StrategyMetrics,
  SwitchRecord,
  SwitchResult,
  NeuralAgentState,
  NeuralSupervisorState,
  NeuralConfig,
  CyclicConfig,
  DomainSignal,
  ClusterSignal,
  ModeTransitionCheckpoint,
  ModeMetricsRecord,
  AggregatedMetrics,
  ComparisonReport,
  AgentTier,
} from './switch/types.js';
export { DEFAULT_CYCLIC_CONFIG, DEFAULT_NEURAL_CONFIG } from './switch/types.js';

// ── Imports for EIL class ───────────────────────────────────────────────────

import {
  type EvoConfig,
  type EvoLLM,
  type EvoStorageAdapter,
  type EILStatus,
  DEFAULT_EVO_CONFIG,
} from './core/types.js';
import { EvoRegistry } from './core/registry.js';
import { EvoEventBus } from './core/event-bus.js';
import { EvoStorage, InMemoryStorageAdapter } from './core/storage.js';
import { EvoSupervisorAgent } from './agents/supervisor-agent.js';
import { EvoMetaAgent, type MetaAgentDomain } from './agents/meta-agent.js';
import { EvolutionCycleWorkflow } from './workflows/evolution-cycle.workflow.js';
import { TopologyMutationWorkflow } from './workflows/topology-mutation.workflow.js';
import { OptimizerManager } from './optimizers/optimizer.manager.js';
import { EvoScorer } from './evaluators/evo-scorer.js';
import { SignificanceFilter } from './evaluators/significance-filter.js';
import { BenchmarkRunner } from './evaluators/benchmark.runner.js';
import { BibleLayer } from './bible/bible-layer.js';
import { BibleEnforcer } from './bible/bible-enforcer.js';
import { ProbationManager } from './bible/probation-manager.js';
import { DEFAULT_BIBLE_CONFIG, type BibleEnforcerConfig } from './bible/types.js';
import type { RuntimeMode, CyclicConfig, NeuralConfig } from './switch/types.js';
import { DEFAULT_CYCLIC_CONFIG, DEFAULT_NEURAL_CONFIG } from './switch/types.js';
import { CyclicExecutionStrategy, EvoTierAssigner, EvoScheduler } from './switch/cyclic-strategy.js';
import { NeuralExecutionStrategy } from './switch/neural-strategy.js';
import { EvoModeController } from './switch/mode-controller.js';
import { EvoModeComparator } from './switch/mode-comparator.js';

// ─── EIL Configuration ───────────────────────────────────────────────────────

export interface EILConfig {
  /** Master switch — set false to disable all EIL behavior. */
  enabled: boolean;
  /** Path to the agents/ directory. */
  agentsDir: string;
  /** EvoConfig overrides. */
  evo?: Partial<EvoConfig>;
  /** LLM for fast operations (scoring, evaluation). */
  fastLLM: EvoLLM;
  /** LLM for heavyweight operations (synthesis, optimization). */
  synthesisLLM?: EvoLLM;
  /** LLM for Bible constitutional evaluation (neutral judge). */
  judgeLLM?: EvoLLM;
  /** Storage adapter (defaults to in-memory). */
  storageAdapter?: EvoStorageAdapter;
  /** Optional embedding function for semantic clustering. */
  embedFn?: (text: string) => Promise<number[]>;
  /** Bible Layer configuration (defaults to DEFAULT_BIBLE_CONFIG). */
  bibleConfig?: Partial<BibleEnforcerConfig>;
  /** Initial runtime mode (defaults to CYCLIC). */
  initialMode?: RuntimeMode;
  /** Cyclic strategy overrides. */
  cyclicConfig?: Partial<CyclicConfig>;
  /** Neural strategy overrides (registry/eventBus/harnessMap injected automatically). */
  neuralConfig?: Partial<Omit<NeuralConfig, 'registry' | 'eventBus' | 'harnessMap'>>;
}

// ─── EVO Intelligence Layer ─────────────────────────────────────────────────

export class EvoIntelligenceLayer {
  private config: EILConfig;
  private evoConfig: EvoConfig;

  // Core
  private registry: EvoRegistry;
  private eventBus: EvoEventBus;
  private storage: EvoStorage;

  // Agents
  private supervisors: Map<string, EvoSupervisorAgent> = new Map();
  private metaAgents: EvoMetaAgent[] = [];

  // Workflows
  private evolutionCycle: EvolutionCycleWorkflow | null = null;
  private topologyMutation: TopologyMutationWorkflow | null = null;

  // Optimizers
  private optimizerManager: OptimizerManager | null = null;

  // Evaluators
  private scorer: EvoScorer;
  private significanceFilter: SignificanceFilter;
  private benchmarkRunner: BenchmarkRunner;

  // Bible (Layer 6)
  private bibleLayer: BibleLayer | null = null;

  // Switch (Cyclic ⟷ Neural)
  private modeController: EvoModeController | null = null;
  private modeComparator: EvoModeComparator | null = null;

  // Lifecycle
  private cycleTimer: ReturnType<typeof setInterval> | null = null;
  private topologyTimer: ReturnType<typeof setInterval> | null = null;
  private cycleCount = 0;
  private state: 'uninitialized' | 'initialized' | 'running' | 'paused' = 'uninitialized';

  constructor(config: EILConfig) {
    this.config = config;
    this.evoConfig = { ...DEFAULT_EVO_CONFIG, ...config.evo };

    const storageAdapter = config.storageAdapter ?? new InMemoryStorageAdapter();

    this.registry = new EvoRegistry(this.evoConfig);
    this.eventBus = new EvoEventBus();
    this.storage = new EvoStorage(storageAdapter);

    this.scorer = new EvoScorer({ llm: config.fastLLM });
    this.significanceFilter = new SignificanceFilter({
      baseThreshold: this.evoConfig.findingThreshold,
    });
    this.benchmarkRunner = new BenchmarkRunner({
      llm: config.fastLLM,
      registry: this.registry,
      storage: this.storage,
    });
  }

  // ── Initialization ────────────────────────────────────────────────────────

  /**
   * EVO: Initialize the entire EIL. This:
   *   1. Scans and registers all 96k agents
   *   2. Builds cluster/colony topology
   *   3. Creates supervisor agents (one per cluster)
   *   4. Creates meta-agents (one per domain)
   *   5. Wires up workflows and optimizers
   *
   * @param onProgress Optional progress callback relayed from registry scan.
   */
  async initialize(
    onProgress?: (scanned: number, total: number) => void,
  ): Promise<void> {
    if (!this.config.enabled) return;

    // Step 1-2: Register agents and build topology
    await this.registry.initialize(this.config.agentsDir, this.config.embedFn, onProgress);

    // Step 3: Create supervisors
    const clusterIds = this.registry.getAllClusterIds();
    for (const clusterId of clusterIds) {
      const supervisor = new EvoSupervisorAgent({
        clusterId,
        llm: this.config.fastLLM,
        registry: this.registry,
        eventBus: this.eventBus,
        storage: this.storage,
        significanceThreshold: this.evoConfig.findingThreshold,
      });
      this.supervisors.set(clusterId, supervisor);
    }

    // Step 4: Create meta-agents
    const synthesisLLM = this.config.synthesisLLM ?? this.config.fastLLM;
    const colonyIds = this.registry.getAllColonyIds();
    const metaDomains: MetaAgentDomain[] = [
      'SCIENCES',
      'ENGINEERING_SYSTEMS',
      'ABSTRACT_THEORETICAL',
    ];

    // Distribute colonies across meta-agents (round-robin)
    const colonyAssignments: Record<MetaAgentDomain, string[]> = {
      SCIENCES: [],
      ENGINEERING_SYSTEMS: [],
      ABSTRACT_THEORETICAL: [],
    };

    colonyIds.forEach((colonyId, idx) => {
      const domain = metaDomains[idx % metaDomains.length]!;
      colonyAssignments[domain].push(colonyId);
    });

    for (const domain of metaDomains) {
      const meta = new EvoMetaAgent({
        domain,
        llm: synthesisLLM,
        eventBus: this.eventBus,
        storage: this.storage,
        assignedColonies: colonyAssignments[domain],
      });
      this.metaAgents.push(meta);
    }

    // Step 5: Wire up optimizer manager
    this.optimizerManager = new OptimizerManager({
      llm: this.config.fastLLM,
      registry: this.registry,
      storage: this.storage,
    });

    // Wire up workflows
    this.evolutionCycle = new EvolutionCycleWorkflow({
      config: this.evoConfig,
      registry: this.registry,
      eventBus: this.eventBus,
      storage: this.storage,
      supervisors: this.supervisors,
      metaAgents: this.metaAgents,
      optimizeFn: async (bottomPerformers) => {
        if (!this.optimizerManager) return [];
        return this.optimizerManager.optimizeBatch(bottomPerformers, []);
      },
    });

    this.topologyMutation = new TopologyMutationWorkflow({
      config: this.evoConfig,
      registry: this.registry,
      eventBus: this.eventBus,
      storage: this.storage,
    });

    // Step 6: Create Bible Layer (Layer 6 — Constitutional Enforcement)
    const bibleConfig = { ...DEFAULT_BIBLE_CONFIG, ...this.config.bibleConfig };
    const judgeLLM = this.config.judgeLLM ?? this.config.fastLLM;
    const bibleEnforcer = new BibleEnforcer(bibleConfig, this.storage, this.eventBus, judgeLLM);
    const probationManager = new ProbationManager(this.eventBus, bibleConfig.probationaryOutputCount);
    this.bibleLayer = new BibleLayer(bibleConfig, bibleEnforcer, probationManager, this.storage);

    // Step 7: Create Switch (Cyclic ⟷ Neural Runtime Mode)
    const cyclicCfg: CyclicConfig = { ...DEFAULT_CYCLIC_CONFIG, ...this.config.cyclicConfig };
    const tierAssigner = new EvoTierAssigner();
    const scheduler = new EvoScheduler(this.eventBus);
    const cyclicStrategy = new CyclicExecutionStrategy(
      cyclicCfg, scheduler, tierAssigner, this.registry.agentCount,
    );

    // Build a harness map placeholder — neural strategy needs it for agent firing
    const harnessMap = new Map<string, import('./agents/evo-agent-harness.js').EvoAgentHarness>();
    const neuralCfg: NeuralConfig = {
      ...DEFAULT_NEURAL_CONFIG,
      ...this.config.neuralConfig,
      registry: this.registry,
      eventBus: this.eventBus,
      harnessMap,
    };
    const neuralStrategy = new NeuralExecutionStrategy(neuralCfg);

    const initialMode = this.config.initialMode ?? 'CYCLIC';
    this.modeController = new EvoModeController(
      cyclicStrategy, neuralStrategy, initialMode, this.eventBus, this.storage,
    );
    this.modeComparator = new EvoModeComparator(
      this.modeController, this.storage, this.eventBus, this.config.fastLLM,
    );

    this.state = 'initialized';
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Start the evolution cycle timer.
   */
  async start(): Promise<void> {
    if (!this.config.enabled || this.state === 'uninitialized') return;

    this.state = 'running';

    // Start evolution cycle on interval
    this.cycleTimer = setInterval(async () => {
      if (this.state !== 'running') return;
      await this.runEvolutionCycle();
    }, this.evoConfig.cycleDurationMs);

    // Start topology mutation on slower interval (every 4 cycles)
    this.topologyTimer = setInterval(async () => {
      if (this.state !== 'running') return;
      await this.runTopologyMutation();
    }, this.evoConfig.cycleDurationMs * 4);
  }

  /**
   * Pause all evolution activity.
   */
  pause(): void {
    this.state = 'paused';
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
    if (this.topologyTimer) {
      clearInterval(this.topologyTimer);
      this.topologyTimer = null;
    }
    this.eventBus.pause();
  }

  /**
   * Resume from paused state.
   */
  async resume(): Promise<void> {
    if (this.state !== 'paused') return;
    this.eventBus.resume();
    await this.start();
  }

  /**
   * Force an immediate evolution cycle (useful for testing/debugging).
   */
  async forceEvolutionCycle(): Promise<void> {
    await this.runEvolutionCycle();
  }

  /**
   * Force an immediate topology mutation.
   */
  async forceTopologyMutation(): Promise<void> {
    await this.runTopologyMutation();
  }

  // ── Internal Cycle Runners ────────────────────────────────────────────────

  private async runEvolutionCycle(): Promise<void> {
    if (!this.evolutionCycle) return;
    try {
      await this.evolutionCycle.runCycle();
      this.cycleCount++;
    } catch (error) {
      // EVO: Swallow errors to prevent cycle failure from crashing the system
      console.error('[EIL] Evolution cycle error:', error);
    }
  }

  private async runTopologyMutation(): Promise<void> {
    if (!this.topologyMutation) return;
    try {
      await this.topologyMutation.run();
    } catch (error) {
      console.error('[EIL] Topology mutation error:', error);
    }
  }

  // ── Status ────────────────────────────────────────────────────────────────

  getStatus(): EILStatus {
    return {
      enabled: this.config.enabled,
      state: this.state,
      agentCount: this.registry.agentCount,
      clusterCount: this.registry.getAllClusterIds().length,
      colonyCount: this.registry.getAllColonyIds().length,
      supervisorCount: this.supervisors.size,
      metaAgentCount: this.metaAgents.length,
      cycleCount: this.cycleCount,
      eventBusEventCount: this.eventBus.auditLogSize,
      optimizerActiveAgents: this.optimizerManager?.activeAgentCount ?? 0,
    };
  }

  // ── Accessors (for advanced use) ──────────────────────────────────────────

  getRegistry(): EvoRegistry {
    return this.registry;
  }

  getEventBus(): EvoEventBus {
    return this.eventBus;
  }

  getStorage(): EvoStorage {
    return this.storage;
  }

  getScorer(): EvoScorer {
    return this.scorer;
  }

  getSignificanceFilter(): SignificanceFilter {
    return this.significanceFilter;
  }

  getBenchmarkRunner(): BenchmarkRunner {
    return this.benchmarkRunner;
  }

  getOptimizerManager(): OptimizerManager | null {
    return this.optimizerManager;
  }

  getBibleLayer(): BibleLayer | null {
    return this.bibleLayer;
  }

  getModeController(): EvoModeController | null {
    return this.modeController;
  }

  getModeComparator(): EvoModeComparator | null {
    return this.modeComparator;
  }
}
