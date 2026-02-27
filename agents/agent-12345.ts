import { Agent } from '@mastra/core/agent';

export const agent12345 = new Agent({
  id: 'agent-12345',
  name: 'Agent 12345',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
