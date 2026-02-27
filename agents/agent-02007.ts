import { Agent } from '@mastra/core/agent';

export const agent2007 = new Agent({
  id: 'agent-2007',
  name: 'Agent 2007',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
