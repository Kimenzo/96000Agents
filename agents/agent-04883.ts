import { Agent } from '@mastra/core/agent';

export const agent4883 = new Agent({
  id: 'agent-4883',
  name: 'Agent 4883',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
