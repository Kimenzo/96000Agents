import { Agent } from '@mastra/core/agent';

export const agent1000 = new Agent({
  id: 'agent-1000',
  name: 'Agent 1000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
