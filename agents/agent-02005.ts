import { Agent } from '@mastra/core/agent';

export const agent2005 = new Agent({
  id: 'agent-2005',
  name: 'Agent 2005',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
