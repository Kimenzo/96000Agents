/**
 * EVO Intelligence Layer — Core Types
 *
 * All shared TypeScript interfaces, enums, and type definitions for the EIL.
 * Every other module in the EIL imports from this file.
 */

// ─── Finding Classification ───────────────────────────────────────────────────

/** EVO: Discovery types ranked by cross-domain impact potential. */
export type FindingType =
  | 'CONTRADICTION'
  | 'NOVEL_PATTERN'
  | 'CONFIRMED_HYPOTHESIS'
  | 'ANOMALY'
  | 'CROSS_DOMAIN_RESONANCE';

/** EVO: Propagation scope — determines how far a finding travels through the hierarchy. */
export type PropagationLevel = 'LOCAL' | 'CLUSTER' | 'COLONY' | 'GLOBAL';

// ─── Optimizer Types ──────────────────────────────────────────────────────────

export type OptimizerType =
  | 'PROMPT_MUTATION'
  | 'TOPOLOGY_SEARCH'
  | 'FEWSHOT_SELECTION'
  | 'HYBRID';

/** EVO: Tracks which optimizer is active for a given agent and why. */
export type OptimizationPhase =
  | 'TEXT_GRAD'
  | 'MIPRO'
  | 'AFLOW'
  | 'IDLE';

// ─── Agent Metadata ───────────────────────────────────────────────────────────

/** EVO: The metadata envelope that the EIL attaches to every agent.
 *  The base agent file is never modified — this lives in the registry. */
export interface EvoAgentMeta {
  agentId: string;
  clusterId: string;
  colonyId: string;
  skillDomain: string;
  skillDepth: number;
  evaluationScore: number;
  generationCount: number;
  lastEvolvedAt: string; // ISO-8601
  promptVersion: number;
}

// ─── Findings ─────────────────────────────────────────────────────────────────

export interface Finding {
  findingId: string;
  agentId: string;
  type: FindingType;
  content: string;
  confidenceScore: number;
  evidenceBase: string[];
  domainTag: string;
  timestamp: string; // ISO-8601
  propagationLevel: PropagationLevel;
}

export interface ScoredFinding extends Finding {
  relevanceScore: number;
  noveltyScore: number;
  coherenceScore: number;
  compositeScore: number;
}

// ─── Research Directives ──────────────────────────────────────────────────────

export interface ResearchDirective {
  directiveId: string;
  sourceColony: string;
  targetColonies: string[];
  conceptSpace: string;
  issuedAt: string; // ISO-8601
  priority: number; // 0–1, higher = more urgent
}

// ─── Configuration ────────────────────────────────────────────────────────────

export interface EvoConfig {
  /** Whether the EIL is active. When false, all 96k agents operate as standard Mastra agents. */
  enabled: boolean;
  /** Milliseconds between automatic evolution cycles. */
  cycleDurationMs: number;
  /** Minimum composite score for a finding to propagate. */
  findingThreshold: number;
  /** Maximum hops a finding can propagate through the hierarchy. */
  maxPropagationDepth: number;
  /** Number of agents per cluster. */
  clusterSize: number;
  /** Number of clusters per colony. */
  clustersPerColony: number;
  /** Which optimizer strategy to use by default. */
  optimizerType: OptimizerType;
  /** Path to the directory containing agent .ts files. */
  agentsDir: string;
  /** LLM model identifier for internal EIL reasoning (supervisors, meta-agents, optimizers). */
  internalModelId: string;
  /** LLM model identifier for heavyweight synthesis (meta-agents cross-colony). */
  synthesisModelId: string;
}

/** Sensible defaults — tuned for a 96,000-agent deployment. */
export const DEFAULT_EVO_CONFIG: EvoConfig = {
  enabled: true,
  cycleDurationMs: 30 * 60 * 1000, // 30 minutes
  findingThreshold: 0.55,
  maxPropagationDepth: 4,
  clusterSize: 1000,
  clustersPerColony: 32,
  optimizerType: 'HYBRID',
  agentsDir: './agents',
  internalModelId: 'openai/gpt-4o-mini',
  synthesisModelId: 'openai/gpt-4o',
};

// ─── Cluster & Colony Summaries ───────────────────────────────────────────────

export interface ClusterSummary {
  clusterId: string;
  colonyId: string;
  findingCount: number;
  topFindings: ScoredFinding[];
  averageScore: number;
  dominantDomains: string[];
  timestamp: string;
}

export interface CrossColonyPattern {
  patternId: string;
  sourceColonies: string[];
  description: string;
  confidence: number;
  relatedFindings: string[]; // findingIds
  suggestedDirective: string;
}

// ─── Optimization Results ─────────────────────────────────────────────────────

export interface OptimizationResult {
  agentId: string;
  previousPrompt: string;
  newPrompt: string;
  scoreBefore: number;
  scoreAfter: number;
  iterations: number;
  converged: boolean;
  optimizerUsed: OptimizationPhase;
  durationMs: number;
  promptVersion: number;
}

export interface OptimizationState {
  phase: OptimizationPhase;
  consecutiveStalls: number;
  lastScore: number;
  totalIterations: number;
}

// ─── Topology ─────────────────────────────────────────────────────────────────

export interface WorkflowTopologySnapshot {
  snapshotId: string;
  timestamp: string;
  clusterCount: number;
  colonyCount: number;
  clusterToAgents: Record<string, string[]>;
  colonyToClusters: Record<string, string[]>;
}

// ─── Benchmark ────────────────────────────────────────────────────────────────

export interface BenchmarkTask {
  taskId: string;
  input: string;
  expectedOutput?: string;
  evaluationCriteria?: string;
  domain?: string;
  difficulty?: number; // 0–1
}

export interface BenchmarkResult {
  agentId: string;
  taskCount: number;
  averageScore: number;
  minScore: number;
  maxScore: number;
  totalDurationMs: number;
  taskResults: Array<{ taskId: string; score: number; durationMs: number }>;
}

export interface ClusterBenchmarkResult {
  clusterId: string;
  agentCount: number;
  sampledCount: number;
  averageScore: number;
  medianScore: number;
  topPerformers: string[];
  bottomPerformers: string[];
  durationMs: number;
}

export interface TopologyComparisonResult {
  baselineSnapshotId: string;
  candidateSnapshotId: string;
  fitnessImprovement: number;
  clusterCountDelta: number;
  colonyCountDelta: number;
}

// ─── EIL Status ───────────────────────────────────────────────────────────────

export interface EILStatus {
  enabled: boolean;
  state: string;
  agentCount: number;
  clusterCount: number;
  colonyCount: number;
  supervisorCount: number;
  metaAgentCount: number;
  cycleCount: number;
  eventBusEventCount: number;
  optimizerActiveAgents: number;
}

// ─── LLM Abstraction ─────────────────────────────────────────────────────────

/**
 * EVO: Minimal LLM interface used throughout the EIL.
 * Implemented by a thin adapter over Mastra's model router so that
 * the EIL never instantiates LLM clients directly. Also enables
 * easy mocking in tests.
 */
export interface EvoLLM {
  generate(prompt: string, systemMessage?: string): Promise<string>;
}

// ─── Storage Abstraction ──────────────────────────────────────────────────────

/**
 * EVO: Minimal key-value/table storage interface.
 * Implemented by EvoStorage wrapping Mastra's storage adapters.
 */
export interface EvoStorageAdapter {
  saveRow(table: string, id: string, data: Record<string, unknown>): Promise<void>;
  getRow(table: string, id: string): Promise<Record<string, unknown> | null>;
  queryRows(table: string, filter: Record<string, unknown>, limit?: number): Promise<Record<string, unknown>[]>;
  deleteRow(table: string, id: string): Promise<void>;
}
