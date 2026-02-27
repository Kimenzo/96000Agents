import { Agent } from '@mastra/core/agent';

export const agent5120 = new Agent({
  id: 'agent-5120',
  name: 'Agent 5120',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
