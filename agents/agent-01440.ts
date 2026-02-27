import { Agent } from '@mastra/core/agent';

export const agent1440 = new Agent({
  id: 'agent-1440',
  name: 'Agent 1440',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
