/**
 * EVO Intelligence Layer — AFlow Optimizer
 *
 * Implements workflow topology search: explores structural changes to
 * how agents are composed and connected. Uses tournament selection
 * with mutations (swap, parallelize, branch, remove).
 *
 * EVO: AFlow operates at a HIGHER level than TextGrad. Where TextGrad
 * optimizes individual agent prompts, AFlow optimizes the DAG structure
 * of multi-agent workflows. It is the last resort optimizer — used when
 * both TextGrad and MIPRO have stalled.
 *
 * Mutation operators:
 *   - SWAP: Exchange two agents' positions in a workflow
 *   - PARALLELIZE: Convert sequential steps to parallel execution
 *   - BRANCH: Add a conditional branch point
 *   - REMOVE: Eliminate a redundant step
 */

import type { EvoLLM, OptimizationResult } from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoStorage } from '../core/storage.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AFlowConfig {
  /** Number of candidate topologies per generation. */
  populationSize: number;
  /** Number of tournament rounds. */
  generations: number;
  /** Probability of each mutation type. */
  mutationRates: {
    swap: number;
    parallelize: number;
    branch: number;
    remove: number;
  };
  /** Minimum fitness improvement to accept. */
  improvementThreshold: number;
}

export const DEFAULT_AFLOW_CONFIG: AFlowConfig = {
  populationSize: 6,
  generations: 3,
  mutationRates: {
    swap: 0.35,
    parallelize: 0.30,
    branch: 0.20,
    remove: 0.15,
  },
  improvementThreshold: 0.02,
};

/** A lightweight representation of a workflow topology. */
export interface WorkflowGraph {
  graphId: string;
  /** Nodes are agent/step IDs in execution order. */
  nodes: WorkflowNode[];
  /** Edges define data flow between nodes. */
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  nodeId: string;
  agentId: string;
  /** If true, this node can execute in parallel with siblings. */
  parallel: boolean;
  /** Optional condition for branching. */
  condition?: string;
}

export interface WorkflowEdge {
  from: string;
  to: string;
}

type AFlowMutation = 'SWAP' | 'PARALLELIZE' | 'BRANCH' | 'REMOVE';

// ─── AFlow Optimizer ──────────────────────────────────────────────────────────

export class AFlowOptimizer {
  private llm: EvoLLM;
  private registry: EvoRegistry;
  private storage: EvoStorage;
  private config: AFlowConfig;

  constructor(deps: {
    llm: EvoLLM;
    registry: EvoRegistry;
    storage: EvoStorage;
    config?: Partial<AFlowConfig>;
  }) {
    this.llm = deps.llm;
    this.registry = deps.registry;
    this.storage = deps.storage;
    this.config = { ...DEFAULT_AFLOW_CONFIG, ...deps.config };
  }

  // ── Main Optimization ─────────────────────────────────────────────────────

  /**
   * EVO: Run AFlow topology optimization. Takes a workflow graph and
   * returns an optimization result with the best topology found.
   */
  async optimize(
    agentId: string,
    baselineGraph: WorkflowGraph,
    evaluateFn: (graph: WorkflowGraph) => Promise<number>,
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const baselineScore = await evaluateFn(baselineGraph);

    let bestGraph = baselineGraph;
    let bestScore = baselineScore;
    let totalIterations = 0;

    for (let gen = 0; gen < this.config.generations; gen++) {
      // Generate population of mutated candidates
      const candidates: WorkflowGraph[] = [];
      for (let p = 0; p < this.config.populationSize; p++) {
        const mutated = this.mutateGraph(bestGraph);
        candidates.push(mutated);
      }

      // Evaluate all candidates
      const scored: Array<{ graph: WorkflowGraph; score: number }> = [];
      for (const candidate of candidates) {
        const score = await evaluateFn(candidate);
        scored.push({ graph: candidate, score });
        totalIterations++;
      }

      // Tournament selection: pick the best
      scored.sort((a, b) => b.score - a.score);
      const generationBest = scored[0];
      if (generationBest && generationBest.score > bestScore + this.config.improvementThreshold) {
        bestScore = generationBest.score;
        bestGraph = generationBest.graph;
      }
    }

    // Serialize the best topology as the "prompt" — in AFlow, the topology IS the optimization target
    const topologyDescription = this.serializeGraph(bestGraph);

    return {
      agentId,
      previousPrompt: this.serializeGraph(baselineGraph),
      newPrompt: topologyDescription,
      scoreBefore: baselineScore,
      scoreAfter: bestScore,
      iterations: totalIterations,
      converged: bestScore <= baselineScore + this.config.improvementThreshold,
      optimizerUsed: 'AFLOW',
      durationMs: Date.now() - startTime,
      promptVersion: 0, // topology versions managed separately
    };
  }

  // ── Mutation Operators ────────────────────────────────────────────────────

  /**
   * EVO: Apply a random mutation to a workflow graph.
   * Selection weighted by configured mutation rates.
   */
  private mutateGraph(graph: WorkflowGraph): WorkflowGraph {
    const mutationType = this.selectMutationType();
    // Deep clone
    const clone: WorkflowGraph = {
      graphId: `${graph.graphId}-mut-${Date.now().toString(36)}`,
      nodes: graph.nodes.map(n => ({ ...n })),
      edges: graph.edges.map(e => ({ ...e })),
    };

    switch (mutationType) {
      case 'SWAP':
        return this.mutateSwap(clone);
      case 'PARALLELIZE':
        return this.mutateParallelize(clone);
      case 'BRANCH':
        return this.mutateBranch(clone);
      case 'REMOVE':
        return this.mutateRemove(clone);
      default:
        return clone;
    }
  }

  private selectMutationType(): AFlowMutation {
    const rates = this.config.mutationRates;
    const r = Math.random();
    let cumulative = 0;

    cumulative += rates.swap;
    if (r < cumulative) return 'SWAP';
    cumulative += rates.parallelize;
    if (r < cumulative) return 'PARALLELIZE';
    cumulative += rates.branch;
    if (r < cumulative) return 'BRANCH';
    return 'REMOVE';
  }

  /** Swap two nodes' agent assignments. */
  private mutateSwap(graph: WorkflowGraph): WorkflowGraph {
    if (graph.nodes.length < 2) return graph;
    const i = Math.floor(Math.random() * graph.nodes.length);
    let j = Math.floor(Math.random() * graph.nodes.length);
    while (j === i && graph.nodes.length > 1) {
      j = Math.floor(Math.random() * graph.nodes.length);
    }
    const nodeI = graph.nodes[i]!;
    const nodeJ = graph.nodes[j]!;
    const tempAgentId = nodeI.agentId;
    nodeI.agentId = nodeJ.agentId;
    nodeJ.agentId = tempAgentId;
    return graph;
  }

  /** Mark sequential nodes as parallelizable. */
  private mutateParallelize(graph: WorkflowGraph): WorkflowGraph {
    // Find two sequential nodes that could run in parallel
    for (const node of graph.nodes) {
      if (!node.parallel && Math.random() > 0.5) {
        node.parallel = true;
        break;
      }
    }
    return graph;
  }

  /** Add a conditional branch. */
  private mutateBranch(graph: WorkflowGraph): WorkflowGraph {
    if (graph.nodes.length === 0) return graph;
    const idx = Math.floor(Math.random() * graph.nodes.length);
    const node = graph.nodes[idx]!;
    if (!node.condition) {
      node.condition = `branch-${Date.now().toString(36)}`;
    }
    return graph;
  }

  /** Remove a non-critical node. */
  private mutateRemove(graph: WorkflowGraph): WorkflowGraph {
    if (graph.nodes.length <= 2) return graph; // don't remove if too small
    const idx = Math.floor(Math.random() * graph.nodes.length);
    const removedNode = graph.nodes[idx]!;
    graph.nodes.splice(idx, 1);
    // Reconnect edges
    graph.edges = graph.edges.filter(
      e => e.from !== removedNode.nodeId && e.to !== removedNode.nodeId,
    );
    return graph;
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  private serializeGraph(graph: WorkflowGraph): string {
    return JSON.stringify({
      graphId: graph.graphId,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      parallelNodes: graph.nodes.filter(n => n.parallel).length,
      branchNodes: graph.nodes.filter(n => n.condition).length,
    });
  }
}
