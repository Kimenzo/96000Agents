/**
 * AI Bible — Bible Layer
 * //BIBLE: The top-level coordinator. Injected into every EvoAgentHarness.
 * One BibleLayer instance governs all 96,000 agents.
 * processOutput() is called before any finding reaches the event bus.
 */

import type { EvoAgentMeta } from '../core/types.js';
import type { EvoStorage } from '../core/storage.js';
import type {
  BibleEnforcerConfig,
  BibleLayerResult,
} from './types.js';
import { BibleEnforcer, type EnforcerHarnessRef } from './bible-enforcer.js';
import { ProbationManager } from './probation-manager.js';

export class BibleLayer {
  private config: BibleEnforcerConfig;
  private enforcer: BibleEnforcer;
  readonly probationManager: ProbationManager;
  private storage: EvoStorage;

  constructor(
    config: BibleEnforcerConfig,
    enforcer: BibleEnforcer,
    probationManager: ProbationManager,
    storage: EvoStorage,
  ) {
    this.config = config;
    this.enforcer = enforcer;
    this.probationManager = probationManager;
    this.storage = storage;
  }

  /**
   * //BIBLE: The Moment of Witness and Consequence in one call.
   * Clean outputs pass through instantly. Violations trigger the full protocol.
   */
  async processOutput(
    agentId: string,
    output: string,
    meta: EvoAgentMeta,
    harness: EnforcerHarnessRef,
  ): Promise<BibleLayerResult> {
    // Complete bypass when disabled
    if (!this.config.enabled) {
      return { passed: true, output };
    }

    // Suspended agents do not generate
    if (this.probationManager.isSuspended(agentId)) {
      return { passed: false, quarantined: true };
    }

    const result = await this.enforcer.evaluate(agentId, output, meta);

    if (!result.violated) {
      return { passed: true, output };
    }

    // ── Violation Detected — begin the Seven Stages ─────────────────────

    // Check for LAW_10 violation → SUSPENDED (not PROBATIONARY)
    const hasLaw10 = result.violations.some(v => v.lawId === 'LAW_10');
    if (hasLaw10) {
      this.probationManager.suspend(agentId);
      const record = await this.enforcer.triggerSelfDestruct(agentId, result.violations, harness);
      return { passed: false, quarantined: true, violationRecord: record };
    }

    // Stage 1-2: Detection + Notification (detection already happened above)
    // Stage 3-5: Archive + Confession + Self-Destruct
    const record = await this.enforcer.triggerSelfDestruct(agentId, result.violations, harness);

    // Stage 6: Submit for approval and enter probation
    await this.enforcer.submitForApproval(agentId, record);
    this.probationManager.enterProbation(agentId, meta.clusterId);

    return { passed: false, quarantined: true, violationRecord: record };
  }

  /**
   * //BIBLE: Probationary output routing — goes to supervisor review queue, not event bus.
   * Each reviewed output brings the agent closer to restoration.
   */
  async processOutput_Probationary(
    agentId: string,
    output: string,
    supervisorId: string,
  ): Promise<{ eligible: boolean }> {
    this.probationManager.recordReviewedOutput(agentId);

    const eligible = this.probationManager.checkApprovalEligibility(agentId);
    if (eligible) {
      this.probationManager.approve(agentId);
    }

    return { eligible };
  }

  get enabled(): boolean {
    return this.config.enabled;
  }
}
