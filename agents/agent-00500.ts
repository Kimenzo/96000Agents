import { Agent } from '@mastra/core/agent';

export const agent500 = new Agent({
  id: 'agent-500',
  name: 'Agent 500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
