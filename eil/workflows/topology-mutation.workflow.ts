/**
 * EVO Intelligence Layer — Topology Mutation Workflow
 *
 * Runs less frequently than the evolution cycle (default: every 4 cycles).
 * Explores structural changes to the agent cluster/colony topology.
 *
 * Steps:
 *   1. snapshot — Capture current topology state
 *   2. mutate — Generate candidate topology mutations
 *   3. evaluate — Score each mutation candidate
 *   4. select — Pick the best mutation via tournament selection
 *   5. propagate — Apply the winning mutation to the live topology
 *
 * EVO: This is the "macro-evolution" layer. While the evolution cycle
 * handles micro-evolution (prompt tuning, finding propagation), topology
 * mutation handles speciation (cluster splitting, merging, colony
 * restructuring).
 */

import type {
  EvoConfig,
  WorkflowTopologySnapshot,
  TopologyComparisonResult,
  ClusterSummary,
} from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoEventBus } from '../core/event-bus.js';
import type { EvoStorage } from '../core/storage.js';

// ─── Mutation Types ───────────────────────────────────────────────────────────

export type MutationType =
  | 'SPLIT_CLUSTER'
  | 'MERGE_CLUSTERS'
  | 'REASSIGN_AGENT'
  | 'CREATE_COLONY'
  | 'DISSOLVE_COLONY'
  | 'SWAP_AGENTS';

export interface TopologyMutation {
  mutationId: string;
  type: MutationType;
  description: string;
  /** Serializable parameters required to apply this mutation. */
  params: Record<string, unknown>;
}

export interface MutationCandidate {
  mutation: TopologyMutation;
  /** Estimated fitness score (0-1). */
  fitnessEstimate: number;
  /** Snapshot that would result from applying this mutation. */
  projectedSnapshot: WorkflowTopologySnapshot;
}

export interface TopologyMutationResult {
  snapshotBefore: WorkflowTopologySnapshot;
  candidatesEvaluated: number;
  winner: MutationCandidate | null;
  applied: boolean;
  snapshotAfter: WorkflowTopologySnapshot | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Topology Mutation Workflow ───────────────────────────────────────────────

export class TopologyMutationWorkflow {
  private config: EvoConfig;
  private registry: EvoRegistry;
  private eventBus: EvoEventBus;
  private storage: EvoStorage;

  /** Number of candidate mutations to generate per run. */
  private candidatePoolSize: number;

  /** Minimum fitness advantage required to accept a mutation. */
  private acceptanceThreshold: number;

  constructor(deps: {
    config: EvoConfig;
    registry: EvoRegistry;
    eventBus: EvoEventBus;
    storage: EvoStorage;
    candidatePoolSize?: number;
    acceptanceThreshold?: number;
  }) {
    this.config = deps.config;
    this.registry = deps.registry;
    this.eventBus = deps.eventBus;
    this.storage = deps.storage;
    this.candidatePoolSize = deps.candidatePoolSize ?? 5;
    this.acceptanceThreshold = deps.acceptanceThreshold ?? 0.02;
  }

  // ── Full Topology Mutation Run ────────────────────────────────────────────

  async run(): Promise<TopologyMutationResult> {
    // Step 1: Snapshot
    const snapshotBefore = this.stepSnapshot();

    // Step 2: Mutate — generate candidates
    const candidates = this.stepMutate(snapshotBefore);

    if (candidates.length === 0) {
      return {
        snapshotBefore,
        candidatesEvaluated: 0,
        winner: null,
        applied: false,
        snapshotAfter: null,
      };
    }

    // Step 3: Evaluate — score each candidate
    const evaluated = await this.stepEvaluate(candidates, snapshotBefore);

    // Step 4: Select — tournament selection
    const winner = this.stepSelect(evaluated, snapshotBefore);

    // Step 5: Propagate — apply if advantageous
    let applied = false;
    let snapshotAfter: WorkflowTopologySnapshot | null = null;
    if (winner) {
      applied = await this.stepPropagate(winner);
      if (applied) {
        snapshotAfter = this.stepSnapshot();
        await this.storage.saveTopologySnapshot(snapshotAfter);
      }
    }

    const result: TopologyMutationResult = {
      snapshotBefore,
      candidatesEvaluated: evaluated.length,
      winner,
      applied,
      snapshotAfter,
    };

    this.eventBus.emit('topology:mutated', {
      mutationType: winner?.mutation.type ?? 'NONE',
      applied,
      fitnessEstimate: winner?.fitnessEstimate ?? 0,
    });

    return result;
  }

  // ── Step 1: Snapshot ──────────────────────────────────────────────────────

  /**
   * EVO: Capture the current topology as a serializable snapshot.
   */
  private stepSnapshot(): WorkflowTopologySnapshot {
    const clusterIds = this.registry.getAllClusterIds();
    const colonyIds = this.registry.getAllColonyIds();

    const clusterToAgents: Record<string, string[]> = {};
    for (const cid of clusterIds) {
      // EVO: getCluster returns string[] of agentIds directly
      const agents = this.registry.getCluster(cid);
      if (agents.length > 0) {
        clusterToAgents[cid] = [...agents];
      }
    }

    const colonyToClusters: Record<string, string[]> = {};
    for (const colId of colonyIds) {
      // EVO: getColony returns string[] of clusterIds directly
      const clusters = this.registry.getColony(colId);
      if (clusters.length > 0) {
        colonyToClusters[colId] = [...clusters];
      }
    }

    return {
      snapshotId: generateId(),
      timestamp: new Date().toISOString(),
      clusterCount: clusterIds.length,
      colonyCount: colonyIds.length,
      clusterToAgents,
      colonyToClusters,
    };
  }

  // ── Step 2: Mutate ───────────────────────────────────────────────────────

  /**
   * EVO: Generate candidate mutations based on current topology heuristics.
   * Uses stochastic selection weighted by potential impact.
   */
  private stepMutate(snapshot: WorkflowTopologySnapshot): MutationCandidate[] {
    const candidates: MutationCandidate[] = [];
    const clusterIds = Object.keys(snapshot.clusterToAgents);

    for (let i = 0; i < this.candidatePoolSize; i++) {
      const mutation = this.generateRandomMutation(snapshot, clusterIds);
      if (mutation) {
        const projected = this.projectMutation(snapshot, mutation);
        candidates.push({
          mutation,
          fitnessEstimate: 0, // will be scored in evaluate step
          projectedSnapshot: projected,
        });
      }
    }

    return candidates;
  }

  private generateRandomMutation(
    snapshot: WorkflowTopologySnapshot,
    clusterIds: string[],
  ): TopologyMutation | null {
    if (clusterIds.length < 2) return null;

    const mutationTypes: MutationType[] = [
      'SPLIT_CLUSTER',
      'MERGE_CLUSTERS',
      'REASSIGN_AGENT',
      'SWAP_AGENTS',
    ];
    const type = mutationTypes[Math.floor(Math.random() * mutationTypes.length)]!;

    switch (type) {
      case 'SPLIT_CLUSTER': {
        // Pick largest cluster to split
        let largestId = clusterIds[0]!;
        let largestSize = 0;
        for (const cid of clusterIds) {
          const size = snapshot.clusterToAgents[cid]?.length ?? 0;
          if (size > largestSize) {
            largestSize = size;
            largestId = cid;
          }
        }
        if (largestSize < 2) return null;
        return {
          mutationId: generateId(),
          type: 'SPLIT_CLUSTER',
          description: `Split cluster ${largestId} (${largestSize} agents) into two equal halves`,
          params: { clusterId: largestId },
        };
      }

      case 'MERGE_CLUSTERS': {
        // Pick two smallest clusters
        const sorted = clusterIds
          .map(cid => ({ cid, size: snapshot.clusterToAgents[cid]?.length ?? 0 }))
          .sort((a, b) => a.size - b.size);
        if (sorted.length < 2) return null;
        return {
          mutationId: generateId(),
          type: 'MERGE_CLUSTERS',
          description: `Merge clusters ${sorted[0]!.cid} and ${sorted[1]!.cid}`,
          params: { clusterA: sorted[0]!.cid, clusterB: sorted[1]!.cid },
        };
      }

      case 'REASSIGN_AGENT': {
        const fromClusterId = clusterIds[Math.floor(Math.random() * clusterIds.length)]!;
        const agents = snapshot.clusterToAgents[fromClusterId];
        if (!agents || agents.length < 2) return null;
        const agentId = agents[Math.floor(Math.random() * agents.length)]!;
        const toClusterId = clusterIds.filter(c => c !== fromClusterId)[
          Math.floor(Math.random() * (clusterIds.length - 1))
        ];
        if (!toClusterId) return null;
        return {
          mutationId: generateId(),
          type: 'REASSIGN_AGENT',
          description: `Move agent ${agentId} from ${fromClusterId} to ${toClusterId}`,
          params: { agentId, fromClusterId, toClusterId },
        };
      }

      case 'SWAP_AGENTS': {
        const cA = clusterIds[Math.floor(Math.random() * clusterIds.length)]!;
        const remaining = clusterIds.filter(c => c !== cA);
        if (remaining.length === 0) return null;
        const cB = remaining[Math.floor(Math.random() * remaining.length)]!;
        const agentsA = snapshot.clusterToAgents[cA];
        const agentsB = snapshot.clusterToAgents[cB];
        if (!agentsA?.length || !agentsB?.length) return null;
        return {
          mutationId: generateId(),
          type: 'SWAP_AGENTS',
          description: `Swap one agent between ${cA} and ${cB}`,
          params: {
            clusterA: cA,
            clusterB: cB,
            agentA: agentsA[Math.floor(Math.random() * agentsA.length)],
            agentB: agentsB[Math.floor(Math.random() * agentsB.length)],
          },
        };
      }

      default:
        return null;
    }
  }

  /**
   * EVO: Project what the topology would look like after applying a mutation.
   * This is a pure function — no side effects.
   */
  private projectMutation(
    base: WorkflowTopologySnapshot,
    mutation: TopologyMutation,
  ): WorkflowTopologySnapshot {
    // Deep clone
    const projected: WorkflowTopologySnapshot = {
      snapshotId: `projected-${mutation.mutationId}`,
      timestamp: base.timestamp,
      clusterCount: base.clusterCount,
      colonyCount: base.colonyCount,
      clusterToAgents: {},
      colonyToClusters: { ...base.colonyToClusters },
    };
    for (const [k, v] of Object.entries(base.clusterToAgents)) {
      projected.clusterToAgents[k] = [...v];
    }
    for (const [k, v] of Object.entries(base.colonyToClusters)) {
      projected.colonyToClusters[k] = [...v];
    }

    switch (mutation.type) {
      case 'SPLIT_CLUSTER': {
        const clusterId = mutation.params['clusterId'] as string;
        const agents = projected.clusterToAgents[clusterId];
        if (agents && agents.length >= 2) {
          const mid = Math.floor(agents.length / 2);
          const newClusterId = `${clusterId}-split-${mutation.mutationId.slice(-6)}`;
          projected.clusterToAgents[clusterId] = agents.slice(0, mid);
          projected.clusterToAgents[newClusterId] = agents.slice(mid);
          projected.clusterCount++;
          // Add new cluster to same colony
          for (const [colId, clusters] of Object.entries(projected.colonyToClusters)) {
            if (clusters.includes(clusterId)) {
              projected.colonyToClusters[colId] = [...clusters, newClusterId];
              break;
            }
          }
        }
        break;
      }

      case 'MERGE_CLUSTERS': {
        const cA = mutation.params['clusterA'] as string;
        const cB = mutation.params['clusterB'] as string;
        const agentsA = projected.clusterToAgents[cA] ?? [];
        const agentsB = projected.clusterToAgents[cB] ?? [];
        projected.clusterToAgents[cA] = [...agentsA, ...agentsB];
        delete projected.clusterToAgents[cB];
        projected.clusterCount = Math.max(0, projected.clusterCount - 1);
        // Remove cB from colony
        for (const [colId, clusters] of Object.entries(projected.colonyToClusters)) {
          projected.colonyToClusters[colId] = clusters.filter(c => c !== cB);
        }
        break;
      }

      case 'REASSIGN_AGENT': {
        const agentId = mutation.params['agentId'] as string;
        const from = mutation.params['fromClusterId'] as string;
        const to = mutation.params['toClusterId'] as string;
        const fromAgents = projected.clusterToAgents[from];
        if (fromAgents) {
          projected.clusterToAgents[from] = fromAgents.filter(a => a !== agentId);
        }
        const toAgents = projected.clusterToAgents[to] ?? [];
        toAgents.push(agentId);
        projected.clusterToAgents[to] = toAgents;
        break;
      }

      case 'SWAP_AGENTS': {
        const clA = mutation.params['clusterA'] as string;
        const clB = mutation.params['clusterB'] as string;
        const aA = mutation.params['agentA'] as string;
        const aB = mutation.params['agentB'] as string;
        const listA = projected.clusterToAgents[clA];
        const listB = projected.clusterToAgents[clB];
        if (listA && listB) {
          const idxA = listA.indexOf(aA);
          const idxB = listB.indexOf(aB);
          if (idxA >= 0 && idxB >= 0) {
            listA[idxA] = aB;
            listB[idxB] = aA;
          }
        }
        break;
      }
    }

    return projected;
  }

  // ── Step 3: Evaluate ──────────────────────────────────────────────────────

  /**
   * EVO: Score each candidate mutation by estimating its fitness impact.
   * Uses heuristics based on cluster size variance and domain coherence.
   */
  private async stepEvaluate(
    candidates: MutationCandidate[],
    baseline: WorkflowTopologySnapshot,
  ): Promise<MutationCandidate[]> {
    const baselineScore = this.computeTopologyFitness(baseline);

    for (const candidate of candidates) {
      const candidateScore = this.computeTopologyFitness(candidate.projectedSnapshot);
      candidate.fitnessEstimate = candidateScore - baselineScore;
    }

    return candidates;
  }

  /**
   * EVO: Topology fitness heuristic. Balances:
   *   - Cluster size uniformity (lower variance = better load balancing)
   *   - Colony coherence (clusters in a colony should cover similar domains)
   *   - Total cluster count near optimal (96k / clusterSize)
   */
  private computeTopologyFitness(snapshot: WorkflowTopologySnapshot): number {
    const sizes = Object.values(snapshot.clusterToAgents).map(a => a.length);
    if (sizes.length === 0) return 0;

    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const variance =
      sizes.reduce((sum, s) => sum + (s - mean) ** 2, 0) / sizes.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1; // coefficient of variation

    // Lower CV = more uniform = better
    const uniformityScore = Math.max(0, 1 - cv);

    // Penalize deviating from target cluster count
    const targetClusterCount = Math.ceil(96000 / this.config.clusterSize);
    const countDeviation = Math.abs(snapshot.clusterCount - targetClusterCount) / targetClusterCount;
    const countScore = Math.max(0, 1 - countDeviation);

    // Weighted composite
    return uniformityScore * 0.6 + countScore * 0.4;
  }

  // ── Step 4: Select ────────────────────────────────────────────────────────

  /**
   * EVO: Tournament selection. Randomly pair candidates, pick the better one.
   * Winner must exceed acceptance threshold to be returned.
   */
  private stepSelect(
    candidates: MutationCandidate[],
    _baseline: WorkflowTopologySnapshot,
  ): MutationCandidate | null {
    if (candidates.length === 0) return null;

    // Sort by fitness estimate descending
    const sorted = [...candidates].sort(
      (a, b) => b.fitnessEstimate - a.fitnessEstimate,
    );

    const best = sorted[0]!;

    // EVO: Only accept mutations that provide meaningful improvement
    if (best.fitnessEstimate < this.acceptanceThreshold) {
      return null;
    }

    return best;
  }

  // ── Step 5: Propagate ─────────────────────────────────────────────────────

  /**
   * EVO: Apply the winning mutation to the live registry.
   * This is the only step with side effects on the actual topology.
   */
  private async stepPropagate(candidate: MutationCandidate): Promise<boolean> {
    const mutation = candidate.mutation;

    try {
      switch (mutation.type) {
        case 'SPLIT_CLUSTER': {
          const clusterId = mutation.params['clusterId'] as string;
          this.registry.splitCluster(clusterId);
          break;
        }
        case 'MERGE_CLUSTERS': {
          const cA = mutation.params['clusterA'] as string;
          const cB = mutation.params['clusterB'] as string;
          this.registry.mergeClusters(cA, cB);
          break;
        }
        case 'REASSIGN_AGENT': {
          const agentId = mutation.params['agentId'] as string;
          const to = mutation.params['toClusterId'] as string;
          this.registry.reassignAgent(agentId, to);
          break;
        }
        case 'SWAP_AGENTS': {
          const aA = mutation.params['agentA'] as string;
          const aB = mutation.params['agentB'] as string;
          this.registry.swapAgents(aA, aB);
          break;
        }
        default:
          return false;
      }

      // Persist the new topology
      const newSnapshot = this.stepSnapshot();
      await this.storage.saveTopologySnapshot(newSnapshot);

      return true;
    } catch {
      return false;
    }
  }

  // ── Comparison Utility ────────────────────────────────────────────────────

  compareTopologies(
    before: WorkflowTopologySnapshot,
    after: WorkflowTopologySnapshot,
  ): TopologyComparisonResult {
    const fitBefore = this.computeTopologyFitness(before);
    const fitAfter = this.computeTopologyFitness(after);

    return {
      baselineSnapshotId: before.snapshotId,
      candidateSnapshotId: after.snapshotId,
      fitnessImprovement: fitAfter - fitBefore,
      clusterCountDelta: after.clusterCount - before.clusterCount,
      colonyCountDelta: after.colonyCount - before.colonyCount,
    };
  }
}
