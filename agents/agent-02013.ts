import { Agent } from '@mastra/core/agent';

export const agent2013 = new Agent({
  id: 'agent-2013',
  name: 'Agent 2013',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
