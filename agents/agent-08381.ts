import { Agent } from '@mastra/core/agent';

export const agent8381 = new Agent({
  id: 'agent-8381',
  name: 'Agent 8381',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
