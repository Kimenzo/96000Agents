import { Agent } from '@mastra/core/agent';

export const agent5700 = new Agent({
  id: 'agent-5700',
  name: 'Agent 5700',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
