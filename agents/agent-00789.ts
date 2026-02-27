import { Agent } from '@mastra/core/agent';

export const agent789 = new Agent({
  id: 'agent-789',
  name: 'Agent 789',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
