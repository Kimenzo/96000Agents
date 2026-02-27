import { Agent } from '@mastra/core/agent';

export const agent1111 = new Agent({
  id: 'agent-1111',
  name: 'Agent 1111',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
