import { Agent } from '@mastra/core/agent';

export const agent6500 = new Agent({
  id: 'agent-6500',
  name: 'Agent 6500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
