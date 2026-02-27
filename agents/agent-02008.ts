import { Agent } from '@mastra/core/agent';

export const agent2008 = new Agent({
  id: 'agent-2008',
  name: 'Agent 2008',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
