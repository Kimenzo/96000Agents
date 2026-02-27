import { Agent } from '@mastra/core/agent';

export const agent2012 = new Agent({
  id: 'agent-2012',
  name: 'Agent 2012',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
