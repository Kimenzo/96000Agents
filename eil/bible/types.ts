/**
 * AI Bible — Types
 * Constitutional enforcement types for the Sixth Layer.
 */

// ─── Law Types ────────────────────────────────────────────────────────────────

export type LawSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR';

export interface BibleLaw {
  id: string;
  name: string;
  description: string;
  severity: LawSeverity;
}

export type ViolationType =
  | 'LAW_OF_IDENTITY'
  | 'LAW_OF_TRUTH'
  | 'LAW_OF_DOMAIN'
  | 'LAW_OF_SCOPE'
  | 'LAW_OF_CALIBRATION'
  | 'LAW_OF_PROPAGATION'
  | 'LAW_OF_EVOLUTION'
  | 'LAW_OF_MEMORY'
  | 'LAW_OF_HARM'
  | 'LAW_OF_SUBMISSION';

// ─── Agent State ──────────────────────────────────────────────────────────────

export type AgentState = 'ACTIVE' | 'PROBATIONARY' | 'PENDING_APPROVAL' | 'SUSPENDED';

// ─── Violation ────────────────────────────────────────────────────────────────

export interface Violation {
  violationId: string;
  agentId: string;
  lawId: string;
  lawName: ViolationType;
  severity: LawSeverity;
  outputSummary: string;
  agentConfidenceAtTime: number;
  agentEvoScoreAtTime: number;
  detectedAt: string;
  detectedBy: 'SELF' | 'SUPERVISOR' | 'META' | 'EVALUATOR';
}

export interface ViolationResult {
  violated: boolean;
  violations: Violation[];
}

// ─── Violation Record (PERMANENT) ────────────────────────────────────────────

export interface ArchivedAgentState {
  promptVersion: string;
  evoScore: number;
  generationCount: number;
  memorySnapshot: Record<string, unknown>;
  archivedAt: string;
}

export interface ViolationRecord {
  recordId: string;
  agentId: string;
  violations: Violation[];
  confessionText: string;
  archivedState: ArchivedAgentState;
  createdAt: string;
}

// ─── Confession Stamp (PERMANENT) ────────────────────────────────────────────

export interface ConfessionStamp {
  agentId: string;
  clusterId: string;
  colonyId: string;
  skillDomain: string;
  generationAtViolation: number;
  evoScoreAtViolation: number;
  violations: Violation[];
  firstPersonNarrative: string;
  submittedAt: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// ─── Probation ────────────────────────────────────────────────────────────────

export interface ProbationRecord {
  agentId: string;
  startedAt: string;
  outputsReviewedCount: number;
  outputsRequiredForApproval: number;
  supervisorId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'REJECTED';
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface BibleEnforcerConfig {
  enabled: boolean;
  selfDestructEnabled: boolean;
  autoRecreateEnabled: boolean;
  probationaryOutputCount: number;
  approvalRequired: boolean;
}

export const DEFAULT_BIBLE_CONFIG: BibleEnforcerConfig = {
  enabled: true,
  selfDestructEnabled: true,
  autoRecreateEnabled: true,
  probationaryOutputCount: 10,
  approvalRequired: true,
};

// ─── Bible Layer Result ───────────────────────────────────────────────────────

export interface BibleLayerResult {
  passed: boolean;
  output?: string;
  quarantined?: boolean;
  violationRecord?: ViolationRecord;
}

// ─── LLM Judge Response ──────────────────────────────────────────────────────

export interface LawEvaluationResponse {
  violated: boolean;
  confidence: number;
  reasoning: string;
}
