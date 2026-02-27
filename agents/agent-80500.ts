import { Agent } from '@mastra/core/agent';

export const agent80500 = new Agent({
  id: 'agent-80500',
  name: 'Agent 80500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
