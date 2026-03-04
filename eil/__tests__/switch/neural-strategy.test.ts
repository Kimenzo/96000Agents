/**
 * EVO Intelligence Layer — Neural Strategy Tests
 *
 * SWITCH: Tests charge accumulation, threshold firing, decay, neighbor
 * propagation, adaptive threshold, and refractory period.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NeuralExecutionStrategy } from '../../switch/neural-strategy.js';
import { EvoEventBus } from '../../core/event-bus.js';
import type { NeuralConfig, DomainSignal } from '../../switch/types.js';
import type { EvoAgentMeta, Finding } from '../../core/types.js';
import type { EvoRegistry } from '../../core/registry.js';
import type { EvoAgentHarness } from '../../agents/evo-agent-harness.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMeta(agentId: string, domain = 'quantum physics', evaScore = 0.5): EvoAgentMeta {
  return {
    agentId,
    clusterId: 'cluster-0000',
    colonyId: 'colony-00',
    skillDomain: domain,
    skillDepth: 3,
    evaluationScore: evaScore,
    generationCount: 5,
    lastEvolvedAt: new Date().toISOString(),
    promptVersion: 2,
  };
}

function makeFinding(agentId = 'agent-00001', domain = 'quantum physics'): Finding {
  return {
    findingId: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    agentId,
    type: 'NOVEL_PATTERN',
    content: 'Neural test finding.',
    confidenceScore: 0.8,
    evidenceBase: [],
    domainTag: domain,
    timestamp: new Date().toISOString(),
    propagationLevel: 'LOCAL',
  };
}

function createMockRegistry(agents: EvoAgentMeta[]): EvoRegistry {
  const agentMap = new Map(agents.map(a => [a.agentId, a]));
  return {
    getAgentMeta: (id: string) => agentMap.get(id) ?? null,
    getSkillNeighbors: (agentId: string, max: number) => {
      return agents.filter(a => a.agentId !== agentId).slice(0, max);
    },
    getAllClusterIds: () => ['cluster-0000'],
    getColonyForCluster: () => 'colony-00',
  } as unknown as EvoRegistry;
}

function createMockHarness(agentMeta: EvoAgentMeta): EvoAgentHarness {
  return {
    meta: agentMeta,
    generate: vi.fn().mockResolvedValue({ text: 'mock', finding: makeFinding(agentMeta.agentId) }),
  } as unknown as EvoAgentHarness;
}

function createConfig(
  agents: EvoAgentMeta[],
  overrides?: Partial<Omit<NeuralConfig, 'registry' | 'eventBus' | 'harnessMap'>>,
): { config: NeuralConfig; harnessMap: Map<string, EvoAgentHarness>; eventBus: EvoEventBus } {
  const eventBus = new EvoEventBus();
  const registry = createMockRegistry(agents);
  const harnessMap = new Map<string, EvoAgentHarness>();
  for (const a of agents) {
    harnessMap.set(a.agentId, createMockHarness(a));
  }
  return {
    config: {
      chargeIncrement: 0.15,
      chargeDecayPerSecond: 0.05,
      initialSeedCharge: 0.3,
      supervisorThreshold: 5.0,
      decayIntervalMs: 1000,
      registry,
      eventBus,
      harnessMap,
      ...overrides,
    },
    harnessMap,
    eventBus,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NeuralExecutionStrategy', () => {
  let strategy: NeuralExecutionStrategy;
  let harnessMap: Map<string, EvoAgentHarness>;
  let agents: EvoAgentMeta[];

  beforeEach(async () => {
    agents = [
      makeMeta('agent-00001', 'quantum physics', 0.5),
      makeMeta('agent-00002', 'quantum physics', 0.8),
      makeMeta('agent-00003', 'machine learning', 0.3),
    ];
    const setup = createConfig(agents, { decayIntervalMs: 50_000 }); // long decay = effectively disabled
    strategy = new NeuralExecutionStrategy(setup.config);
    harnessMap = setup.harnessMap;
    await strategy.start();
  });

  afterEach(async () => {
    await strategy.stop();
  });

  // ── Threshold Computation ───────────────────────────────────────────────

  it('computes adaptive threshold: 0.85 - (evaScore * 0.25)', () => {
    // evaScore=0 → 0.85, evaScore=1.0 → 0.60
    expect(strategy.computeThreshold(0)).toBeCloseTo(0.85);
    expect(strategy.computeThreshold(0.5)).toBeCloseTo(0.725);
    expect(strategy.computeThreshold(1.0)).toBeCloseTo(0.60);
  });

  it('high-EvaScore agent has lower threshold (fires more readily)', () => {
    const lowThreshold = strategy.computeThreshold(0.9);
    const highThreshold = strategy.computeThreshold(0.2);
    expect(lowThreshold).toBeLessThan(highThreshold);
  });

  // ── Domain Relevance ────────────────────────────────────────────────────

  it('same domain → relevance 1.0', () => {
    expect(strategy.computeDomainRelevance('quantum physics', 'quantum physics')).toBe(1.0);
  });

  it('partial overlap → relevance 0.3 or 0.6', () => {
    // "quantum physics" vs "quantum computing" → 1 of 2 overlapping = 50% → 0.6
    expect(strategy.computeDomainRelevance('quantum computing', 'quantum physics')).toBe(0.6);
  });

  it('no overlap → relevance 0.1', () => {
    expect(strategy.computeDomainRelevance('biology', 'quantum physics')).toBe(0.1);
  });

  // ── Charge Accumulation ─────────────────────────────────────────────────

  it('chargeAgent increases charge proportional to relevance', async () => {
    const initialCharge = strategy.getAgentCharge('agent-00001');
    await strategy.chargeAgent('agent-00001', {
      domainTag: 'quantum physics', // same domain → relevance 1.0
      significance: 1,
    });
    const afterCharge = strategy.getAgentCharge('agent-00001');
    // Expected increment: 1.0 * 0.15 = 0.15
    // But if threshold is crossed (0.3 seed + 0.15 = 0.45 vs threshold 0.725), agent should NOT fire
    expect(afterCharge).toBeGreaterThan(initialCharge);
  });

  it('agent does NOT fire below threshold', async () => {
    // Agent-00001: evaScore=0.5, threshold=0.725, initialSeed=0.3
    // One charge of 0.15 -> 0.45, still below 0.725
    await strategy.chargeAgent('agent-00001', {
      domainTag: 'quantum physics',
      significance: 1,
    });
    const harness = harnessMap.get('agent-00001')!;
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('agent DOES fire when threshold crossed', async () => {
    // Agent-00001: evaScore=0.5, threshold=0.725, initialSeed=0.3
    // Need: 0.725 - 0.3 = 0.425, each same-domain charge = 0.15
    // 3 charges → 0.3+0.45=0.75 > 0.725 → FIRE
    await strategy.chargeAgent('agent-00001', { domainTag: 'quantum physics', significance: 1 });
    await strategy.chargeAgent('agent-00001', { domainTag: 'quantum physics', significance: 1 });
    await strategy.chargeAgent('agent-00001', { domainTag: 'quantum physics', significance: 1 });

    // Allow microtasks to settle (fireAgent uses promise)
    await new Promise(r => setTimeout(r, 50));

    const harness = harnessMap.get('agent-00001')!;
    expect(harness.generate).toHaveBeenCalled();
  });

  it('refractory period: charge resets to 0 after firing', async () => {
    // Push agent-00001 over threshold
    await strategy.chargeAgent('agent-00001', { domainTag: 'quantum physics', significance: 1 });
    await strategy.chargeAgent('agent-00001', { domainTag: 'quantum physics', significance: 1 });
    await strategy.chargeAgent('agent-00001', { domainTag: 'quantum physics', significance: 1 });
    await new Promise(r => setTimeout(r, 50));

    // After firing, charge should be 0 (refractory)
    const charge = strategy.getAgentCharge('agent-00001');
    expect(charge).toBe(0);
  });

  it('charge caps at 1.0', async () => {
    // Charge many times — charge should never exceed 1.0
    for (let i = 0; i < 20; i++) {
      await strategy.chargeAgent('agent-00003', { domainTag: 'machine learning', significance: 1 });
    }
    await new Promise(r => setTimeout(r, 50));
    // After possible firing + recharges, charge should be ≤ 1.0
    const charge = strategy.getAgentCharge('agent-00003');
    expect(charge).toBeLessThanOrEqual(1.0);
  });

  // ── Seeding ─────────────────────────────────────────────────────────────

  it('seeds initial charge to all agents', () => {
    // All agents start with initialSeedCharge = 0.3
    expect(strategy.getAgentCharge('agent-00001')).toBeCloseTo(0.3);
    expect(strategy.getAgentCharge('agent-00002')).toBeCloseTo(0.3);
    expect(strategy.getAgentCharge('agent-00003')).toBeCloseTo(0.3);
  });

  // ── Metrics ─────────────────────────────────────────────────────────────

  it('getMetrics() returns valid NEURAL StrategyMetrics', () => {
    const metrics = strategy.getMetrics();
    expect(metrics.mode).toBe('NEURAL');
    expect(metrics.medianThresholdChargePercent).toBeDefined();
    expect(typeof metrics.activeAgentPercent).toBe('number');
    expect(typeof metrics.idleAgentPercent).toBe('number');
  });

  // ── Pause / Resume ──────────────────────────────────────────────────────

  it('pause() stops generating', async () => {
    await strategy.pause();
    expect(strategy.isPaused).toBe(true);
    const m = makeMeta('agent-00001');
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(false);
  });

  it('resume() after pause allows generation', async () => {
    await strategy.pause();
    expect(strategy.isPaused).toBe(true);
    await strategy.resume();
    expect(strategy.isPaused).toBe(false);
  });
});

// ─── Decay Tests (separate suite with shorter interval) ──────────────────────

describe('NeuralExecutionStrategy — Decay', () => {
  it('charge decays correctly over time', async () => {
    const agents = [makeMeta('agent-00001', 'quantum physics', 0.5)];
    const { config } = createConfig(agents, {
      decayIntervalMs: 50,
      chargeDecayPerSecond: 0.5, // aggressive decay for testing
      initialSeedCharge: 0.8,
    });
    const strategy = new NeuralExecutionStrategy(config);
    await strategy.start();

    const initialCharge = strategy.getAgentCharge('agent-00001');
    expect(initialCharge).toBeCloseTo(0.8);

    // Wait for several decay intervals
    await new Promise(r => setTimeout(r, 200));

    const afterDecay = strategy.getAgentCharge('agent-00001');
    expect(afterDecay).toBeLessThan(initialCharge);
    expect(afterDecay).toBeGreaterThanOrEqual(0);

    await strategy.stop();
  });
});
