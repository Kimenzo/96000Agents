/**
 * EVO Intelligence Layer — Benchmark Runner
 *
 * Evaluates agents, clusters, and topology configurations against
 * standardized benchmark tasks. Provides comparison utilities for
 * measuring improvement across evolution cycles.
 *
 * EVO: Benchmarking is the objective truth of the system. While the
 * scorer provides subjective quality estimates, the benchmark runner
 * provides repeatable, comparable measurements. This drives the
 * optimizer selection decisions.
 */

import type {
  EvoLLM,
  BenchmarkTask,
  BenchmarkResult,
  ClusterBenchmarkResult,
  TopologyComparisonResult,
  WorkflowTopologySnapshot,
} from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoStorage } from '../core/storage.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BenchmarkRunnerConfig {
  /** Max concurrent agent evaluations. */
  concurrency: number;
  /** Number of tasks per agent in a benchmark run. */
  tasksPerAgent: number;
  /** Timeout per task evaluation (ms). */
  taskTimeoutMs: number;
}

export const DEFAULT_BENCHMARK_CONFIG: BenchmarkRunnerConfig = {
  concurrency: 10,
  tasksPerAgent: 3,
  taskTimeoutMs: 30_000,
};

// ─── Benchmark Runner ─────────────────────────────────────────────────────────

export class BenchmarkRunner {
  private llm: EvoLLM;
  private registry: EvoRegistry;
  private storage: EvoStorage;
  private config: BenchmarkRunnerConfig;

  constructor(deps: {
    llm: EvoLLM;
    registry: EvoRegistry;
    storage: EvoStorage;
    config?: Partial<BenchmarkRunnerConfig>;
  }) {
    this.llm = deps.llm;
    this.registry = deps.registry;
    this.storage = deps.storage;
    this.config = { ...DEFAULT_BENCHMARK_CONFIG, ...deps.config };
  }

  // ── Agent Benchmark ───────────────────────────────────────────────────────

  /**
   * EVO: Benchmark a single agent against a set of tasks.
   */
  async benchmarkAgent(
    agentId: string,
    tasks: BenchmarkTask[],
    agentInstructions?: string,
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const sample = this.sampleTasks(tasks);
    const taskResults: Array<{ taskId: string; score: number; durationMs: number }> = [];

    const meta = this.registry.getAgentMeta(agentId);
    const instructions = agentInstructions ?? `Agent ${agentId}`;

    for (const task of sample) {
      const taskStart = Date.now();

      try {
        const score = await this.evaluateTask(instructions, task);
        taskResults.push({
          taskId: task.taskId,
          score,
          durationMs: Date.now() - taskStart,
        });
      } catch {
        taskResults.push({
          taskId: task.taskId,
          score: 0,
          durationMs: Date.now() - taskStart,
        });
      }
    }

    const scores = taskResults.map(r => r.score);
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const result: BenchmarkResult = {
      agentId,
      taskCount: sample.length,
      averageScore: avgScore,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      totalDurationMs: Date.now() - startTime,
      taskResults,
    };

    // Persist
    await this.storage.saveBenchmarkResult(agentId, result);

    return result;
  }

  // ── Cluster Benchmark ─────────────────────────────────────────────────────

  /**
   * EVO: Benchmark an entire cluster by sampling agents within it.
   */
  async benchmarkCluster(
    clusterId: string,
    tasks: BenchmarkTask[],
    sampleSize?: number,
  ): Promise<ClusterBenchmarkResult> {
    // EVO: getCluster returns string[] of agentIds directly
    const clusterAgents = this.registry.getCluster(clusterId);
    if (clusterAgents.length === 0) {
      return {
        clusterId,
        agentCount: 0,
        sampledCount: 0,
        averageScore: 0,
        medianScore: 0,
        topPerformers: [],
        bottomPerformers: [],
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    const agentIds = [...clusterAgents];
    const sampledIds = sampleSize && sampleSize < agentIds.length
      ? agentIds.sort(() => Math.random() - 0.5).slice(0, sampleSize)
      : agentIds;

    const agentResults: Array<{ agentId: string; score: number }> = [];

    // Process in batches respecting concurrency
    for (let i = 0; i < sampledIds.length; i += this.config.concurrency) {
      const batch = sampledIds.slice(i, i + this.config.concurrency);
      const batchResults = await Promise.all(
        batch.map(async id => {
          const result = await this.benchmarkAgent(id, tasks);
          return { agentId: id, score: result.averageScore };
        }),
      );
      agentResults.push(...batchResults);
    }

    // Sort by score
    agentResults.sort((a, b) => b.score - a.score);

    const scores = agentResults.map(r => r.score);
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const sortedScores = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sortedScores.length / 2);
    const medianScore = sortedScores.length > 0
      ? sortedScores.length % 2 === 0
        ? (sortedScores[mid - 1]! + sortedScores[mid]!) / 2
        : sortedScores[mid]!
      : 0;

    const topCount = Math.max(1, Math.ceil(agentResults.length * 0.1));
    const bottomCount = Math.max(1, Math.ceil(agentResults.length * 0.1));

    return {
      clusterId,
      agentCount: clusterAgents.length,
      sampledCount: sampledIds.length,
      averageScore: avgScore,
      medianScore,
      topPerformers: agentResults.slice(0, topCount).map(r => r.agentId),
      bottomPerformers: agentResults.slice(-bottomCount).map(r => r.agentId),
      durationMs: Date.now() - startTime,
    };
  }

  // ── Topology Comparison ───────────────────────────────────────────────────

  /**
   * EVO: Compare two topology snapshots by benchmarking agents under each.
   * Used by the topology mutation workflow to evaluate structural changes.
   */
  compareTopologies(
    before: WorkflowTopologySnapshot,
    after: WorkflowTopologySnapshot,
    benchmarkScores: { before: number; after: number },
  ): TopologyComparisonResult {
    return {
      baselineSnapshotId: before.snapshotId,
      candidateSnapshotId: after.snapshotId,
      fitnessImprovement: benchmarkScores.after - benchmarkScores.before,
      clusterCountDelta: after.clusterCount - before.clusterCount,
      colonyCountDelta: after.colonyCount - before.colonyCount,
    };
  }

  // ── Task Evaluation ───────────────────────────────────────────────────────

  /**
   * EVO: Evaluate a single task — run the agent's instructions as a prompt,
   * then score the output.
   */
  private async evaluateTask(
    instructions: string,
    task: BenchmarkTask,
  ): Promise<number> {
    const executionPrompt = [
      instructions,
      '',
      'Task:',
      task.input,
    ].join('\n');

    const output = await this.withTimeout(
      this.llm.generate(executionPrompt),
      this.config.taskTimeoutMs,
    );

    if (task.expectedOutput) {
      return this.scoreWithExpected(output, task.expectedOutput, task.evaluationCriteria);
    }
    return this.scoreBlind(output, task.evaluationCriteria);
  }

  private async scoreWithExpected(
    actual: string,
    expected: string,
    criteria?: string,
  ): Promise<number> {
    const prompt = [
      `Score this output from 0.0 to 1.0.`,
      criteria ? `Criteria: ${criteria}` : '',
      `Expected: ${expected.slice(0, 400)}`,
      `Actual: ${actual.slice(0, 400)}`,
      `Respond with ONLY a number.`,
    ].join('\n');

    const response = await this.llm.generate(prompt);
    return parseScore(response);
  }

  private async scoreBlind(
    output: string,
    criteria?: string,
  ): Promise<number> {
    const prompt = [
      `Score this output from 0.0 to 1.0 for quality and relevance.`,
      criteria ? `Criteria: ${criteria}` : '',
      `Output: ${output.slice(0, 400)}`,
      `Respond with ONLY a number.`,
    ].join('\n');

    const response = await this.llm.generate(prompt);
    return parseScore(response);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private sampleTasks(tasks: BenchmarkTask[]): BenchmarkTask[] {
    if (tasks.length <= this.config.tasksPerAgent) return [...tasks];
    return [...tasks].sort(() => Math.random() - 0.5).slice(0, this.config.tasksPerAgent);
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Benchmark task timed out')), ms),
      ),
    ]);
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function parseScore(response: string): number {
  const match = response.trim().match(/[\d.]+/);
  if (!match) return 0.5;
  const parsed = parseFloat(match[0]);
  return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
}
