import { Agent } from '@mastra/core/agent';

export const agent12381 = new Agent({
  id: 'agent-12381',
  name: 'Agent 12381',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
