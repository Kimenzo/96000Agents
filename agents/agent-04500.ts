import { Agent } from '@mastra/core/agent';

export const agent4500 = new Agent({
  id: 'agent-4500',
  name: 'Agent 4500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
