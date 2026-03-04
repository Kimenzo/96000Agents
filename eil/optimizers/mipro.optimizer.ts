/**
 * EVO Intelligence Layer — MIPRO Optimizer
 *
 * Implements Bayesian few-shot example selection optimization.
 * MIPRO maintains a pool of examples per agent and uses Bayesian
 * optimization to select the best subset for each prompt.
 *
 * EVO: MIPRO is the second optimizer tried when TextGrad stalls.
 * While TextGrad rewrites the entire prompt, MIPRO focuses on
 * selecting the best EXAMPLES to include in the prompt context.
 * This is cheaper and can unstick agents that need demonstrations
 * rather than instruction changes.
 *
 * Pipeline:
 *   1. Build candidate example pool from agent's history
 *   2. Bayesian selection — sample subsets using Thompson sampling
 *   3. Evaluate each subset on benchmark tasks
 *   4. Update posterior — refine beliefs about example quality
 *   5. Return best example set as the optimization result
 */

import type {
  EvoLLM,
  OptimizationResult,
  BenchmarkTask,
} from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoStorage } from '../core/storage.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MiproConfig {
  /** Maximum number of examples in a prompt. */
  maxExamplesPerPrompt: number;
  /** Number of candidate subsets to evaluate per round. */
  candidatesPerRound: number;
  /** Number of optimization rounds. */
  maxRounds: number;
  /** Prior strength (higher = more conservative exploration). */
  priorStrength: number;
  /** Minimum improvement to continue. */
  convergenceThreshold: number;
}

export const DEFAULT_MIPRO_CONFIG: MiproConfig = {
  maxExamplesPerPrompt: 5,
  candidatesPerRound: 4,
  maxRounds: 4,
  priorStrength: 2,
  convergenceThreshold: 0.01,
};

export interface Example {
  exampleId: string;
  input: string;
  output: string;
  /** Domain tag for filtering. */
  domain?: string;
}

interface ExampleBelief {
  example: Example;
  /** Alpha parameter of Beta distribution (successes + prior). */
  alpha: number;
  /** Beta parameter of Beta distribution (failures + prior). */
  beta: number;
}

// ─── MIPRO Optimizer ──────────────────────────────────────────────────────────

export class MiproOptimizer {
  private llm: EvoLLM;
  private registry: EvoRegistry;
  private storage: EvoStorage;
  private config: MiproConfig;

  constructor(deps: {
    llm: EvoLLM;
    registry: EvoRegistry;
    storage: EvoStorage;
    config?: Partial<MiproConfig>;
  }) {
    this.llm = deps.llm;
    this.registry = deps.registry;
    this.storage = deps.storage;
    this.config = { ...DEFAULT_MIPRO_CONFIG, ...deps.config };
  }

  // ── Main Optimization ─────────────────────────────────────────────────────

  /**
   * EVO: Run MIPRO optimization on a single agent.
   * Optimizes which few-shot examples to include in the prompt.
   */
  async optimize(
    agentId: string,
    baseInstructions: string,
    examplePool: Example[],
    benchmarkTasks: BenchmarkTask[],
  ): Promise<OptimizationResult> {
    const startTime = Date.now();

    if (examplePool.length === 0) {
      return {
        agentId,
        previousPrompt: baseInstructions,
        newPrompt: baseInstructions,
        scoreBefore: 0,
        scoreAfter: 0,
        iterations: 0,
        converged: true,
        optimizerUsed: 'MIPRO',
        durationMs: Date.now() - startTime,
        promptVersion: 0,
      };
    }

    // Initialize beliefs (Beta distribution priors)
    const beliefs: ExampleBelief[] = examplePool.map(ex => ({
      example: ex,
      alpha: this.config.priorStrength,
      beta: this.config.priorStrength,
    }));

    // Score baseline (no examples)
    const baselineScore = await this.evaluatePrompt(baseInstructions, benchmarkTasks);

    let bestPrompt = baseInstructions;
    let bestScore = baselineScore;
    let bestExamples: Example[] = [];
    let totalIterations = 0;
    let converged = false;

    const scoreHistory: number[] = [baselineScore];

    for (let round = 0; round < this.config.maxRounds; round++) {
      const roundBestScore = bestScore;

      for (let c = 0; c < this.config.candidatesPerRound; c++) {
        totalIterations++;

        // Thompson sampling: draw from each example's posterior
        const selectedExamples = this.thompsonSample(beliefs);
        const candidatePrompt = this.buildPromptWithExamples(
          baseInstructions,
          selectedExamples,
        );

        const score = await this.evaluatePrompt(candidatePrompt, benchmarkTasks);

        // Update beliefs
        this.updateBeliefs(beliefs, selectedExamples, score > bestScore);

        if (score > bestScore) {
          bestScore = score;
          bestPrompt = candidatePrompt;
          bestExamples = selectedExamples;
        }
      }

      scoreHistory.push(bestScore);

      // Convergence check
      if (bestScore - roundBestScore < this.config.convergenceThreshold) {
        converged = true;
        break;
      }
    }

    // Save version
    const version = await this.saveVersion(agentId, bestPrompt, bestScore, bestExamples);

    return {
      agentId,
      previousPrompt: baseInstructions,
      newPrompt: bestPrompt,
      scoreBefore: baselineScore,
      scoreAfter: bestScore,
      iterations: totalIterations,
      converged,
      optimizerUsed: 'MIPRO',
      durationMs: Date.now() - startTime,
      promptVersion: version,
    };
  }

  // ── Thompson Sampling ─────────────────────────────────────────────────────

  /**
   * EVO: Thompson sampling from Beta posteriors.
   * Draw a sample from each example's Beta(alpha, beta) distribution,
   * then select the top-k examples by sampled value.
   */
  private thompsonSample(beliefs: ExampleBelief[]): Example[] {
    const samples = beliefs.map(b => ({
      example: b.example,
      sample: this.sampleBeta(b.alpha, b.beta),
    }));

    samples.sort((a, b) => b.sample - a.sample);
    return samples.slice(0, this.config.maxExamplesPerPrompt).map(s => s.example);
  }

  /**
   * EVO: Sample from a Beta distribution using the Jöhnk algorithm.
   * This is a simple approximation suitable for our use case.
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Simple approximation using gamma samples
    const gammaA = this.sampleGamma(alpha);
    const gammaB = this.sampleGamma(beta);
    const sum = gammaA + gammaB;
    return sum > 0 ? gammaA / sum : 0.5;
  }

  /**
   * EVO: Sample from Gamma distribution using Marsaglia-Tsang method (simplified).
   */
  private sampleGamma(shape: number): number {
    if (shape < 1) {
      return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    for (let attempt = 0; attempt < 100; attempt++) {
      let x: number;
      let v: number;

      do {
        x = this.standardNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }

    return shape; // fallback
  }

  /** Box-Muller standard normal. */
  private standardNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  }

  // ── Belief Update ─────────────────────────────────────────────────────────

  /**
   * EVO: Bayesian update — increment alpha (success) or beta (failure)
   * for each selected example.
   */
  private updateBeliefs(
    beliefs: ExampleBelief[],
    selected: Example[],
    success: boolean,
  ): void {
    const selectedIds = new Set(selected.map(e => e.exampleId));

    for (const belief of beliefs) {
      if (selectedIds.has(belief.example.exampleId)) {
        if (success) {
          belief.alpha += 1;
        } else {
          belief.beta += 1;
        }
      }
    }
  }

  // ── Prompt Construction ───────────────────────────────────────────────────

  private buildPromptWithExamples(
    baseInstructions: string,
    examples: Example[],
  ): string {
    if (examples.length === 0) return baseInstructions;

    const examplesText = examples
      .map(
        (ex, i) =>
          `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}`,
      )
      .join('\n\n');

    return [
      baseInstructions,
      '',
      '--- Few-shot Examples ---',
      examplesText,
      '--- End Examples ---',
    ].join('\n');
  }

  // ── Evaluation ────────────────────────────────────────────────────────────

  private async evaluatePrompt(
    prompt: string,
    tasks: BenchmarkTask[],
  ): Promise<number> {
    const sample = tasks.length > 3
      ? tasks.sort(() => Math.random() - 0.5).slice(0, 3)
      : tasks;

    let totalScore = 0;

    for (const task of sample) {
      const fullPrompt = [prompt, '', 'Task:', task.input].join('\n');
      const output = await this.llm.generate(fullPrompt);

      const scorePrompt = [
        `Score this output from 0.0 to 1.0 for quality and relevance.`,
        task.expectedOutput ? `Expected: ${task.expectedOutput.slice(0, 300)}` : '',
        `Actual: ${output.slice(0, 300)}`,
        `Respond with ONLY a number.`,
      ].join('\n');

      const response = await this.llm.generate(scorePrompt);
      const parsed = parseFloat(response.trim());
      totalScore += isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
    }

    return sample.length > 0 ? totalScore / sample.length : 0;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private async saveVersion(
    agentId: string,
    prompt: string,
    score: number,
    examples: Example[],
  ): Promise<number> {
    const existing = await this.storage.getLatestPromptVersion(agentId);
    const version = (existing?.version ?? 0) + 1;

    await this.storage.savePromptVersion(agentId, {
      version,
      prompt,
      score,
      timestamp: new Date().toISOString(),
      optimizer: 'MIPRO',
      metadata: { exampleIds: examples.map(e => e.exampleId) },
    });

    this.registry.updatePromptVersion(agentId, version);
    return version;
  }
}
