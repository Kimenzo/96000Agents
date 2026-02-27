import { Agent } from '@mastra/core/agent';

export const agent1990 = new Agent({
  id: 'agent-1990',
  name: 'Agent 1990',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
