import { Agent } from '@mastra/core/agent';

export const agent8091 = new Agent({
  id: 'agent-8091',
  name: 'Agent 8091',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
