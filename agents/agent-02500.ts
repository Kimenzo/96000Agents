import { Agent } from '@mastra/core/agent';

export const agent2500 = new Agent({
  id: 'agent-2500',
  name: 'Agent 2500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
