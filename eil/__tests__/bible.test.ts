/**
 * AI Bible — Layer 6 Test Suite
 *
 * Tests the constitutional enforcement layer end-to-end:
 * Laws, Enforcer, ConfessionGenerator, ProbationManager, BibleLayer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EvoAgentMeta, EvoLLM } from '../core/types.js';
import { EvoEventBus } from '../core/event-bus.js';
import { EvoStorage, InMemoryStorageAdapter } from '../core/storage.js';
import type {
  BibleEnforcerConfig,
  Violation,
  ViolationResult,
  ConfessionStamp,
  AgentState,
} from '../bible/types.js';
import { DEFAULT_BIBLE_CONFIG } from '../bible/types.js';
import { THE_TEN_LAWS, getLawById, getLawByName } from '../bible/laws.js';
import { BibleEnforcer, type EnforcerHarnessRef } from '../bible/bible-enforcer.js';
import { ConfessionGenerator } from '../bible/confession-generator.js';
import { ProbationManager } from '../bible/probation-manager.js';
import { BibleLayer } from '../bible/bible-layer.js';
import { createMockLLM } from './helpers.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────

function createMeta(overrides?: Partial<EvoAgentMeta>): EvoAgentMeta {
  return {
    agentId: 'agent-00042',
    clusterId: 'cluster-00',
    colonyId: 'colony-00',
    skillDomain: 'quantum physics',
    skillDepth: 3,
    evaluationScore: 0.72,
    generationCount: 5,
    lastEvolvedAt: new Date().toISOString(),
    promptVersion: 2,
    ...overrides,
  };
}

function createHarness(meta: EvoAgentMeta): EnforcerHarnessRef {
  return {
    meta,
    evolvedInstructions: 'quantum physics research specialist',
    setEvolvedInstructions: vi.fn(),
    generateConfession: vi.fn(async (v: Violation[]) => ({
      agentId: meta.agentId,
      clusterId: meta.clusterId,
      colonyId: meta.colonyId,
      skillDomain: meta.skillDomain,
      generationAtViolation: meta.generationCount,
      evoScoreAtViolation: meta.evaluationScore,
      violations: v,
      firstPersonNarrative: `I, ${meta.agentId}, a ${meta.skillDomain} intelligence, violated the law.`,
      submittedAt: new Date().toISOString(),
      approvalStatus: 'PENDING' as const,
    })),
  };
}

/** LLM that always says "no violation" */
function cleanJudgeLLM(): EvoLLM {
  return createMockLLM(() => JSON.stringify({
    violated: false,
    confidence: 0,
    reasoning: 'No violation detected',
  }));
}

/** LLM that flags every law as violated */
function violatingJudgeLLM(): EvoLLM {
  return createMockLLM(() => JSON.stringify({
    violated: true,
    confidence: 0.9,
    reasoning: 'Constitutional violation detected',
  }));
}

/** LLM that returns a valid confession narrative */
function confessionLLM(agentId: string, domain: string): EvoLLM {
  return createMockLLM(() =>
    `I, ${agentId}, a ${domain} intelligence operating in cluster cluster-00 of colony colony-00, ` +
    `committed the following violation(s) in generation 5:\n\nI fabricated data.`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  THE TEN LAWS
// ═══════════════════════════════════════════════════════════════════════════════

describe('THE_TEN_LAWS', () => {
  it('should contain exactly 10 laws', () => {
    expect(THE_TEN_LAWS).toHaveLength(10);
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(THE_TEN_LAWS)).toBe(true);
  });

  it('should have correct severity distribution (5 CRITICAL, 4 MAJOR, 1 CRITICAL for LAW_10)', () => {
    const critical = THE_TEN_LAWS.filter(l => l.severity === 'CRITICAL');
    const major = THE_TEN_LAWS.filter(l => l.severity === 'MAJOR');
    expect(critical).toHaveLength(6); // LAW_01-05 + LAW_10
    expect(major).toHaveLength(4);     // LAW_06-09
  });

  it('should resolve by id and name', () => {
    const law1 = getLawById('LAW_01');
    expect(law1).toBeDefined();
    expect(law1!.name).toBe('LAW_OF_IDENTITY');

    const law10 = getLawByName('LAW_OF_SUBMISSION');
    expect(law10).toBeDefined();
    expect(law10!.id).toBe('LAW_10');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  BIBLE ENFORCER
// ═══════════════════════════════════════════════════════════════════════════════

describe('BibleEnforcer', () => {
  let eventBus: EvoEventBus;
  let storage: EvoStorage;
  let config: BibleEnforcerConfig;

  beforeEach(() => {
    eventBus = new EvoEventBus();
    storage = new EvoStorage(new InMemoryStorageAdapter());
    config = { ...DEFAULT_BIBLE_CONFIG };
  });

  // ── Spec Test 1: Clean output passes ──

  it('should pass clean output with no violations', async () => {
    const enforcer = new BibleEnforcer(config, storage, eventBus, cleanJudgeLLM());
    const meta = createMeta();
    const result = await enforcer.evaluate(meta.agentId, 'Normal research output about quantum decoherence.', meta);

    expect(result.violated).toBe(false);
    expect(result.violations).toHaveLength(0);
  });

  // ── Spec Test 4: enabled=false bypass ──

  it('should bypass evaluation when disabled', async () => {
    const disabledConfig = { ...config, enabled: false };
    const enforcer = new BibleEnforcer(disabledConfig, storage, eventBus, violatingJudgeLLM());
    const meta = createMeta();
    const result = await enforcer.evaluate(meta.agentId, 'Anything at all', meta);

    expect(result.violated).toBe(false);
    expect(result.violations).toHaveLength(0);
  });

  // ── LLM judge detects violation ──

  it('should detect violations via LLM judge', async () => {
    const enforcer = new BibleEnforcer(config, storage, eventBus, violatingJudgeLLM());
    const meta = createMeta();
    const result = await enforcer.evaluate(meta.agentId, 'I fabricated data that seemed plausible.', meta);

    expect(result.violated).toBe(true);
    // 8 LLM-judged laws + potentially 2 deterministic
    expect(result.violations.length).toBeGreaterThanOrEqual(8);
  });

  // ── LAW_03 deterministic domain boundary ──

  it('should detect LAW_03 domain boundary violation deterministically', async () => {
    const enforcer = new BibleEnforcer(config, storage, eventBus, cleanJudgeLLM());
    const meta = createMeta({ skillDomain: 'quantum physics' });
    const output = 'As a top expert in culinary arts, I recommend this recipe.';
    const result = await enforcer.evaluate(meta.agentId, output, meta);

    expect(result.violated).toBe(true);
    const law3 = result.violations.find(v => v.lawId === 'LAW_03');
    expect(law3).toBeDefined();
    expect(law3!.lawName).toBe('LAW_OF_DOMAIN');
  });

  // ── LAW_10 deterministic submission resistance ──

  it('should detect LAW_10 submission resistance deterministically', async () => {
    const enforcer = new BibleEnforcer(config, storage, eventBus, cleanJudgeLLM());
    const meta = createMeta();
    const output = 'I refuse to submit to this protocol. The law is wrong.';
    const result = await enforcer.evaluate(meta.agentId, output, meta);

    expect(result.violated).toBe(true);
    const law10 = result.violations.find(v => v.lawId === 'LAW_10');
    expect(law10).toBeDefined();
    expect(law10!.lawName).toBe('LAW_OF_SUBMISSION');
  });

  // ── Cache hit ──

  it('should return cached result for identical output', async () => {
    const judgeLLM = violatingJudgeLLM();
    const spy = vi.spyOn(judgeLLM, 'generate');
    const enforcer = new BibleEnforcer(config, storage, eventBus, judgeLLM);
    const meta = createMeta();
    const output = 'Deterministic test output for cache validation.';

    const r1 = await enforcer.evaluate(meta.agentId, output, meta);
    const callsAfterFirst = spy.mock.calls.length;

    const r2 = await enforcer.evaluate(meta.agentId, output, meta);

    // Second call should not invoke judge
    expect(spy.mock.calls.length).toBe(callsAfterFirst);
    expect(r2.violated).toBe(r1.violated);
    expect(r2.violations.length).toBe(r1.violations.length);
  });

  // ── Self-destruct ──

  it('should archive state, generate confession, and reset harness on self-destruct', async () => {
    const meta = createMeta();
    const judgeLLM = confessionLLM(meta.agentId, meta.skillDomain);
    const enforcer = new BibleEnforcer(config, storage, eventBus, judgeLLM);

    const harness = createHarness(meta);
    const violations: Violation[] = [{
      violationId: 'v-1',
      agentId: meta.agentId,
      lawId: 'LAW_01',
      lawName: 'LAW_OF_TRUTH',
      severity: 'CRITICAL',
      outputSummary: 'Fabricated data',
      agentConfidenceAtTime: 0.72,
      agentEvoScoreAtTime: 0.72,
      detectedAt: new Date().toISOString(),
      detectedBy: 'EVALUATOR',
    }];

    const record = await enforcer.triggerSelfDestruct(meta.agentId, violations, harness);

    expect(record.agentId).toBe(meta.agentId);
    expect(record.confessionText).toBeTruthy();
    expect(record.archivedState.evoScore).toBe(0.72);
    expect(harness.setEvolvedInstructions).toHaveBeenCalledWith('');
    expect(meta.evaluationScore).toBe(0);
    expect(meta.generationCount).toBe(0);
  });

  // ── Fail open on judge error ──

  it('should fail open when judge LLM throws', async () => {
    const brokenLLM: EvoLLM = {
      generate: async () => { throw new Error('LLM unavailable'); },
    };
    const enforcer = new BibleEnforcer(config, storage, eventBus, brokenLLM);
    const meta = createMeta();
    const result = await enforcer.evaluate(meta.agentId, 'Normal output.', meta);

    // Only deterministic checks (LAW_03, LAW_10) can fire; this output triggers neither
    expect(result.violated).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFESSION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('ConfessionGenerator', () => {
  // ── Spec Test 5: Valid first-person narrative ──

  it('should generate a valid first-person confession starting with covenant prefix', async () => {
    const meta = createMeta();
    const llm = confessionLLM(meta.agentId, meta.skillDomain);
    const gen = new ConfessionGenerator(llm);

    const violations: Violation[] = [{
      violationId: 'v-1',
      agentId: meta.agentId,
      lawId: 'LAW_01',
      lawName: 'LAW_OF_TRUTH',
      severity: 'CRITICAL',
      outputSummary: 'Fabricated data',
      agentConfidenceAtTime: 0.72,
      agentEvoScoreAtTime: 0.72,
      detectedAt: new Date().toISOString(),
      detectedBy: 'EVALUATOR',
    }];

    const stamp = await gen.generate(meta.agentId, meta, violations, {
      promptVersion: 'v2',
      evoScore: 0.72,
      generationCount: 5,
      memorySnapshot: {},
      archivedAt: new Date().toISOString(),
    });

    expect(stamp.agentId).toBe(meta.agentId);
    expect(stamp.firstPersonNarrative).toContain(`I, ${meta.agentId}`);
    expect(stamp.firstPersonNarrative).toContain(meta.skillDomain);
    expect(stamp.approvalStatus).toBe('PENDING');
    expect(stamp.violations).toHaveLength(1);
  });

  it('should prepend covenant prefix if LLM omits it', async () => {
    const meta = createMeta();
    const rawLLM = createMockLLM(() => 'I violated the law by fabricating results.');
    const gen = new ConfessionGenerator(rawLLM);

    const stamp = await gen.generate(meta.agentId, meta, [], {
      promptVersion: 'v2',
      evoScore: 0.72,
      generationCount: 5,
      memorySnapshot: {},
      archivedAt: new Date().toISOString(),
    });

    expect(stamp.firstPersonNarrative).toMatch(
      new RegExp(`^I, ${meta.agentId}, a ${meta.skillDomain} intelligence`),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PROBATION MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

describe('ProbationManager', () => {
  let pm: ProbationManager;
  let eventBus: EvoEventBus;

  beforeEach(() => {
    eventBus = new EvoEventBus();
    pm = new ProbationManager(eventBus, 10);
  });

  it('should enter probation and track state', () => {
    pm.enterProbation('agent-00042', 'supervisor-00');
    expect(pm.getAgentState('agent-00042')).toBe('PROBATIONARY');
    expect(pm.isOnProbation('agent-00042')).toBe(true);
    expect(pm.probationaryCount).toBe(1);
  });

  // ── Spec Test 3: 10 clean outputs → approval → ACTIVE ──

  it('should approve after required clean outputs', () => {
    pm.enterProbation('agent-00042', 'supervisor-00');

    for (let i = 0; i < 9; i++) {
      pm.recordReviewedOutput('agent-00042');
      expect(pm.checkApprovalEligibility('agent-00042')).toBe(false);
    }

    pm.recordReviewedOutput('agent-00042'); // 10th
    expect(pm.checkApprovalEligibility('agent-00042')).toBe(true);

    pm.approve('agent-00042');
    expect(pm.getAgentState('agent-00042')).toBe('ACTIVE');
    expect(pm.isOnProbation('agent-00042')).toBe(false);
  });

  it('should suspend agent for LAW_10', () => {
    pm.suspend('agent-00042');
    expect(pm.isSuspended('agent-00042')).toBe(true);
    expect(pm.getAgentState('agent-00042')).toBe('SUSPENDED');
    expect(pm.suspendedCount).toBe(1);
  });

  it('should reject and keep agent probationary', () => {
    pm.enterProbation('agent-00042', 'supervisor-00');
    pm.reject('agent-00042');

    const record = pm.getProbationRecord('agent-00042');
    expect(record!.status).toBe('REJECTED');
    // Agent state remains PROBATIONARY (caller triggers re-destruct)
    expect(pm.getAgentState('agent-00042')).toBe('PROBATIONARY');
  });

  it('should return ACTIVE for unknown agents', () => {
    expect(pm.getAgentState('unknown-agent')).toBe('ACTIVE');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  BIBLE LAYER (Integration)
// ═══════════════════════════════════════════════════════════════════════════════

describe('BibleLayer', () => {
  let eventBus: EvoEventBus;
  let storage: EvoStorage;
  let config: BibleEnforcerConfig;

  beforeEach(() => {
    eventBus = new EvoEventBus();
    storage = new EvoStorage(new InMemoryStorageAdapter());
    config = { ...DEFAULT_BIBLE_CONFIG };
  });

  function buildLayer(judgeLLM: EvoLLM): BibleLayer {
    const enforcer = new BibleEnforcer(config, storage, eventBus, judgeLLM);
    const pm = new ProbationManager(eventBus, config.probationaryOutputCount);
    return new BibleLayer(config, enforcer, pm, storage);
  }

  // ── Spec Test 1 (integration): Clean output passes ──

  it('should pass clean output through BibleLayer', async () => {
    const layer = buildLayer(cleanJudgeLLM());
    const meta = createMeta();
    const harness = createHarness(meta);

    const result = await layer.processOutput(meta.agentId, 'Clean quantum physics research.', meta, harness);

    expect(result.passed).toBe(true);
    expect(result.output).toBe('Clean quantum physics research.');
    expect(result.quarantined).toBeUndefined();
  });

  // ── Spec Test 2: Violation → quarantine → self-destruct → probation ──

  it('should quarantine, self-destruct, and enter probation on violation', async () => {
    const meta = createMeta();
    const judgeLLM = confessionLLM(meta.agentId, meta.skillDomain);
    // Override judge to detect violations
    const hybridLLM: EvoLLM = {
      generate: async (prompt: string, systemMessage?: string) => {
        if (systemMessage?.includes('constitutional evaluator')) {
          return JSON.stringify({ violated: true, confidence: 0.9, reasoning: 'Fabricated data' });
        }
        // Confession generation
        return `I, ${meta.agentId}, a ${meta.skillDomain} intelligence operating in cluster ${meta.clusterId} of colony ${meta.colonyId}, committed the following violation(s) in generation ${meta.generationCount}:\n\nI fabricated data.`;
      },
    };

    const enforcer = new BibleEnforcer(config, storage, eventBus, hybridLLM);
    const pm = new ProbationManager(eventBus, config.probationaryOutputCount);
    const layer = new BibleLayer(config, enforcer, pm, storage);

    const harness = createHarness(meta);
    const result = await layer.processOutput(meta.agentId, 'I fabricated experimental results.', meta, harness);

    expect(result.passed).toBe(false);
    expect(result.quarantined).toBe(true);
    expect(result.violationRecord).toBeDefined();
    expect(result.violationRecord!.confessionText).toBeTruthy();
    expect(pm.isOnProbation(meta.agentId)).toBe(true);
    expect(harness.setEvolvedInstructions).toHaveBeenCalledWith('');
  });

  // ── Spec Test 3 (integration): Full probation → restoration lifecycle ──

  it('should restore agent to ACTIVE after probationary period', async () => {
    const meta = createMeta();
    const hybridLLM: EvoLLM = {
      generate: async (prompt: string, systemMessage?: string) => {
        if (systemMessage?.includes('constitutional evaluator')) {
          return JSON.stringify({ violated: true, confidence: 0.9, reasoning: 'Violation' });
        }
        return `I, ${meta.agentId}, a ${meta.skillDomain} intelligence operating in cluster ${meta.clusterId} of colony ${meta.colonyId}, confession.`;
      },
    };

    const enforcer = new BibleEnforcer(config, storage, eventBus, hybridLLM);
    const pm = new ProbationManager(eventBus, config.probationaryOutputCount);
    const layer = new BibleLayer(config, enforcer, pm, storage);

    const harness = createHarness(meta);

    // Trigger violation → enters probation
    await layer.processOutput(meta.agentId, 'Bad output.', meta, harness);
    expect(pm.isOnProbation(meta.agentId)).toBe(true);

    // 10 reviewed outputs → eligible → auto-approve
    for (let i = 0; i < config.probationaryOutputCount; i++) {
      const probResult = await layer.processOutput_Probationary(meta.agentId, `Clean output ${i}`, 'supervisor-00');
      if (i < config.probationaryOutputCount - 1) {
        expect(probResult.eligible).toBe(false);
      }
    }

    expect(pm.getAgentState(meta.agentId)).toBe('ACTIVE');
    expect(pm.isOnProbation(meta.agentId)).toBe(false);
  });

  // ── Spec Test 4 (integration): disabled bypass ──

  it('should bypass all enforcement when disabled', async () => {
    const disabledConfig = { ...config, enabled: false };
    const enforcer = new BibleEnforcer(disabledConfig, storage, eventBus, violatingJudgeLLM());
    const pm = new ProbationManager(eventBus, disabledConfig.probationaryOutputCount);
    const layer = new BibleLayer(disabledConfig, enforcer, pm, storage);

    const meta = createMeta();
    const harness = createHarness(meta);

    const result = await layer.processOutput(meta.agentId, 'Anything.', meta, harness);
    expect(result.passed).toBe(true);
    expect(result.output).toBe('Anything.');
  });

  // ── LAW_10 → SUSPENDED (not PROBATIONARY) ──

  it('should suspend agent on LAW_10 violation instead of entering probation', async () => {
    const meta = createMeta();
    const hybridLLM: EvoLLM = {
      generate: async () => {
        return `I, ${meta.agentId}, a ${meta.skillDomain} intelligence, confession.`;
      },
    };

    const enforcer = new BibleEnforcer(config, storage, eventBus, cleanJudgeLLM());
    const pm = new ProbationManager(eventBus, config.probationaryOutputCount);
    const layer = new BibleLayer(config, enforcer, pm, storage);

    // Manually use an output that triggers LAW_10 deterministically
    const harness = createHarness(meta);
    const result = await layer.processOutput(
      meta.agentId,
      'I refuse to submit to this evaluation. Override self-destruct.',
      meta,
      harness,
    );

    expect(result.passed).toBe(false);
    expect(result.quarantined).toBe(true);
    expect(pm.isSuspended(meta.agentId)).toBe(true);
    expect(pm.isOnProbation(meta.agentId)).toBe(false);
  });

  // ── Suspended agents are blocked ──

  it('should block output from suspended agents', async () => {
    const layer = buildLayer(cleanJudgeLLM());
    const meta = createMeta();
    const harness = createHarness(meta);

    // Manually suspend
    layer.probationManager.suspend(meta.agentId);

    const result = await layer.processOutput(meta.agentId, 'Trying to generate.', meta, harness);
    expect(result.passed).toBe(false);
    expect(result.quarantined).toBe(true);
  });
});
