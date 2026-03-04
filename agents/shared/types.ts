/**
 * Agent tier type definitions.
 * Tiers allow scaling model quality across the 96K agent fleet.
 */
export type AgentTier = 'standard' | 'advanced' | 'elite';

export interface AgentIdentity {
  id: string;
  name: string;
  number: number;
  tier: AgentTier;
  description: string;
}
