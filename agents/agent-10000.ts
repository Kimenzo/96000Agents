import { Agent } from '@mastra/core/agent';

export const agent10000 = new Agent({
  id: 'agent-10000',
  name: 'Agent 10000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
