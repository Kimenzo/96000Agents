/**
 * EVO Intelligence Layer — Agent Harness
 *
 * The most important design decision in the entire integration.
 * Wraps each of the 96,000 existing agent files WITHOUT modifying them.
 * The original agent is still the one doing the generating. The harness adds:
 *   - evaluation (scores the output)
 *   - publication (routes good findings to the event bus)
 *   - directive receiver (injects research directives as additional context)
 *   - prompt version manager (swaps in the current evolved prompt)
 *
 * EVO: Hard guarantee — the system can be switched off entirely (EIL disabled)
 * and every agent continues to function as a standard Mastra agent.
 */

import type {
  EvoAgentMeta,
  Finding,
  FindingType,
  ResearchDirective,
  EvoLLM,
  PropagationLevel,
} from '../core/types.js';
import type { EvoRegistry } from '../core/registry.js';
import type { EvoEventBus } from '../core/event-bus.js';
import type { EvoStorage } from '../core/storage.js';
import type { BibleLayer } from '../bible/bible-layer.js';
import type { Violation, ConfessionStamp, AgentState } from '../bible/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Base Agent Interface ─────────────────────────────────────────────────────
// EVO: Minimal interface that any Mastra Agent satisfies.
// We depend on this shape, not on the concrete @mastra/core import,
// so the harness stays decoupled and testable with mock agents.

export interface MastraAgentLike {
  generate(prompt: string, options?: Record<string, unknown>): Promise<{ text: string }>;
}

// ─── Harness ──────────────────────────────────────────────────────────────────

export class EvoAgentHarness {
  readonly baseAgent: MastraAgentLike;
  readonly meta: EvoAgentMeta;

  private registry: EvoRegistry;
  private eventBus: EvoEventBus;
  private storage: EvoStorage;

  /** EVO: The current evolved instructions for this agent. */
  private currentInstructions: string | null = null;
  /** EVO: Active research directive injected into the next generation. */
  private activeDirective: ResearchDirective | null = null;

  //BIBLE: The constitutional layer — injected at runtime, governs all output.
  private bibleLayer: BibleLayer | null = null;
  //BIBLE: Agent state — ACTIVE until the Bible says otherwise.
  private agentState: AgentState = 'ACTIVE';

  constructor(deps: {
    baseAgent: MastraAgentLike;
    meta: EvoAgentMeta;
    registry: EvoRegistry;
    eventBus: EvoEventBus;
    storage: EvoStorage;
  }) {
    this.baseAgent = deps.baseAgent;
    this.meta = deps.meta;
    this.registry = deps.registry;
    this.eventBus = deps.eventBus;
    this.storage = deps.storage;
  }

  // ── Evolved Instructions ──────────────────────────────────────────────────

  /** Returns the current prompt version's instructions, or null if never evolved. */
  get evolvedInstructions(): string | null {
    return this.currentInstructions;
  }

  /** Called by the optimizer when a new prompt version is committed. */
  setEvolvedInstructions(instructions: string): void {
    this.currentInstructions = instructions;
  }

  // ── Core Generation ───────────────────────────────────────────────────────

  /**
   * Wraps the base agent's generate call with:
   *  1. Optional directive injection into the prompt
   *  2. Evolved prompt substitution
   *  3. Output evaluation
   *  4. Automatic finding publication when significant
   */
  async generate(prompt: string): Promise<{ text: string; finding: Finding | null }> {
    const augmentedPrompt = this.buildAugmentedPrompt(prompt);
    const result = await this.baseAgent.generate(augmentedPrompt);

    // Evaluate the output
    const finding = this.evaluateFinding(result.text);

    if (finding) {
      await this.publishFinding(finding);
    }

    return { text: result.text, finding };
  }

  // ── Prompt Augmentation ───────────────────────────────────────────────────

  /**
   * EVO: Builds the prompt that actually gets sent to the base agent.
   * Layers directive context and evolved instructions on top of the
   * original prompt without replacing it.
   */
  private buildAugmentedPrompt(originalPrompt: string): string {
    const parts: string[] = [];

    if (this.currentInstructions) {
      parts.push(`[EVOLVED INSTRUCTIONS]\n${this.currentInstructions}`);
    }

    if (this.activeDirective) {
      parts.push(
        `[RESEARCH DIRECTIVE — Priority: ${this.activeDirective.priority.toFixed(2)}]\n` +
        `Concept Space: ${this.activeDirective.conceptSpace}\n` +
        `Source Colony: ${this.activeDirective.sourceColony}`
      );
    }

    parts.push(originalPrompt);

    return parts.join('\n\n');
  }

  // ── Finding Evaluation ────────────────────────────────────────────────────

  /**
   * EVO: Lightweight heuristic evaluation of raw output.
   * Full LLM-graded scoring happens in the EvoScorer during evolution cycles.
   * This is the "fast path" that runs on every generation to catch
   * obvious high-signal outputs immediately.
   */
  evaluateFinding(rawOutput: string): Finding | null {
    if (!rawOutput || rawOutput.length < 50) return null;

    // EVO: Simple keyword-based type classification.
    // The EvoScorer provides the rigorous scoring later.
    const type = this.classifyFindingType(rawOutput);
    if (!type) return null;

    // EVO: Confidence is a rough heuristic based on output structure
    const confidenceScore = this.estimateConfidence(rawOutput);
    if (confidenceScore < 0.3) return null;

    const finding: Finding = {
      findingId: generateId(),
      agentId: this.meta.agentId,
      type,
      content: rawOutput.slice(0, 2000), // cap to prevent memory bloat
      confidenceScore,
      evidenceBase: [],
      domainTag: this.meta.skillDomain,
      timestamp: new Date().toISOString(),
      propagationLevel: 'LOCAL', // supervisors decide escalation
    };

    return finding;
  }

  private classifyFindingType(output: string): FindingType | null {
    const lower = output.toLowerCase();

    if (lower.includes('contradict') || lower.includes('inconsistent with')) {
      return 'CONTRADICTION' as FindingType;
    }
    if (lower.includes('novel') || lower.includes('previously unknown') || lower.includes('new pattern')) {
      return 'NOVEL_PATTERN' as FindingType;
    }
    if (lower.includes('confirms') || lower.includes('hypothesis validated')) {
      return 'CONFIRMED_HYPOTHESIS' as FindingType;
    }
    if (lower.includes('anomal') || lower.includes('unexpected')) {
      return 'ANOMALY' as FindingType;
    }
    if (lower.includes('cross-domain') || lower.includes('resonance') || lower.includes('interdisciplinary')) {
      return 'CROSS_DOMAIN_RESONANCE' as FindingType;
    }

    // EVO: Not every output is a finding. Most won't be.
    return null;
  }

  private estimateConfidence(output: string): number {
    let score = 0.3; // baseline
    // Longer, structured outputs are more likely to be substantive
    if (output.length > 200) score += 0.1;
    if (output.length > 500) score += 0.1;
    // References or evidence markers
    if (output.includes('evidence') || output.includes('citation') || output.includes('source')) {
      score += 0.15;
    }
    // Quantitative content
    if (/\d+\.?\d*%/.test(output) || /p\s*[<>=]\s*0\.\d+/.test(output)) {
      score += 0.1;
    }
    return Math.min(score, 1.0);
  }

  // ── Publication ───────────────────────────────────────────────────────────

  //BIBLE: Every finding passes through the Bible before the event bus.
  async publishFinding(finding: Finding): Promise<void> {
    if (this.bibleLayer) {
      // Probationary path — route through supervisor review queue
      if (this.agentState === 'PROBATIONARY') {
        await this.bibleLayer.processOutput_Probationary(
          this.meta.agentId,
          finding.content,
          this.meta.clusterId,
        );
        return;
      }

      // Normal path — the Moment of Witness
      const result = await this.bibleLayer.processOutput(
        this.meta.agentId,
        finding.content,
        this.meta,
        this,
      );

      if (!result.passed) {
        // Output quarantined — agent proceeds to next generation
        if (this.bibleLayer.probationManager.isSuspended(this.meta.agentId)) {
          this.agentState = 'SUSPENDED';
        } else if (this.bibleLayer.probationManager.isOnProbation(this.meta.agentId)) {
          this.agentState = 'PROBATIONARY';
        }
        return;
      }
    }

    this.eventBus.publishFinding(finding);
  }

  // ── Bible Integration ─────────────────────────────────────────────────────

  //BIBLE: Injection point — called once during EIL initialization.
  injectBibleLayer(bible: BibleLayer): void {
    this.bibleLayer = bible;
  }

  //BIBLE: The agent writes its own confession — called by BibleEnforcer during self-destruct.
  async generateConfession(violations: Violation[]): Promise<ConfessionStamp> {
    // Delegate to the bible layer's confession generator via the enforcer
    // The confession generator is internal to the enforcer; this method exists
    // so the harness interface is complete for external callers.
    return {
      agentId: this.meta.agentId,
      clusterId: this.meta.clusterId,
      colonyId: this.meta.colonyId,
      skillDomain: this.meta.skillDomain,
      generationAtViolation: this.meta.generationCount,
      evoScoreAtViolation: this.meta.evaluationScore,
      violations,
      firstPersonNarrative: '',
      submittedAt: new Date().toISOString(),
      approvalStatus: 'PENDING',
    };
  }

  get state(): AgentState {
    if (this.bibleLayer) {
      if (this.bibleLayer.probationManager.isSuspended(this.meta.agentId)) return 'SUSPENDED';
      if (this.bibleLayer.probationManager.isOnProbation(this.meta.agentId)) return 'PROBATIONARY';
    }
    return this.agentState;
  }

  // ── Directive Handling ────────────────────────────────────────────────────

  receiveDirective(directive: ResearchDirective): void {
    this.activeDirective = directive;
  }

  clearDirective(): void {
    this.activeDirective = null;
  }

  // ── Score Recording ───────────────────────────────────────────────────────

  async recordScore(score: number, cycleId: string): Promise<void> {
    this.registry.updateAgentScore(this.meta.agentId, score);

    await this.storage.saveAgentScore({
      agentId: this.meta.agentId,
      cycleId,
      relevance: 0,
      novelty: 0,
      coherence: 0,
      composite: score,
      timestamp: new Date().toISOString(),
    });
  }
}
