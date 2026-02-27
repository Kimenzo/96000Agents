import { Agent } from '@mastra/core/agent';

export const agent2100 = new Agent({
  id: 'agent-2100',
  name: 'Agent 2100',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
