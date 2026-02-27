import { Agent } from '@mastra/core/agent';

export const agent2381 = new Agent({
  id: 'agent-2381',
  name: 'Agent 2381',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
