import { Agent } from '@mastra/core/agent';

export const agent2006 = new Agent({
  id: 'agent-2006',
  name: 'Agent 2006',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
