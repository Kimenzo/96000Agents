import { Agent } from '@mastra/core/agent';

export const agent1901 = new Agent({
  id: 'agent-1901',
  name: 'Agent 1901',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
