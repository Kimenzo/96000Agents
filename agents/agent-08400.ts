import { Agent } from '@mastra/core/agent';

export const agent8400 = new Agent({
  id: 'agent-8400',
  name: 'Agent 8400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
