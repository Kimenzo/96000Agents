import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createScorer } from '@mastra/core/evals';
import { MCPClient } from '@mastra/mcp';

// 1. Observational Memory
const agentMemory = new Memory();

// 2. Evaluator/Scorer
const customScorer = createScorer({
  id: 'CustomEval',
  description: 'Evaluates the agent response.',
}).generateScore(async () => {
  return 1; // Default pass
});

// 3. MCP Client
const mcp = new MCPClient({
  servers: {
    // Empty config for now, ready for actual server definitions
  }
});

// 4. Agent with Observability enabled
export const agent23093 = new Agent({
  id: 'agent-23093',
  name: 'Agent 23093',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
  memory: agentMemory,
  scorers: [customScorer],
  options: {
    tracingPolicy: 'all' // Enables full observability/telemetry
  }
});
