import { Agent } from '@mastra/core/agent';

export const agent28800 = new Agent({
  id: 'agent-28800',
  name: 'Agent 28800',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
