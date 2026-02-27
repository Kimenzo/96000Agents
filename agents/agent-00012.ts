import { Agent } from '@mastra/core/agent';

export const agent12 = new Agent({
  id: 'agent-12',
  name: 'Agent 12',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
