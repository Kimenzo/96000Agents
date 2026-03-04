/**
 * EVO Intelligence Layer — Mode Comparator Tests
 *
 * SWITCH: Tests metrics sampling, aggregation, winner determination,
 * weighted scoring, and recommendation generation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EvoModeComparator } from '../../switch/mode-comparator.js';
import { EvoEventBus } from '../../core/event-bus.js';
import { EvoStorage, InMemoryStorageAdapter } from '../../core/storage.js';
import type { EvoModeController } from '../../switch/mode-controller.js';
import type { StrategyMetrics, RuntimeMode } from '../../switch/types.js';
import { createMockLLM } from '../helpers.js';

// ─── Mock Mode Controller ─────────────────────────────────────────────────────

function mockMetrics(mode: RuntimeMode, overrides?: Partial<StrategyMetrics>): StrategyMetrics {
  return {
    mode,
    generationsPerMinute: 150,
    averageAgentLatencyMs: 50,
    findingsPropagatedPerMinute: 120,
    gpuUtilizationPercent: 55,
    queueDepth: 0,
    idleAgentPercent: 25,
    activeAgentPercent: 75,
    ...(mode === 'CYCLIC' ? { cycleCompletionTimeMs: 2000 } : { medianThresholdChargePercent: 50 }),
    ...overrides,
  };
}

function createMockController(currentMode: RuntimeMode = 'CYCLIC'): {
  controller: EvoModeController;
  setMode: (mode: RuntimeMode) => void;
  setMetrics: (m: Partial<StrategyMetrics>) => void;
} {
  let mode = currentMode;
  let metricsOverrides: Partial<StrategyMetrics> = {};

  const controller = {
    currentMode: mode,
    getCurrentMetrics: () => mockMetrics(mode, metricsOverrides),
    strategy: { mode },
  } as unknown as EvoModeController;

  return {
    controller,
    setMode: (m: RuntimeMode) => {
      mode = m;
      (controller as any).currentMode = m;
      (controller as any).strategy = { mode: m };
    },
    setMetrics: (m: Partial<StrategyMetrics>) => {
      metricsOverrides = m;
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EvoModeComparator', () => {
  let eventBus: EvoEventBus;
  let storage: EvoStorage;
  let mock: ReturnType<typeof createMockController>;
  let comparator: EvoModeComparator;

  beforeEach(() => {
    eventBus = new EvoEventBus();
    storage = new EvoStorage(new InMemoryStorageAdapter());
    mock = createMockController('CYCLIC');
  });

  afterEach(() => {
    comparator?.stop();
  });

  it('samples metrics at the configured interval', async () => {
    comparator = new EvoModeComparator(
      mock.controller,
      storage,
      eventBus,
      undefined,
      30, // 30ms sample interval for fast testing
    );
    comparator.start();

    await new Promise(r => setTimeout(r, 100));

    expect(comparator.sampleCount).toBeGreaterThanOrEqual(2);
  });

  it('getComparisonReport returns INSUFFICIENT_DATA with no samples', async () => {
    comparator = new EvoModeComparator(mock.controller, storage, eventBus);
    const report = await comparator.getComparisonReport();
    expect(report.winner).toBe('INSUFFICIENT_DATA');
    expect(report.cyclic).toBeNull();
    expect(report.neural).toBeNull();
  });

  it('getComparisonReport returns null for mode with no data (only CYCLIC)', async () => {
    comparator = new EvoModeComparator(
      mock.controller,
      storage,
      eventBus,
      undefined,
      20,
    );
    comparator.start();

    // Collect a few CYCLIC samples
    await new Promise(r => setTimeout(r, 80));

    const report = await comparator.getComparisonReport();
    // We have CYCLIC data but no NEURAL data
    expect(report.cyclic).not.toBeNull();
    expect(report.neural).toBeNull();
    expect(report.winner).toBe('INSUFFICIENT_DATA');
  });

  it('determines winner with known metric values', async () => {
    comparator = new EvoModeComparator(
      mock.controller,
      storage,
      eventBus,
      undefined,
      20,
    );
    comparator.start();

    // Collect CYCLIC samples with lower performance
    mock.setMetrics({
      findingsPropagatedPerMinute: 50,
      gpuUtilizationPercent: 30,
      idleAgentPercent: 60,
    });
    await new Promise(r => setTimeout(r, 60));

    // Switch to NEURAL with higher performance
    mock.setMode('NEURAL');
    mock.setMetrics({
      findingsPropagatedPerMinute: 200,
      gpuUtilizationPercent: 70,
      idleAgentPercent: 10,
    });
    await new Promise(r => setTimeout(r, 60));

    const report = await comparator.getComparisonReport();
    expect(report.cyclic).not.toBeNull();
    expect(report.neural).not.toBeNull();
    expect(report.winner).toBe('NEURAL'); // higher findings, GPU, and active %
  });

  it('weighted scoring: findings 40%, GPU 30%, active 30%', async () => {
    comparator = new EvoModeComparator(mock.controller, storage, eventBus);

    // Manually inject history records for precise scoring
    const history = (comparator as any).metricsHistory;
    const now = Date.now();

    // CYCLIC: low findings, low GPU, high idle
    history.push({
      mode: 'CYCLIC',
      generationsPerMinute: 100,
      averageAgentLatencyMs: 50,
      findingsPropagatedPerMinute: 100,   // 100/2000 = 0.05 * 0.4 = 0.02
      gpuUtilizationPercent: 20,          // 20/100 = 0.2 * 0.3 = 0.06
      queueDepth: 0,
      idleAgentPercent: 80,              // active = 0.2 * 0.3 = 0.06
      activeAgentPercent: 20,
      timestamp: now - 1000,
    });

    // NEURAL: high findings, high GPU, low idle
    history.push({
      mode: 'NEURAL',
      generationsPerMinute: 200,
      averageAgentLatencyMs: 30,
      findingsPropagatedPerMinute: 1000,  // 1000/2000 = 0.5 * 0.4 = 0.20
      gpuUtilizationPercent: 80,          // 80/100 = 0.8 * 0.3 = 0.24
      queueDepth: 0,
      idleAgentPercent: 10,              // active = 0.9 * 0.3 = 0.27
      activeAgentPercent: 90,
      timestamp: now - 500,
    });

    const report = await comparator.getComparisonReport();
    expect(report.winner).toBe('NEURAL');
    // Cyclic score ≈ 0.02 + 0.06 + 0.06 = 0.14
    // Neural score ≈ 0.20 + 0.24 + 0.27 = 0.71
  });

  it('deterministic recommendation when no LLM', async () => {
    comparator = new EvoModeComparator(mock.controller, storage, eventBus);

    const history = (comparator as any).metricsHistory;
    const now = Date.now();
    history.push({
      mode: 'CYCLIC', generationsPerMinute: 100, averageAgentLatencyMs: 50,
      findingsPropagatedPerMinute: 50, gpuUtilizationPercent: 30, queueDepth: 0,
      idleAgentPercent: 60, activeAgentPercent: 40, timestamp: now - 1000,
    });
    history.push({
      mode: 'NEURAL', generationsPerMinute: 200, averageAgentLatencyMs: 30,
      findingsPropagatedPerMinute: 200, gpuUtilizationPercent: 70, queueDepth: 0,
      idleAgentPercent: 20, activeAgentPercent: 80, timestamp: now - 500,
    });

    const report = await comparator.getComparisonReport();
    expect(report.recommendation).toContain('NEURAL');
    expect(report.recommendation).toContain('%');
  });

  it('LLM-backed recommendation when LLM provided', async () => {
    const llm = createMockLLM(() => 'Switch to NEURAL for 3x better throughput.');
    comparator = new EvoModeComparator(mock.controller, storage, eventBus, llm);

    const history = (comparator as any).metricsHistory;
    const now = Date.now();
    history.push({
      mode: 'CYCLIC', generationsPerMinute: 100, averageAgentLatencyMs: 50,
      findingsPropagatedPerMinute: 50, gpuUtilizationPercent: 30, queueDepth: 0,
      idleAgentPercent: 60, activeAgentPercent: 40, timestamp: now - 1000,
    });
    history.push({
      mode: 'NEURAL', generationsPerMinute: 200, averageAgentLatencyMs: 30,
      findingsPropagatedPerMinute: 200, gpuUtilizationPercent: 70, queueDepth: 0,
      idleAgentPercent: 20, activeAgentPercent: 80, timestamp: now - 500,
    });

    const report = await comparator.getComparisonReport();
    expect(report.recommendation).toContain('3x better throughput');
  });

  it('metricsHistory is isolated via getMetricsHistory()', () => {
    comparator = new EvoModeComparator(mock.controller, storage, eventBus);
    const h1 = comparator.getMetricsHistory();
    const h2 = comparator.getMetricsHistory();
    // Should return copies
    expect(h1).not.toBe(h2);
  });

  it('persists samples to storage', async () => {
    const adapter = new InMemoryStorageAdapter();
    const store = new EvoStorage(adapter);
    comparator = new EvoModeComparator(mock.controller, store, eventBus, undefined, 20);
    comparator.start();

    await new Promise(r => setTimeout(r, 80));
    comparator.stop();

    const rows = await adapter.queryRows('eil_mode_metrics', {});
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
