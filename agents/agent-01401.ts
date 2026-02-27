import { Agent } from '@mastra/core/agent';

export const agent1401 = new Agent({
  id: 'agent-1401',
  name: 'Agent 1401',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
