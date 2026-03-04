/**
 * EVO Intelligence Layer — Cyclic Strategy Tests
 *
 * SWITCH: Tests tier assignment, cycle scheduling, buffering, pause/drain.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EvoEventBus } from '../../core/event-bus.js';
import {
  CyclicExecutionStrategy,
  EvoTierAssigner,
  EvoScheduler,
} from '../../switch/cyclic-strategy.js';
import type { CyclicConfig } from '../../switch/types.js';
import type { EvoAgentMeta, Finding } from '../../core/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function meta(overrides?: Partial<EvoAgentMeta>): EvoAgentMeta {
  return {
    agentId: 'agent-00001',
    clusterId: 'cluster-0000',
    colonyId: 'colony-00',
    skillDomain: 'quantum physics',
    skillDepth: 3,
    evaluationScore: 0.5,
    generationCount: 5,
    lastEvolvedAt: new Date().toISOString(),
    promptVersion: 2,
    ...overrides,
  };
}

function finding(agentId = 'agent-00001'): Finding {
  return {
    findingId: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    agentId,
    type: 'NOVEL_PATTERN',
    content: 'Cyclic test finding.',
    confidenceScore: 0.8,
    evidenceBase: [],
    domainTag: 'quantum physics',
    timestamp: new Date().toISOString(),
    propagationLevel: 'LOCAL',
  };
}

// ─── Tier Assigner ────────────────────────────────────────────────────────────

describe('EvoTierAssigner', () => {
  const assigner = new EvoTierAssigner();

  it('assigns Tier 1 to high-scoring agents (>= 0.7)', () => {
    expect(assigner.getTier('a', 0.8)).toBe(1);
    expect(assigner.getTier('a', 0.7)).toBe(1);
    expect(assigner.getTier('a', 1.0)).toBe(1);
  });

  it('assigns Tier 2 to mid-scoring agents (0.4 – 0.69)', () => {
    expect(assigner.getTier('a', 0.5)).toBe(2);
    expect(assigner.getTier('a', 0.4)).toBe(2);
    expect(assigner.getTier('a', 0.69)).toBe(2);
  });

  it('assigns Tier 3 to low-scoring agents (< 0.4)', () => {
    expect(assigner.getTier('a', 0.3)).toBe(3);
    expect(assigner.getTier('a', 0.0)).toBe(3);
    expect(assigner.getTier('a', 0.39)).toBe(3);
  });

  it('Tier 1 generates every cycle', () => {
    for (let c = 1; c <= 14; c++) {
      expect(assigner.isTierActive(1, c)).toBe(true);
    }
  });

  it('Tier 2 generates every 3rd cycle only', () => {
    const active = [3, 6, 9, 12];
    const inactive = [1, 2, 4, 5, 7, 8, 10, 11, 13];
    for (const c of active) expect(assigner.isTierActive(2, c)).toBe(true);
    for (const c of inactive) expect(assigner.isTierActive(2, c)).toBe(false);
  });

  it('Tier 3 generates every 7th cycle only', () => {
    const active = [7, 14, 21];
    const inactive = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13];
    for (const c of active) expect(assigner.isTierActive(3, c)).toBe(true);
    for (const c of inactive) expect(assigner.isTierActive(3, c)).toBe(false);
  });
});

// ─── Scheduler ────────────────────────────────────────────────────────────────

describe('EvoScheduler', () => {
  let eventBus: EvoEventBus;
  let scheduler: EvoScheduler;

  beforeEach(() => {
    eventBus = new EvoEventBus();
    scheduler = new EvoScheduler(eventBus);
  });

  it('buffers findings and reports correct queueDepth', () => {
    scheduler.bufferFinding('a1', finding('a1'));
    scheduler.bufferFinding('a1', finding('a1'));
    scheduler.bufferFinding('a2', finding('a2'));
    expect(scheduler.queueDepth).toBe(3);
  });

  it('flushAll() clears all buffers', () => {
    scheduler.bufferFinding('a1', finding('a1'));
    scheduler.bufferClusterFinding('c1', finding('a1'));
    scheduler.bufferColonySignal('col1', {
      clusterId: 'c1',
      colonyId: 'col1',
      accumulatedSignificance: 1,
      findingCount: 1,
      dominantDomain: 'quantum physics',
      timestamp: new Date().toISOString(),
    });
    expect(scheduler.queueDepth).toBe(3);
    scheduler.flushAll();
    expect(scheduler.queueDepth).toBe(0);
  });

  it('tracks cycle duration with markCycleStart/End', () => {
    scheduler.markCycleStart();
    // simulate some work
    const start = Date.now();
    while (Date.now() - start < 5) { /* busy-wait 5ms */ }
    scheduler.markCycleEnd();
    expect(scheduler.cycleDurationMs).toBeGreaterThanOrEqual(1);
  });
});

// ─── Cyclic Execution Strategy ────────────────────────────────────────────────

describe('CyclicExecutionStrategy', () => {
  let eventBus: EvoEventBus;
  let scheduler: EvoScheduler;
  let tierAssigner: EvoTierAssigner;
  let strategy: CyclicExecutionStrategy;
  const config: CyclicConfig = { cycleIntervalMs: 50 };

  beforeEach(() => {
    eventBus = new EvoEventBus();
    scheduler = new EvoScheduler(eventBus);
    tierAssigner = new EvoTierAssigner();
    strategy = new CyclicExecutionStrategy(config, scheduler, tierAssigner, 1000);
  });

  afterEach(async () => {
    await strategy.stop();
  });

  it('Tier 1 agent generates on every cycle', () => {
    const m = meta({ evaluationScore: 0.8 }); // Tier 1
    (strategy as any).currentCycle = 1;
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(true);
    (strategy as any).currentCycle = 5;
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(true);
    (strategy as any).currentCycle = 11;
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(true);
  });

  it('Tier 2 agent generates on 3rd cycle only', () => {
    const m = meta({ evaluationScore: 0.5 }); // Tier 2
    (strategy as any).currentCycle = 1;
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(false);
    (strategy as any).currentCycle = 2;
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(false);
    (strategy as any).currentCycle = 3;
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(true);
  });

  it('Tier 3 agent generates on 7th cycle only', () => {
    const m = meta({ evaluationScore: 0.2 }); // Tier 3
    (strategy as any).currentCycle = 1;
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(false);
    (strategy as any).currentCycle = 6;
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(false);
    (strategy as any).currentCycle = 7;
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(true);
  });

  it('paused strategy blocks all generation', async () => {
    const m = meta({ evaluationScore: 0.9 });
    (strategy as any).currentCycle = 1;
    await strategy.pause();
    expect(strategy.shouldAgentGenerate('agent-00001', m)).toBe(false);
  });

  it('buffers findings via onAgentGenerated', () => {
    strategy.onAgentGenerated('agent-00001', finding());
    expect(scheduler.queueDepth).toBe(1);
  });

  it('buffers cluster findings via onFindingReceived', () => {
    strategy.onFindingReceived('cluster-0000', finding());
    expect(scheduler.queueDepth).toBe(1);
  });

  it('pause() drains in-flight generations before returning', async () => {
    await strategy.start();

    let resolved = false;
    const slowGen = new Promise<void>(resolve => {
      setTimeout(() => { resolved = true; resolve(); }, 30);
    });
    strategy.trackGeneration(slowGen);

    await strategy.pause();
    expect(resolved).toBe(true);
    expect(strategy.isPaused).toBe(true);
  });

  it('getMetrics() returns valid CYCLIC StrategyMetrics', () => {
    (strategy as any).startedAt = Date.now() - 60_000;
    strategy.onAgentGenerated('agent-00001', finding());
    strategy.onAgentGenerated('agent-00002', finding('agent-00002'));

    const metrics = strategy.getMetrics();
    expect(metrics.mode).toBe('CYCLIC');
    expect(metrics.generationsPerMinute).toBeGreaterThan(0);
    expect(metrics.cycleCompletionTimeMs).toBeDefined();
    expect(metrics.activeAgentPercent).toBeDefined();
    expect(metrics.idleAgentPercent).toBeDefined();
  });

  it('tracks agent generation latency', () => {
    strategy.markGenerationStart('agent-00001');
    // Small delay to ensure measurable latency
    const start = Date.now();
    while (Date.now() - start < 2) { /* busy-wait */ }
    strategy.onAgentGenerated('agent-00001', finding());

    const metrics = strategy.getMetrics();
    expect(metrics.averageAgentLatencyMs).toBeGreaterThan(0);
  });
});
