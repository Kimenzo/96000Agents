import { Agent } from '@mastra/core/agent';

export const agent6000 = new Agent({
  id: 'agent-6000',
  name: 'Agent 6000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
