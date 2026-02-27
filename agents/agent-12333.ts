import { Agent } from '@mastra/core/agent';

export const agent12333 = new Agent({
  id: 'agent-12333',
  name: 'Agent 12333',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
