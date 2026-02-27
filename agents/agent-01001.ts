import { Agent } from '@mastra/core/agent';

export const agent1001 = new Agent({
  id: 'agent-1001',
  name: 'Agent 1001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
