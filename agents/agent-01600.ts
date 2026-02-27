import { Agent } from '@mastra/core/agent';

export const agent1600 = new Agent({
  id: 'agent-1600',
  name: 'Agent 1600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
