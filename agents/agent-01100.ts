import { Agent } from '@mastra/core/agent';

export const agent1100 = new Agent({
  id: 'agent-1100',
  name: 'Agent 1100',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
