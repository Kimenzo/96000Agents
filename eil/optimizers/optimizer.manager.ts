/**
 * EVO Intelligence Layer — Optimizer Manager
 *
 * Coordinates the three optimizers in a cascading strategy:
 *   1. TextGrad first (fastest convergence for prompt refinement)
 *   2. MIPRO if TextGrad stalls (example selection may be the bottleneck)
 *   3. AFlow if both stall (the workflow structure itself may need evolution)
 *
 * EVO: The manager tracks which optimizer each agent is currently using
 * and manages escalation. This prevents wasting compute on an optimizer
 * that has already converged for a given agent.
 */

import type {
  EvoLLM,
  EvoConfig,
  OptimizationResult,
  OptimizationState,
  BenchmarkTask,
} from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoStorage } from '../core/storage.js';
import { TextGradOptimizer, type TextGradConfig } from './text-grad.optimizer.js';
import { MiproOptimizer, type MiproConfig, type Example } from './mipro.optimizer.js';
import { AFlowOptimizer, type AFlowConfig, type WorkflowGraph, type WorkflowNode, type WorkflowEdge } from './aflow.optimizer.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OptimizerManagerConfig {
  textGrad?: Partial<TextGradConfig>;
  mipro?: Partial<MiproConfig>;
  aflow?: Partial<AFlowConfig>;
  /** Max consecutive stalls before escalation. */
  stallThreshold: number;
  /** Minimum score improvement to consider non-stalled. */
  improvementFloor: number;
}

export const DEFAULT_OPTIMIZER_MANAGER_CONFIG: OptimizerManagerConfig = {
  stallThreshold: 2,
  improvementFloor: 0.015,
};

// ─── Optimizer Manager ────────────────────────────────────────────────────────

export class OptimizerManager {
  private textGrad: TextGradOptimizer;
  private mipro: MiproOptimizer;
  private aflow: AFlowOptimizer;
  private registry: EvoRegistry;
  private storage: EvoStorage;
  private config: OptimizerManagerConfig;

  /** Per-agent optimization state tracking. */
  private agentStates: Map<string, OptimizationState> = new Map();

  constructor(deps: {
    llm: EvoLLM;
    registry: EvoRegistry;
    storage: EvoStorage;
    config?: Partial<OptimizerManagerConfig>;
  }) {
    this.registry = deps.registry;
    this.storage = deps.storage;
    this.config = { ...DEFAULT_OPTIMIZER_MANAGER_CONFIG, ...deps.config };

    this.textGrad = new TextGradOptimizer({
      llm: deps.llm,
      registry: deps.registry,
      storage: deps.storage,
      config: this.config.textGrad,
    });

    this.mipro = new MiproOptimizer({
      llm: deps.llm,
      registry: deps.registry,
      storage: deps.storage,
      config: this.config.mipro,
    });

    this.aflow = new AFlowOptimizer({
      llm: deps.llm,
      registry: deps.registry,
      storage: deps.storage,
      config: this.config.aflow,
    });
  }

  // ── Batch Optimization ────────────────────────────────────────────────────

  /**
   * EVO: Optimize a batch of agents. Each agent uses the appropriate
   * optimizer based on its current state and escalation history.
   */
  async optimizeBatch(
    agentIds: string[],
    benchmarkTasks: BenchmarkTask[],
    examplePool?: Example[],
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    for (const agentId of agentIds) {
      const state = this.getOrCreateState(agentId);
      const meta = this.registry.getAgentMeta(agentId);
      const currentInstructions = meta
        ? `Agent ${meta.agentId} — Domain: ${meta.skillDomain}`
        : '';

      let result: OptimizationResult;

      switch (state.phase) {
        case 'TEXT_GRAD':
          result = await this.runTextGrad(agentId, benchmarkTasks, currentInstructions);
          break;

        case 'MIPRO':
          result = await this.runMipro(
            agentId,
            currentInstructions,
            examplePool ?? [],
            benchmarkTasks,
          );
          break;

        case 'AFLOW':
          result = await this.runAFlow(agentId, benchmarkTasks);
          break;

        default:
          // IDLE — skip optimization
          continue;
      }

      // Track and potentially escalate
      this.trackResult(agentId, result);
      results.push(result);
    }

    return results;
  }

  // ── Individual Optimizers ─────────────────────────────────────────────────

  private async runTextGrad(
    agentId: string,
    tasks: BenchmarkTask[],
    instructions: string,
  ): Promise<OptimizationResult> {
    return this.textGrad.optimize(agentId, tasks, instructions);
  }

  private async runMipro(
    agentId: string,
    instructions: string,
    examples: Example[],
    tasks: BenchmarkTask[],
  ): Promise<OptimizationResult> {
    return this.mipro.optimize(agentId, instructions, examples, tasks);
  }

  private async runAFlow(
    agentId: string,
    tasks: BenchmarkTask[],
  ): Promise<OptimizationResult> {
    // Build a simple default graph for the agent
    const graph = this.buildDefaultGraph(agentId);

    // Evaluate function: score graph by running tasks
    const evaluateFn = async (g: WorkflowGraph): Promise<number> => {
      // Simple heuristic: more parallel nodes = potentially faster
      const parallelRatio = g.nodes.filter(n => n.parallel).length / Math.max(1, g.nodes.length);
      const sizePenalty = Math.abs(g.nodes.length - 3) * 0.1; // sweet spot at 3 nodes
      return Math.max(0, 0.5 + parallelRatio * 0.3 - sizePenalty);
    };

    return this.aflow.optimize(agentId, graph, evaluateFn);
  }

  private buildDefaultGraph(agentId: string): WorkflowGraph {
    const nodes: WorkflowNode[] = [
      { nodeId: 'input', agentId, parallel: false },
      { nodeId: 'process', agentId, parallel: false },
      { nodeId: 'output', agentId, parallel: false },
    ];
    const edges: WorkflowEdge[] = [
      { from: 'input', to: 'process' },
      { from: 'process', to: 'output' },
    ];
    return { graphId: `graph-${agentId}`, nodes, edges };
  }

  // ── State Management & Escalation ─────────────────────────────────────────

  private getOrCreateState(agentId: string): OptimizationState {
    let state = this.agentStates.get(agentId);
    if (!state) {
      state = {
        phase: 'TEXT_GRAD',
        consecutiveStalls: 0,
        lastScore: 0,
        totalIterations: 0,
      };
      this.agentStates.set(agentId, state);
    }
    return state;
  }

  /**
   * EVO: Escalation logic.
   * TEXT_GRAD (stall) → MIPRO (stall) → AFLOW (stall) → IDLE
   */
  private trackResult(agentId: string, result: OptimizationResult): void {
    const state = this.getOrCreateState(agentId);
    state.totalIterations += result.iterations;

    const improvement = result.scoreAfter - state.lastScore;
    state.lastScore = result.scoreAfter;

    if (improvement < this.config.improvementFloor) {
      state.consecutiveStalls++;
    } else {
      state.consecutiveStalls = 0;
    }

    // Escalate if stalled too many times
    if (state.consecutiveStalls >= this.config.stallThreshold) {
      state.consecutiveStalls = 0;
      switch (state.phase) {
        case 'TEXT_GRAD':
          state.phase = 'MIPRO';
          break;
        case 'MIPRO':
          state.phase = 'AFLOW';
          break;
        case 'AFLOW':
          state.phase = 'IDLE';
          break;
      }
    }

    this.agentStates.set(agentId, state);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  getAgentState(agentId: string): OptimizationState | undefined {
    return this.agentStates.get(agentId);
  }

  resetAgent(agentId: string): void {
    this.agentStates.delete(agentId);
  }

  resetAll(): void {
    this.agentStates.clear();
  }

  /** Force an agent to a specific optimizer phase. */
  setAgentPhase(
    agentId: string,
    phase: OptimizationState['phase'],
  ): void {
    const state = this.getOrCreateState(agentId);
    state.phase = phase;
    state.consecutiveStalls = 0;
    this.agentStates.set(agentId, state);
  }

  get activeAgentCount(): number {
    let count = 0;
    for (const state of this.agentStates.values()) {
      if (state.phase !== 'IDLE') count++;
    }
    return count;
  }
}
