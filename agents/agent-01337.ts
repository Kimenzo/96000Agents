import { Agent } from '@mastra/core/agent';

export const agent1337 = new Agent({
  id: 'agent-1337',
  name: 'Agent 1337',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
