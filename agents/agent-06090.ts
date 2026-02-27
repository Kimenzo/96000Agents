import { Agent } from '@mastra/core/agent';

export const agent6090 = new Agent({
  id: 'agent-6090',
  name: 'Agent 6090',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
