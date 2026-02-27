import { Agent } from '@mastra/core/agent';

export const agent7000 = new Agent({
  id: 'agent-7000',
  name: 'Agent 7000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
