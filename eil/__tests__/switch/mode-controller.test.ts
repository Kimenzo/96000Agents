/**
 * EVO Intelligence Layer — Mode Controller Tests
 *
 * SWITCH: Tests the 6-step flipTo sequence, in-flight drain, same-mode
 * rejection, switch history, and countdown variant.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EvoModeController } from '../../switch/mode-controller.js';
import { EvoEventBus } from '../../core/event-bus.js';
import { EvoStorage, InMemoryStorageAdapter } from '../../core/storage.js';
import type { IEvoExecutionStrategy, StrategyMetrics, RuntimeMode, ClusterSignal } from '../../switch/types.js';
import type { CyclicExecutionStrategy } from '../../switch/cyclic-strategy.js';
import type { NeuralExecutionStrategy } from '../../switch/neural-strategy.js';
import type { EvoAgentMeta, Finding } from '../../core/types.js';

// ─── Mock Strategy Factory ────────────────────────────────────────────────────

function mockMetrics(mode: RuntimeMode): StrategyMetrics {
  return {
    mode,
    generationsPerMinute: 100,
    averageAgentLatencyMs: 50,
    findingsPropagatedPerMinute: 80,
    gpuUtilizationPercent: 60,
    queueDepth: 0,
    idleAgentPercent: 30,
    activeAgentPercent: 70,
    ...(mode === 'CYCLIC' ? { cycleCompletionTimeMs: 2000 } : { medianThresholdChargePercent: 45 }),
  };
}

function createMockStrategy(mode: RuntimeMode): IEvoExecutionStrategy & {
  _started: boolean;
  _paused: boolean;
  _pauseDelay: number;
} {
  const obj = {
    _started: false,
    _paused: false,
    _pauseDelay: 0, // ms to simulate in-flight drain
    mode,
    shouldAgentGenerate: vi.fn().mockReturnValue(true),
    onAgentGenerated: vi.fn(),
    onFindingReceived: vi.fn(),
    onClusterSignalReceived: vi.fn(),
    start: vi.fn(async function (this: any) { this._started = true; this._paused = false; }),
    pause: vi.fn(async function (this: any) {
      if (this._pauseDelay > 0) {
        await new Promise(r => setTimeout(r, this._pauseDelay));
      }
      this._paused = true;
    }),
    resume: vi.fn(async function (this: any) { this._paused = false; }),
    stop: vi.fn(async function (this: any) { this._started = false; this._paused = true; }),
    getMetrics: vi.fn(() => mockMetrics(mode)),
  };
  // Bind all async fns to obj so `this` works correctly
  obj.start = vi.fn(obj.start.getMockImplementation()!.bind(obj));
  obj.pause = vi.fn(obj.pause.getMockImplementation()!.bind(obj));
  obj.resume = vi.fn(obj.resume.getMockImplementation()!.bind(obj));
  obj.stop = vi.fn(obj.stop.getMockImplementation()!.bind(obj));
  return obj;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EvoModeController', () => {
  let cyclic: ReturnType<typeof createMockStrategy>;
  let neural: ReturnType<typeof createMockStrategy>;
  let eventBus: EvoEventBus;
  let storage: EvoStorage;
  let controller: EvoModeController;

  beforeEach(() => {
    cyclic = createMockStrategy('CYCLIC');
    neural = createMockStrategy('NEURAL');
    eventBus = new EvoEventBus();
    storage = new EvoStorage(new InMemoryStorageAdapter());
    controller = new EvoModeController(
      cyclic as unknown as CyclicExecutionStrategy,
      neural as unknown as NeuralExecutionStrategy,
      'CYCLIC',
      eventBus,
      storage,
    );
  });

  it('starts in the specified initial mode', () => {
    expect(controller.currentMode).toBe('CYCLIC');
    expect(controller.strategy.mode).toBe('CYCLIC');
  });

  it('flipTo() rejects same-mode switch', async () => {
    const result = await controller.flipTo('CYCLIC', 'no reason');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Already');
  });

  it('flipTo() completes 6-step sequence CYCLIC→NEURAL', async () => {
    const emitted: string[] = [];
    eventBus.on('evolution:cycle:start', () => emitted.push('start'));
    eventBus.on('evolution:cycle:complete', () => emitted.push('complete'));

    const result = await controller.flipTo('NEURAL', 'test switch');

    expect(result.success).toBe(true);
    expect(result.from).toBe('CYCLIC');
    expect(result.to).toBe('NEURAL');
    expect(result.transitionDurationMs).toBeDefined();

    // Step 1: pause was called
    expect(cyclic.pause).toHaveBeenCalled();
    // Step 4: target started
    expect(neural.start).toHaveBeenCalled();
    // Steps 3 & 6: events emitted
    expect(emitted).toEqual(['start', 'complete']);

    // Active mode changed
    expect(controller.currentMode).toBe('NEURAL');
  });

  it('flipTo() NEURAL→CYCLIC works', async () => {
    // First switch to NEURAL
    await controller.flipTo('NEURAL', 'switch to neural');
    expect(controller.currentMode).toBe('NEURAL');

    // Then switch back
    const result = await controller.flipTo('CYCLIC', 'switch back');
    expect(result.success).toBe(true);
    expect(result.from).toBe('NEURAL');
    expect(result.to).toBe('CYCLIC');
    expect(controller.currentMode).toBe('CYCLIC');
  });

  it('flipTo() waits for in-flight drain (pause delay)', async () => {
    // Simulate a 40ms in-flight drain on cyclic.pause()
    cyclic._pauseDelay = 40;

    const start = Date.now();
    const result = await controller.flipTo('NEURAL', 'drain test');
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(30); // at least ~40ms
  });

  it('records switch in history', async () => {
    await controller.flipTo('NEURAL', 'first switch');
    await controller.flipTo('CYCLIC', 'second switch');

    const history = controller.getSwitchHistory();
    expect(history).toHaveLength(2);
    expect(history[0]!.from).toBe('CYCLIC');
    expect(history[0]!.to).toBe('NEURAL');
    expect(history[0]!.reason).toBe('first switch');
    expect(history[1]!.from).toBe('NEURAL');
    expect(history[1]!.to).toBe('CYCLIC');
    expect(history[1]!.reason).toBe('second switch');
  });

  it('getCurrentMetrics() delegates to active strategy', () => {
    const metrics = controller.getCurrentMetrics();
    expect(metrics.mode).toBe('CYCLIC');
    expect(cyclic.getMetrics).toHaveBeenCalled();
  });

  it('strategy accessors return correct strategy objects', () => {
    expect(controller.getCyclicStrategy()).toBe(cyclic);
    expect(controller.getNeuralStrategy()).toBe(neural);
  });

  it('persists checkpoint and history to storage', async () => {
    const adapter = new InMemoryStorageAdapter();
    const store = new EvoStorage(adapter);
    const ctrl = new EvoModeController(
      cyclic as unknown as CyclicExecutionStrategy,
      neural as unknown as NeuralExecutionStrategy,
      'CYCLIC',
      eventBus,
      store,
    );

    await ctrl.flipTo('NEURAL', 'persistence test');

    // Check that rows were saved (checkpoint + history)
    const checkpointRows = await adapter.queryRows('eil_mode_checkpoints', {});
    expect(checkpointRows.length).toBe(1);
    expect((checkpointRows[0] as any).from).toBe('CYCLIC');

    const historyRows = await adapter.queryRows('eil_switch_history', {});
    expect(historyRows.length).toBe(1);
    expect((historyRows[0] as any).to).toBe('NEURAL');
  });
});

// ─── Countdown ────────────────────────────────────────────────────────────────

describe('EvoModeController — flipToWithCountdown', () => {
  it('emits pending event then switches after countdown', async () => {
    const cyclic = createMockStrategy('CYCLIC');
    const neural = createMockStrategy('NEURAL');
    const eventBus = new EvoEventBus();
    const storage = new EvoStorage(new InMemoryStorageAdapter());
    const controller = new EvoModeController(
      cyclic as unknown as CyclicExecutionStrategy,
      neural as unknown as NeuralExecutionStrategy,
      'CYCLIC',
      eventBus,
      storage,
    );

    const events: string[] = [];
    eventBus.on('evolution:cycle:start', (data) => {
      const id = (data as any)?.cycleId ?? '';
      events.push(id);
    });

    const start = Date.now();
    const result = await controller.flipToWithCountdown('NEURAL', 'countdown test', 50);
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(40); // countdown of 50ms
    // Should have pending event + switch event
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0]).toContain('pending');
  });

  it('with 0ms countdown, behaves like normal flipTo', async () => {
    const cyclic = createMockStrategy('CYCLIC');
    const neural = createMockStrategy('NEURAL');
    const eventBus = new EvoEventBus();
    const storage = new EvoStorage(new InMemoryStorageAdapter());
    const controller = new EvoModeController(
      cyclic as unknown as CyclicExecutionStrategy,
      neural as unknown as NeuralExecutionStrategy,
      'CYCLIC',
      eventBus,
      storage,
    );

    const result = await controller.flipToWithCountdown('NEURAL', 'instant', 0);
    expect(result.success).toBe(true);
    expect(controller.currentMode).toBe('NEURAL');
  });
});
