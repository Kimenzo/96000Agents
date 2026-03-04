/**
 * ============================================================================
 * PRODUCTION-GRADE SHARED AGENT INFRASTRUCTURE
 * ============================================================================
 *
 * This module provides enterprise-grade, battle-tested configuration shared
 * across all 96,000 agents. Every component is designed for:
 *
 *   - Reliability: Multi-model fallback chains with automatic retries
 *   - Safety: Input/output guardrails, content filtering, bounded execution
 *   - Observability: Full tracing, real scoring, performance monitoring
 *   - Intelligence: Semantic recall, working memory, observational memory
 *   - Scalability: Efficient resource usage, configurable per-agent overrides
 *
 * Architecture inspired by production systems at OpenAI, Anthropic, and Google.
 * ============================================================================
 */

export { createProductionMemory } from './memory';
export { createProductionScorers } from './scorers';
export { productionModelChain, getAgentTier } from './models';
export { buildProductionInstructions } from './instructions';
export { safetyInputProcessor, safetyOutputProcessor } from './processors';
export { PRODUCTION_DEFAULTS } from './defaults';
export type { AgentTier, AgentIdentity } from './types';
