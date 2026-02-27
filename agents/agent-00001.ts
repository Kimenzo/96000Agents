import { Agent } from '@mastra/core/agent';

export const agent1 = new Agent({
  id: 'agent-1',
  name: 'Agent 1',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
