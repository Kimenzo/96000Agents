import { Agent } from '@mastra/core/agent';

export const agent86400 = new Agent({
  id: 'agent-86400',
  name: 'Agent 86400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
