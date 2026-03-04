import { Agent } from '@mastra/core/agent';
import {
  createProductionMemory,
  createProductionScorers,
  productionModelChain,
  getAgentTier,
  buildProductionInstructions,
  PRODUCTION_DEFAULTS,
} from './shared';

// ============================================================================
// Agent 54363 — Tier: STANDARD
// ============================================================================

const AGENT_NUMBER = 54363;
const AGENT_ID = 'agent-54363';
const TIER = getAgentTier(AGENT_NUMBER);

// Production Memory: semantic recall + working memory + observational memory
const memory = createProductionMemory();

// Production Scorers: relevance, coherence, safety, completeness
const scorers = createProductionScorers(AGENT_ID);

// Production Model Chain: multi-model fallback with automatic retries
const modelChain = productionModelChain(TIER);

// Production Instructions: structured system prompt with safety guardrails
const instructions = buildProductionInstructions(AGENT_ID, AGENT_NUMBER, TIER);

export const agent54363 = new Agent({
  id: AGENT_ID,
  name: 'Agent 54363',
  description: 'Production-grade autonomous agent — efficient, reliable general-purpose AI with full observability and safety guardrails.',
  instructions,
  model: modelChain,
  memory,
  scorers,
  defaultOptions: {
    maxSteps: PRODUCTION_DEFAULTS.maxSteps[TIER],
    modelSettings: {
      temperature: PRODUCTION_DEFAULTS.temperature[TIER],
      maxOutputTokens: PRODUCTION_DEFAULTS.maxOutputTokens[TIER],
    },
    onError: ({ error }) => {
      console.error(`[${AGENT_ID}] Error:`, error);
    },
  },
  options: {
    tracingPolicy: 'all',
  },
});
