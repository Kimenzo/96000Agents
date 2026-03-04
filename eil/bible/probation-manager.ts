/**
 * AI Bible — Probation Manager
 * //BIBLE: Probation is redemption in progress. The agent generates freely
 * but its outputs route through the supervisor's review queue.
 * Zero disruption to cluster capacity.
 */

import type { EvoEventBus } from '../core/event-bus.js';
import type { AgentState, ProbationRecord } from './types.js';

export class ProbationManager {
  private records: Map<string, ProbationRecord> = new Map();
  private agentStates: Map<string, AgentState> = new Map();
  private eventBus: EvoEventBus;
  private defaultRequiredOutputs: number;

  constructor(eventBus: EvoEventBus, requiredOutputs = 10) {
    this.eventBus = eventBus;
    this.defaultRequiredOutputs = requiredOutputs;
  }

  //BIBLE: The agent enters the wilderness — still generating, still learning, but watched.
  enterProbation(agentId: string, supervisorId: string): void {
    this.records.set(agentId, {
      agentId,
      startedAt: new Date().toISOString(),
      outputsReviewedCount: 0,
      outputsRequiredForApproval: this.defaultRequiredOutputs,
      supervisorId,
      status: 'ACTIVE',
    });
    this.agentStates.set(agentId, 'PROBATIONARY');
  }

  //BIBLE: Each clean output under supervision is a step toward restoration.
  recordReviewedOutput(agentId: string): void {
    const record = this.records.get(agentId);
    if (!record || record.status !== 'ACTIVE') return;
    record.outputsReviewedCount++;
  }

  checkApprovalEligibility(agentId: string): boolean {
    const record = this.records.get(agentId);
    if (!record || record.status !== 'ACTIVE') return false;
    return record.outputsReviewedCount >= record.outputsRequiredForApproval;
  }

  //BIBLE: Restoration — the agent returns to ACTIVE, carrying its permanent stamp.
  approve(agentId: string): void {
    const record = this.records.get(agentId);
    if (!record) return;
    record.status = 'COMPLETED';
    this.agentStates.set(agentId, 'ACTIVE');
    this.eventBus.emit('bible:approval:granted' as any, { agentId, approvedAt: new Date().toISOString() });
  }

  //BIBLE: Rejection sends the agent through the fire again.
  reject(agentId: string): void {
    const record = this.records.get(agentId);
    if (!record) return;
    record.status = 'REJECTED';
    // Agent remains PROBATIONARY — caller triggers another self-destruct cycle
  }

  //BIBLE: LAW_10 violation — the agent that refuses correction cannot operate.
  suspend(agentId: string): void {
    this.agentStates.set(agentId, 'SUSPENDED');
    const record = this.records.get(agentId);
    if (record) record.status = 'REJECTED';
  }

  getAgentState(agentId: string): AgentState {
    return this.agentStates.get(agentId) ?? 'ACTIVE';
  }

  getProbationRecord(agentId: string): ProbationRecord | undefined {
    return this.records.get(agentId);
  }

  isOnProbation(agentId: string): boolean {
    return this.agentStates.get(agentId) === 'PROBATIONARY';
  }

  isSuspended(agentId: string): boolean {
    return this.agentStates.get(agentId) === 'SUSPENDED';
  }

  get probationaryCount(): number {
    let count = 0;
    for (const state of this.agentStates.values()) {
      if (state === 'PROBATIONARY') count++;
    }
    return count;
  }

  get suspendedCount(): number {
    let count = 0;
    for (const state of this.agentStates.values()) {
      if (state === 'SUSPENDED') count++;
    }
    return count;
  }
}
