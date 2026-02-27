import { Agent } from '@mastra/core/agent';

export const agent6100 = new Agent({
  id: 'agent-6100',
  name: 'Agent 6100',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
