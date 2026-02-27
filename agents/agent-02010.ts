import { Agent } from '@mastra/core/agent';

export const agent2010 = new Agent({
  id: 'agent-2010',
  name: 'Agent 2010',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
