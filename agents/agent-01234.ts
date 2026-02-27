import { Agent } from '@mastra/core/agent';

export const agent1234 = new Agent({
  id: 'agent-1234',
  name: 'Agent 1234',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
