/**
 * ============================================================================
 * PRODUCTION DEFAULTS
 * ============================================================================
 *
 * Centralized default configuration values for all agents.
 * These can be overridden per-agent but provide sane, battle-tested defaults.
 * ============================================================================
 */

import type { AgentTier } from './types';

/**
 * Default execution parameters by tier.
 * These control how agents behave at runtime.
 */
export const PRODUCTION_DEFAULTS = {
  /** Maximum agentic loop steps before forced termination */
  maxSteps: {
    standard: 8,
    advanced: 12,
    elite: 20,
  } satisfies Record<AgentTier, number>,

  /** Model temperature settings by tier */
  temperature: {
    standard: 0.4,
    advanced: 0.5,
    elite: 0.6,
  } satisfies Record<AgentTier, number>,

  /** Maximum output tokens by tier */
  maxOutputTokens: {
    standard: 4096,
    advanced: 8192,
    elite: 16384,
  } satisfies Record<AgentTier, number>,

  /** Scorer sampling rate (ratio of calls that get scored) */
  scorerSamplingRate: {
    standard: 0.05,  // 5% of calls
    advanced: 0.1,   // 10% of calls
    elite: 0.2,      // 20% of calls
  } satisfies Record<AgentTier, number>,

  /** Abort timeout in milliseconds */
  abortTimeout: {
    standard: 30_000,
    advanced: 60_000,
    elite: 120_000,
  } satisfies Record<AgentTier, number>,
} as const;
