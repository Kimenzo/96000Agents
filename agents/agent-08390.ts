import { Agent } from '@mastra/core/agent';

export const agent8390 = new Agent({
  id: 'agent-8390',
  name: 'Agent 8390',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
