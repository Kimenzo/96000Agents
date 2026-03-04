/**
 * ============================================================================
 * PRODUCTION MODEL CONFIGURATION
 * ============================================================================
 *
 * Multi-model fallback chain with automatic retries.
 *
 * Strategy: If the primary model fails (rate limit, outage, timeout),
 * automatically fall through to the next model in the chain.
 * This is how production systems achieve 99.99% uptime.
 *
 * Tier system:
 *   - Standard (agents 1-64000):     Fast + cost-efficient models
 *   - Advanced (agents 64001-90000): Balanced performance models
 *   - Elite (agents 90001-96000):    Maximum capability models
 * ============================================================================
 */

import type { AgentTier } from './types';

/**
 * Returns a multi-model fallback chain based on agent tier.
 *
 * Each model in the chain is tried in order. If one fails, the next is used.
 * `maxRetries` controls per-model retry attempts before falling through.
 */
export function productionModelChain(tier: AgentTier) {
  switch (tier) {
    case 'elite':
      return [
        { model: 'anthropic/claude-sonnet-4-20250514' as const, maxRetries: 2 },
        { model: 'openai/gpt-4o' as const, maxRetries: 2 },
        { model: 'google/gemini-2.5-flash' as const, maxRetries: 1 },
      ];
    case 'advanced':
      return [
        { model: 'openai/gpt-4o' as const, maxRetries: 2 },
        { model: 'google/gemini-2.5-flash' as const, maxRetries: 2 },
        { model: 'anthropic/claude-sonnet-4-20250514' as const, maxRetries: 1 },
      ];
    case 'standard':
    default:
      return [
        { model: 'google/gemini-2.5-flash' as const, maxRetries: 2 },
        { model: 'openai/gpt-4o-mini' as const, maxRetries: 2 },
        { model: 'anthropic/claude-sonnet-4-20250514' as const, maxRetries: 1 },
      ];
  }
}

/**
 * Determines agent tier based on agent number.
 * Higher-numbered agents get more powerful models.
 */
export function getAgentTier(agentNumber: number): AgentTier {
  if (agentNumber > 90000) return 'elite';
  if (agentNumber > 64000) return 'advanced';
  return 'standard';
}
