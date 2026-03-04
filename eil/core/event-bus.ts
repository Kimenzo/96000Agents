/**
 * EVO Intelligence Layer — Event Bus
 *
 * The spinal cord of the EIL. Every layer communicates exclusively through
 * typed events on this bus — never by direct method calls across layers.
 *
 * EVO: Three guarantees — decoupling (layers don't know each other),
 * observability (every event is logged), and backpressure (events can
 * be buffered during high-load cycles to prevent cascade failures).
 */

import { EventEmitter } from 'node:events';
import type {
  Finding,
  ScoredFinding,
  ResearchDirective,
  ClusterSummary,
  CrossColonyPattern,
} from './types.js';

// ─── Event Map ────────────────────────────────────────────────────────────────

export interface EvoEventMap {
  'finding:local': Finding;
  'finding:cluster': ScoredFinding;
  'finding:colony': ScoredFinding;
  'finding:global': ScoredFinding;
  'directive:issued': ResearchDirective;
  'directive:received': ResearchDirective;
  'cluster:summary': ClusterSummary;
  'colony:pattern': CrossColonyPattern;
  'evolution:cycle:start': { cycleId: string; startedAt: string };
  'evolution:cycle:complete': {
    cycleId: string;
    completedAt: string;
    findingsCollected: number;
    patternsFound: number;
    directivesIssued: number;
  };
  'topology:mutated': {
    mutationType: string;
    applied: boolean;
    fitnessEstimate: number;
  };
}

export type EvoEventName = keyof EvoEventMap;

// ─── Typed Listener ───────────────────────────────────────────────────────────

type EvoListener<T extends EvoEventName> = (payload: EvoEventMap[T]) => void;

// ─── Bus Implementation ───────────────────────────────────────────────────────

export class EvoEventBus {
  private emitter: EventEmitter;
  /** EVO: Pending events buffer — used for backpressure when the bus is paused. */
  private buffer: Array<{ event: EvoEventName; payload: unknown }> = [];
  private paused = false;
  /** Audit log — most recent N events for observability. */
  private auditLog: Array<{ event: EvoEventName; payload: unknown; timestamp: string }> = [];
  private maxAuditSize: number;

  constructor(maxAuditSize = 10_000) {
    this.emitter = new EventEmitter();
    // EVO: 96 clusters + 3 meta-agents + optimizers — plenty of concurrent listeners
    this.emitter.setMaxListeners(200);
    this.maxAuditSize = maxAuditSize;
  }

  // ── Publishing ────────────────────────────────────────────────────────────

  emit<T extends EvoEventName>(event: T, payload: EvoEventMap[T]): void {
    const entry = { event, payload, timestamp: new Date().toISOString() };
    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditSize) {
      this.auditLog.shift();
    }

    if (this.paused) {
      // EVO: Backpressure — queue events while the bus is paused
      this.buffer.push({ event, payload });
      return;
    }

    this.emitter.emit(event, payload);
  }

  // ── Convenience publishers ────────────────────────────────────────────────

  publishFinding(finding: Finding): void {
    const eventName = `finding:${finding.propagationLevel.toLowerCase()}` as EvoEventName;
    this.emit(eventName, finding as EvoEventMap[typeof eventName]);
  }

  publishDirective(directive: ResearchDirective): void {
    this.emit('directive:issued', directive);
  }

  // ── Subscribing ───────────────────────────────────────────────────────────

  on<T extends EvoEventName>(event: T, listener: EvoListener<T>): void {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
  }

  once<T extends EvoEventName>(event: T, listener: EvoListener<T>): void {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
  }

  off<T extends EvoEventName>(event: T, listener: EvoListener<T>): void {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
  }

  // ── Convenience subscribers ───────────────────────────────────────────────

  subscribeToFindings(
    level: 'local' | 'cluster' | 'colony' | 'global',
    listener: (finding: Finding | ScoredFinding) => void,
  ): void {
    this.on(`finding:${level}` as EvoEventName, listener as EvoListener<EvoEventName>);
  }

  subscribeToDirectives(listener: (directive: ResearchDirective) => void): void {
    this.on('directive:issued', listener);
  }

  // ── Backpressure Controls ─────────────────────────────────────────────────

  /** Pause event emission — events are buffered until resume(). */
  pause(): void {
    this.paused = true;
  }

  /** Resume event emission and flush the buffer in order. */
  resume(): void {
    this.paused = false;
    const queued = [...this.buffer];
    this.buffer = [];
    for (const { event, payload } of queued) {
      this.emitter.emit(event, payload);
    }
  }

  get isPaused(): boolean {
    return this.paused;
  }

  // ── Observability ─────────────────────────────────────────────────────────

  getRecentEvents(count = 50): Array<{ event: EvoEventName; payload: unknown; timestamp: string }> {
    return this.auditLog.slice(-count);
  }

  /** Returns counts of each event type in the audit log. */
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of this.auditLog) {
      counts[entry.event] = (counts[entry.event] ?? 0) + 1;
    }
    return counts;
  }

  /** Total number of events recorded in the audit log. */
  get auditLogSize(): number {
    return this.auditLog.length;
  }

  /** Clears the audit log. Useful in tests. */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /** Removes all listeners and clears state. */
  destroy(): void {
    this.emitter.removeAllListeners();
    this.buffer = [];
    this.auditLog = [];
  }
}
