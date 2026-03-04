/**
 * EVO Intelligence Layer — TextGrad Optimizer
 *
 * Implements the TextGrad algorithm: uses LLM feedback as a gradient proxy
 * to iteratively improve agent prompts.
 *
 * Pipeline:
 *   1. Forward pass — Run the agent on benchmark tasks with current prompt
 *   2. Feedback generation — Ask the LLM to critique the outputs
 *   3. Backward pass — Ask the LLM to improve the prompt based on feedback
 *   4. Version control — Store the new prompt version
 *   5. Convergence check — Stop if improvement plateaus
 *
 * EVO: TextGrad is the first optimizer tried (fastest convergence for
 * single-agent prompt refinement). The optimizer manager escalates to
 * MIPRO or AFlow if TextGrad stalls.
 */

import type {
  EvoLLM,
  OptimizationResult,
  BenchmarkTask,
} from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoStorage } from '../core/storage.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TextGradConfig {
  /** Maximum optimization iterations per agent. */
  maxIterations: number;
  /** Minimum improvement between iterations to continue. */
  convergenceThreshold: number;
  /** Number of benchmark tasks to sample per forward pass. */
  sampleSize: number;
  /** Temperature for feedback generation. */
  feedbackTemperature: number;
  /** Temperature for prompt rewriting. */
  rewriteTemperature: number;
}

export const DEFAULT_TEXT_GRAD_CONFIG: TextGradConfig = {
  maxIterations: 5,
  convergenceThreshold: 0.01,
  sampleSize: 3,
  feedbackTemperature: 0.7,
  rewriteTemperature: 0.4,
};

interface ForwardPassResult {
  task: BenchmarkTask;
  output: string;
  score: number;
}

interface FeedbackResult {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  overallAssessment: string;
}

// ─── TextGrad Optimizer ───────────────────────────────────────────────────────

export class TextGradOptimizer {
  private llm: EvoLLM;
  private registry: EvoRegistry;
  private storage: EvoStorage;
  private config: TextGradConfig;

  constructor(deps: {
    llm: EvoLLM;
    registry: EvoRegistry;
    storage: EvoStorage;
    config?: Partial<TextGradConfig>;
  }) {
    this.llm = deps.llm;
    this.registry = deps.registry;
    this.storage = deps.storage;
    this.config = { ...DEFAULT_TEXT_GRAD_CONFIG, ...deps.config };
  }

  // ── Main Optimization Loop ────────────────────────────────────────────────

  /**
   * EVO: Run TextGrad optimization on a single agent.
   * Returns the optimization result with the best prompt found.
   */
  async optimize(
    agentId: string,
    benchmarkTasks: BenchmarkTask[],
    currentInstructions: string,
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    let bestPrompt = currentInstructions;
    let bestScore = 0;
    let currentPrompt = currentInstructions;
    let iterations = 0;
    let converged = false;

    const scoreHistory: number[] = [];

    for (let i = 0; i < this.config.maxIterations; i++) {
      iterations = i + 1;

      // Sample benchmark tasks
      const sample = this.sampleTasks(benchmarkTasks, this.config.sampleSize);

      // Step 1: Forward pass
      const forwardResults = await this.forwardPass(currentPrompt, sample);
      const avgScore =
        forwardResults.reduce((sum, r) => sum + r.score, 0) / forwardResults.length;
      scoreHistory.push(avgScore);

      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestPrompt = currentPrompt;
      }

      // Step 5: Convergence check (early)
      if (i > 0) {
        const prev = scoreHistory[i - 1] ?? 0;
        const improvement = avgScore - prev;
        if (Math.abs(improvement) < this.config.convergenceThreshold) {
          converged = true;
          break;
        }
      }

      // Step 2: Feedback generation
      const feedback = await this.generateFeedback(currentPrompt, forwardResults);

      // Step 3: Backward pass — rewrite the prompt
      const improvedPrompt = await this.backwardPass(currentPrompt, feedback);
      if (!improvedPrompt || improvedPrompt === currentPrompt) {
        converged = true;
        break;
      }

      currentPrompt = improvedPrompt;
    }

    // Step 4: Version control
    const version = await this.saveVersion(agentId, bestPrompt, bestScore);

    return {
      agentId,
      previousPrompt: currentInstructions,
      newPrompt: bestPrompt,
      scoreBefore: scoreHistory[0] ?? 0,
      scoreAfter: bestScore,
      iterations,
      converged,
      optimizerUsed: 'TEXT_GRAD',
      durationMs: Date.now() - startTime,
      promptVersion: version,
    };
  }

  // ── Step 1: Forward Pass ──────────────────────────────────────────────────

  /**
   * EVO: Run the current prompt through benchmark tasks and score outputs.
   * Uses the LLM itself as both executor and scorer.
   */
  private async forwardPass(
    prompt: string,
    tasks: BenchmarkTask[],
  ): Promise<ForwardPassResult[]> {
    const results: ForwardPassResult[] = [];

    for (const task of tasks) {
      const executionPrompt = [
        `You are an AI agent with the following instructions:`,
        prompt,
        '',
        `Now complete this task:`,
        task.input,
      ].join('\n');

      const output = await this.llm.generate(executionPrompt);

      // Score the output against expected
      const score = task.expectedOutput
        ? await this.scoreOutput(output, task.expectedOutput, task.evaluationCriteria)
        : await this.scoreOutputBlind(output, task.evaluationCriteria);

      results.push({ task, output, score });
    }

    return results;
  }

  private async scoreOutput(
    actual: string,
    expected: string,
    criteria: string | undefined,
  ): Promise<number> {
    const prompt = [
      `Score the following output on a scale from 0.0 to 1.0.`,
      criteria ? `Evaluation criteria: ${criteria}` : '',
      `Expected output: ${expected.slice(0, 500)}`,
      `Actual output: ${actual.slice(0, 500)}`,
      `Respond with ONLY a number between 0.0 and 1.0.`,
    ].join('\n');

    const response = await this.llm.generate(prompt);
    const parsed = parseFloat(response.trim());
    return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
  }

  private async scoreOutputBlind(
    output: string,
    criteria: string | undefined,
  ): Promise<number> {
    const prompt = [
      `Score the following output on a scale from 0.0 to 1.0 for quality, relevance, and coherence.`,
      criteria ? `Evaluation criteria: ${criteria}` : '',
      `Output: ${output.slice(0, 500)}`,
      `Respond with ONLY a number between 0.0 and 1.0.`,
    ].join('\n');

    const response = await this.llm.generate(prompt);
    const parsed = parseFloat(response.trim());
    return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
  }

  // ── Step 2: Feedback Generation ───────────────────────────────────────────

  /**
   * EVO: This is the "gradient" — LLM-generated feedback on what the prompt
   * does well and what it does poorly. The feedback becomes the update signal.
   */
  private async generateFeedback(
    prompt: string,
    results: ForwardPassResult[],
  ): Promise<FeedbackResult> {
    const resultsText = results.map((r, i) => [
      `Task ${i + 1}: ${r.task.input.slice(0, 200)}`,
      `Output: ${r.output.slice(0, 200)}`,
      `Score: ${r.score.toFixed(2)}`,
    ].join('\n')).join('\n\n');

    const feedbackPrompt = [
      `Analyze an AI agent's prompt and its performance on tasks.`,
      '',
      `Current prompt:`,
      prompt.slice(0, 500),
      '',
      `Performance results:`,
      resultsText,
      '',
      `Provide feedback in this exact JSON format:`,
      `{"strengths": ["..."], "weaknesses": ["..."], "suggestions": ["..."], "overallAssessment": "..."}`,
    ].join('\n');

    try {
      const response = await this.llm.generate(feedbackPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { strengths: [], weaknesses: [], suggestions: [response], overallAssessment: response };
      }
      const parsed = JSON.parse(jsonMatch[0]) as FeedbackResult;
      return {
        strengths: parsed.strengths ?? [],
        weaknesses: parsed.weaknesses ?? [],
        suggestions: parsed.suggestions ?? [],
        overallAssessment: parsed.overallAssessment ?? '',
      };
    } catch {
      return { strengths: [], weaknesses: [], suggestions: [], overallAssessment: 'Failed to parse feedback' };
    }
  }

  // ── Step 3: Backward Pass ─────────────────────────────────────────────────

  /**
   * EVO: Apply the "gradient" to the prompt. Ask the LLM to rewrite the
   * prompt incorporating the feedback. This is the update step.
   */
  private async backwardPass(
    currentPrompt: string,
    feedback: FeedbackResult,
  ): Promise<string | null> {
    const rewritePrompt = [
      `You are a prompt engineer. Rewrite the following AI agent prompt to address the feedback.`,
      '',
      `Current prompt:`,
      currentPrompt,
      '',
      `Strengths to preserve: ${feedback.strengths.join('; ')}`,
      `Weaknesses to fix: ${feedback.weaknesses.join('; ')}`,
      `Suggestions: ${feedback.suggestions.join('; ')}`,
      '',
      `IMPORTANT: Respond with ONLY the improved prompt text. No explanations, no markdown formatting.`,
    ].join('\n');

    try {
      const response = await this.llm.generate(rewritePrompt);
      const trimmed = response.trim();
      // EVO: Sanity check — the rewrite should be reasonably sized
      if (trimmed.length < 10 || trimmed.length > currentPrompt.length * 5) {
        return null;
      }
      return trimmed;
    } catch {
      return null;
    }
  }

  // ── Step 4: Version Control ───────────────────────────────────────────────

  private async saveVersion(
    agentId: string,
    prompt: string,
    score: number,
  ): Promise<number> {
    const existing = await this.storage.getLatestPromptVersion(agentId);
    const version = (existing?.version ?? 0) + 1;

    await this.storage.savePromptVersion(agentId, {
      version,
      prompt,
      score,
      timestamp: new Date().toISOString(),
      optimizer: 'TEXT_GRAD',
    });

    this.registry.updatePromptVersion(agentId, version);
    return version;
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  private sampleTasks(tasks: BenchmarkTask[], size: number): BenchmarkTask[] {
    if (tasks.length <= size) return [...tasks];
    const shuffled = [...tasks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size);
  }
}
