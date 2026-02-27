import { Agent } from '@mastra/core/agent';

export const agent2345 = new Agent({
  id: 'agent-2345',
  name: 'Agent 2345',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
