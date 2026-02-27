import { Agent } from '@mastra/core/agent';

export const agent1800 = new Agent({
  id: 'agent-1800',
  name: 'Agent 1800',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
