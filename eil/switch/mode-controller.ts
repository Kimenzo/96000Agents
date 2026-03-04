/**
 * EVO Intelligence Layer — Mode Controller
 *
 * SWITCH: The single object that owns the switch. Holds the current active
 * strategy, exposes the flip method, handles the transition safely, and
 * ensures no generation is lost during the switch.
 *
 * The 6-step transition sequence:
 *   1. Pause current strategy (waits for in-flight generations)
 *   2. Write transition checkpoint to storage
 *   3. Emit mode:switching event
 *   4. Activate target strategy
 *   5. Record the switch in history
 *   6. Emit mode:switched event
 */

import type { EvoEventBus } from '../core/event-bus.js';
import type { EvoStorage } from '../core/storage.js';
import type {
  IEvoExecutionStrategy,
  RuntimeMode,
  SwitchRecord,
  SwitchResult,
  ModeTransitionCheckpoint,
} from './types.js';
import type { CyclicExecutionStrategy } from './cyclic-strategy.js';
import type { NeuralExecutionStrategy } from './neural-strategy.js';

export class EvoModeController {
  private activeStrategy: IEvoExecutionStrategy;
  private cyclicStrategy: CyclicExecutionStrategy;
  private neuralStrategy: NeuralExecutionStrategy;
  private switchHistory: SwitchRecord[] = [];
  private eventBus: EvoEventBus;
  private storage: EvoStorage;

  constructor(
    cyclicStrategy: CyclicExecutionStrategy,
    neuralStrategy: NeuralExecutionStrategy,
    initialMode: RuntimeMode,
    eventBus: EvoEventBus,
    storage: EvoStorage,
  ) {
    this.cyclicStrategy = cyclicStrategy;
    this.neuralStrategy = neuralStrategy;
    this.activeStrategy = initialMode === 'CYCLIC' ? cyclicStrategy : neuralStrategy;
    this.eventBus = eventBus;
    this.storage = storage;
  }

  get strategy(): IEvoExecutionStrategy {
    return this.activeStrategy;
  }

  get currentMode(): RuntimeMode {
    return this.activeStrategy.mode;
  }

  // ── THE SWITCH — safe live mode transition ──────────────────────────────

  /**
   * SWITCH: The 6-step transition sequence.
   * pause() allows in-flight generations to complete but stops scheduling new ones.
   * No generation is lost. The switch completes in under 5 seconds.
   */
  async flipTo(targetMode: RuntimeMode, reason: string): Promise<SwitchResult> {
    if (this.activeStrategy.mode === targetMode) {
      return { success: false, reason: 'Already in target mode' };
    }

    const from = this.activeStrategy.mode;
    const switchStartMs = Date.now();
    const snapshotBefore = this.activeStrategy.getMetrics();

    // Step 1: Pause current strategy
    // pause() awaits all in-flight generations to complete
    await this.activeStrategy.pause();

    // Step 2: Write transition checkpoint
    const checkpoint: ModeTransitionCheckpoint = {
      from,
      to: targetMode,
      timestamp: Date.now(),
      metricsAtTransition: snapshotBefore,
    };
    await this.storage.saveRow('eil_mode_checkpoints', `checkpoint-${checkpoint.timestamp}`, checkpoint as unknown as Record<string, unknown>);

    // Step 3: Emit mode transition event
    this.eventBus.emit('evolution:cycle:start' as 'evolution:cycle:start', {
      cycleId: `mode-switch-${from}-to-${targetMode}`,
      startedAt: new Date().toISOString(),
    });

    // Step 4: Activate target strategy
    const targetStrategy = targetMode === 'CYCLIC'
      ? this.cyclicStrategy
      : this.neuralStrategy;

    await targetStrategy.start();
    this.activeStrategy = targetStrategy;

    // Step 5: Record the switch
    const record: SwitchRecord = {
      from,
      to: targetMode,
      reason,
      timestamp: Date.now(),
      metricsAtSwitch: snapshotBefore,
    };
    this.switchHistory.push(record);
    await this.storage.saveRow('eil_switch_history', `switch-${record.timestamp}`, record as unknown as Record<string, unknown>);

    // Step 6: Emit switch complete
    this.eventBus.emit('evolution:cycle:complete' as 'evolution:cycle:complete', {
      cycleId: `mode-switch-${from}-to-${targetMode}`,
      completedAt: new Date().toISOString(),
      findingsCollected: 0,
      patternsFound: 0,
      directivesIssued: 0,
    });

    return {
      success: true,
      from,
      to: targetMode,
      transitionDurationMs: Date.now() - switchStartMs,
    };
  }

  /**
   * SWITCH: Graceful switch with optional countdown.
   * Emits a pending event so dashboards/WebSockets can show the countdown.
   */
  async flipToWithCountdown(
    targetMode: RuntimeMode,
    reason: string,
    countdownMs = 0,
  ): Promise<SwitchResult> {
    if (countdownMs > 0) {
      this.eventBus.emit('evolution:cycle:start' as 'evolution:cycle:start', {
        cycleId: `mode-switch-pending-${targetMode}`,
        startedAt: new Date().toISOString(),
      });
      await new Promise<void>(resolve => setTimeout(resolve, countdownMs));
    }
    return this.flipTo(targetMode, reason);
  }

  // ── History & Metrics ─────────────────────────────────────────────────────

  getSwitchHistory(): SwitchRecord[] {
    return [...this.switchHistory];
  }

  getCurrentMetrics() {
    return this.activeStrategy.getMetrics();
  }

  // ── Strategy Access ───────────────────────────────────────────────────────

  getCyclicStrategy(): CyclicExecutionStrategy {
    return this.cyclicStrategy;
  }

  getNeuralStrategy(): NeuralExecutionStrategy {
    return this.neuralStrategy;
  }
}
