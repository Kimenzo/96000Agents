import { Agent } from '@mastra/core/agent';

export const agent2014 = new Agent({
  id: 'agent-2014',
  name: 'Agent 2014',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
