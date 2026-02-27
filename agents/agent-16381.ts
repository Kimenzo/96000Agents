import { Agent } from '@mastra/core/agent';

export const agent16381 = new Agent({
  id: 'agent-16381',
  name: 'Agent 16381',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
