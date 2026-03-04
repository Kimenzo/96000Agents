/**
 * EVO Intelligence Layer — Storage
 *
 * Wraps Mastra's storage adapters to provide EIL-specific tables and
 * persistence methods. Every evolutionary artefact — findings, directives,
 * scores, prompt versions, topology snapshots — flows through here.
 *
 * EVO: Uses the EvoStorageAdapter interface so that the backing store
 * can be swapped (Postgres, LibSQL, in-memory) without touching any
 * other EIL code.
 */

import type {
  EvoStorageAdapter,
  Finding,
  ScoredFinding,
  ResearchDirective,
  WorkflowTopologySnapshot,
  BenchmarkTask,
  BenchmarkResult,
} from './types.js';

// ─── Table Names ──────────────────────────────────────────────────────────────

const TABLES = {
  FINDINGS: 'evo_findings',
  DIRECTIVES: 'evo_directives',
  AGENT_SCORES: 'evo_agent_scores',
  PROMPT_VERSIONS: 'evo_prompt_versions',
  TOPOLOGY_SNAPSHOTS: 'evo_topology_snapshots',
  BENCHMARK_TASKS: 'evo_benchmark_tasks',
} as const;

// ─── Score Record ─────────────────────────────────────────────────────────────

export interface AgentScoreRecord {
  agentId: string;
  cycleId: string;
  relevance: number;
  novelty: number;
  coherence: number;
  composite: number;
  timestamp: string;
}

// ─── Prompt Version Record ────────────────────────────────────────────────────

export interface PromptVersionRecord {
  agentId: string;
  version: number;
  prompt: string;
  scoreBefore: number;
  scoreAfter: number;
  committedAt: string;
}

// ─── EvoStorage ───────────────────────────────────────────────────────────────

export class EvoStorage {
  private adapter: EvoStorageAdapter;

  constructor(adapter: EvoStorageAdapter) {
    this.adapter = adapter;
  }

  // ── Findings ──────────────────────────────────────────────────────────────

  async saveFinding(finding: Finding | ScoredFinding): Promise<void> {
    await this.adapter.saveRow(TABLES.FINDINGS, finding.findingId, finding as Record<string, unknown>);
  }

  async getFinding(findingId: string): Promise<Finding | null> {
    const row = await this.adapter.getRow(TABLES.FINDINGS, findingId);
    return row ? (row as unknown as Finding) : null;
  }

  async getRecentFindings(limit = 100): Promise<Finding[]> {
    const rows = await this.adapter.queryRows(TABLES.FINDINGS, {}, limit);
    return rows as unknown as Finding[];
  }

  async getFindingsByAgent(agentId: string, limit = 50): Promise<Finding[]> {
    const rows = await this.adapter.queryRows(TABLES.FINDINGS, { agentId }, limit);
    return rows as unknown as Finding[];
  }

  async getFindingsByCluster(clusterId: string, limit = 200): Promise<Finding[]> {
    // EVO: Cluster-level queries need a broader scan; the storage adapter
    // should handle this efficiently via an index on the domain tag or
    // agent-to-cluster mapping.
    const rows = await this.adapter.queryRows(TABLES.FINDINGS, { clusterId }, limit);
    return rows as unknown as Finding[];
  }

  // ── Directives ────────────────────────────────────────────────────────────

  async saveDirective(directive: ResearchDirective): Promise<void> {
    await this.adapter.saveRow(TABLES.DIRECTIVES, directive.directiveId, directive as unknown as Record<string, unknown>);
  }

  async getActiveDirectives(): Promise<ResearchDirective[]> {
    const rows = await this.adapter.queryRows(TABLES.DIRECTIVES, {}, 100);
    return rows as unknown as ResearchDirective[];
  }

  // ── Agent Scores ──────────────────────────────────────────────────────────

  async getAgentScoreHistory(agentId: string, limit = 20): Promise<AgentScoreRecord[]> {
    const rows = await this.adapter.queryRows(TABLES.AGENT_SCORES, { agentId }, limit);
    return rows as unknown as AgentScoreRecord[];
  }

  async getTopAgentsByColony(colonyId: string, limit = 10): Promise<AgentScoreRecord[]> {
    // EVO: Returns agents with the highest composite scores in a colony.
    // The adapter should ideally support ORDER BY composite DESC.
    const rows = await this.adapter.queryRows(TABLES.AGENT_SCORES, { colonyId }, limit);
    const typed = rows as unknown as AgentScoreRecord[];
    return typed.sort((a, b) => b.composite - a.composite).slice(0, limit);
  }

  // ── Prompt Versions ───────────────────────────────────────────────────────

  async getPromptHistory(agentId: string): Promise<PromptVersionRecord[]> {
    const rows = await this.adapter.queryRows(TABLES.PROMPT_VERSIONS, { agentId }, 50);
    return (rows as unknown as PromptVersionRecord[]).sort((a, b) => a.version - b.version);
  }

  async getLatestPrompt(agentId: string): Promise<PromptVersionRecord | null> {
    const history = await this.getPromptHistory(agentId);
    return history.length > 0 ? history[history.length - 1]! : null;
  }

  // ── Topology Snapshots ────────────────────────────────────────────────────

  async getTopologyHistory(clusterId: string, limit = 10): Promise<WorkflowTopologySnapshot[]> {
    const rows = await this.adapter.queryRows(TABLES.TOPOLOGY_SNAPSHOTS, { clusterId }, limit);
    return rows as unknown as WorkflowTopologySnapshot[];
  }

  async getLatestTopology(clusterId: string): Promise<WorkflowTopologySnapshot | null> {
    const history = await this.getTopologyHistory(clusterId, 1);
    return history.length > 0 ? history[0]! : null;
  }

  // ── Benchmark Tasks ───────────────────────────────────────────────────────

  async saveBenchmarkTask(task: BenchmarkTask): Promise<void> {
    await this.adapter.saveRow(TABLES.BENCHMARK_TASKS, task.taskId, task as unknown as Record<string, unknown>);
  }

  async getBenchmarkTasksByDomain(domain: string, limit = 50): Promise<BenchmarkTask[]> {
    const rows = await this.adapter.queryRows(TABLES.BENCHMARK_TASKS, { domain }, limit);
    return rows as unknown as BenchmarkTask[];
  }

  // ── Additional Methods (used by evolution cycle, optimizers, benchmarks) ──

  /**
   * Get scored findings for a specific agent, optionally filtered by timestamp cutoff.
   */
  async getFindingsForAgent(agentId: string, cutoff?: string): Promise<ScoredFinding[]> {
    const rows = await this.adapter.queryRows(TABLES.FINDINGS, { agentId }, 200);
    let findings = rows as unknown as ScoredFinding[];
    if (cutoff) {
      findings = findings.filter(f => f.timestamp >= cutoff);
    }
    return findings;
  }

  /**
   * Save a simple agent score (by agentId and score value).
   */
  async saveAgentScore(agentId: string, score: number): Promise<void>;
  async saveAgentScore(record: AgentScoreRecord): Promise<void>;
  async saveAgentScore(agentIdOrRecord: string | AgentScoreRecord, score?: number): Promise<void> {
    if (typeof agentIdOrRecord === 'string') {
      const id = `${agentIdOrRecord}-${Date.now()}`;
      await this.adapter.saveRow(TABLES.AGENT_SCORES, id, {
        agentId: agentIdOrRecord,
        composite: score ?? 0,
        timestamp: new Date().toISOString(),
      });
    } else {
      const id = `${agentIdOrRecord.agentId}-${agentIdOrRecord.cycleId}`;
      await this.adapter.saveRow(TABLES.AGENT_SCORES, id, agentIdOrRecord as unknown as Record<string, unknown>);
    }
  }

  /**
   * Get the latest prompt version record for an agent.
   */
  async getLatestPromptVersion(agentId: string): Promise<PromptVersionRecord | null> {
    return this.getLatestPrompt(agentId);
  }

  /**
   * Save a prompt version with flexible input format.
   */
  async savePromptVersion(record: PromptVersionRecord): Promise<void>;
  async savePromptVersion(agentId: string, record: Omit<PromptVersionRecord, 'agentId'> & Record<string, unknown>): Promise<void>;
  async savePromptVersion(
    recordOrId: PromptVersionRecord | string,
    extraRecord?: Omit<PromptVersionRecord, 'agentId'> & Record<string, unknown>,
  ): Promise<void> {
    if (typeof recordOrId === 'string') {
      const full: PromptVersionRecord = {
        agentId: recordOrId,
        version: extraRecord?.version ?? 0,
        prompt: extraRecord?.prompt ?? '',
        scoreBefore: extraRecord?.scoreBefore ?? 0,
        scoreAfter: extraRecord?.score as number ?? extraRecord?.scoreAfter ?? 0,
        committedAt: extraRecord?.timestamp as string ?? new Date().toISOString(),
      };
      const id = `${full.agentId}-v${full.version}`;
      await this.adapter.saveRow(TABLES.PROMPT_VERSIONS, id, { ...full, ...extraRecord } as unknown as Record<string, unknown>);
    } else {
      const id = `${recordOrId.agentId}-v${recordOrId.version}`;
      await this.adapter.saveRow(TABLES.PROMPT_VERSIONS, id, recordOrId as unknown as Record<string, unknown>);
    }
  }

  /**
   * Save a topology snapshot.
   */
  async saveTopologySnapshot(snapshot: WorkflowTopologySnapshot): Promise<void> {
    await this.adapter.saveRow(TABLES.TOPOLOGY_SNAPSHOTS, snapshot.snapshotId, snapshot as unknown as Record<string, unknown>);
  }

  /**
   * Save a benchmark result for an agent.
   */
  async saveBenchmarkResult(agentId: string, result: BenchmarkResult): Promise<void> {
    const id = `${agentId}-bench-${Date.now()}`;
    await this.adapter.saveRow('evo_benchmark_results', id, result as unknown as Record<string, unknown>);
  }

  /**
   * Generic row save — used by Switch modules (mode-controller, mode-comparator)
   * to persist switch checkpoints, history records, and metrics samples.
   */
  async saveRow(table: string, id: string, data: Record<string, unknown>): Promise<void> {
    await this.adapter.saveRow(table, id, data);
  }
}

export class InMemoryStorageAdapter implements EvoStorageAdapter {
  private tables: Map<string, Map<string, Record<string, unknown>>> = new Map();

  private getTable(table: string): Map<string, Record<string, unknown>> {
    let t = this.tables.get(table);
    if (!t) {
      t = new Map();
      this.tables.set(table, t);
    }
    return t;
  }

  async saveRow(table: string, id: string, data: Record<string, unknown>): Promise<void> {
    this.getTable(table).set(id, { ...data, _id: id });
  }

  async getRow(table: string, id: string): Promise<Record<string, unknown> | null> {
    return this.getTable(table).get(id) ?? null;
  }

  async queryRows(table: string, filter: Record<string, unknown>, limit = 100): Promise<Record<string, unknown>[]> {
    const t = this.getTable(table);
    const results: Record<string, unknown>[] = [];
    const filterEntries = Object.entries(filter);

    for (const row of t.values()) {
      const match = filterEntries.every(([key, value]) => row[key] === value);
      if (match || filterEntries.length === 0) {
        results.push(row);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  async deleteRow(table: string, id: string): Promise<void> {
    this.getTable(table).delete(id);
  }

  /** Test helper: clear everything. */
  clear(): void {
    this.tables.clear();
  }
}
