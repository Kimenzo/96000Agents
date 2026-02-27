import { Agent } from '@mastra/core/agent';

export const agent2337 = new Agent({
  id: 'agent-2337',
  name: 'Agent 2337',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
