import { Agent } from '@mastra/core/agent';

export const agent1500 = new Agent({
  id: 'agent-1500',
  name: 'Agent 1500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
