import { Agent } from '@mastra/core/agent';

export const agent26000 = new Agent({
  id: 'agent-26000',
  name: 'Agent 26000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
