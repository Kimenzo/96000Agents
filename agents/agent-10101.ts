import { Agent } from '@mastra/core/agent';

export const agent10101 = new Agent({
  id: 'agent-10101',
  name: 'Agent 10101',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
