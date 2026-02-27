import { Agent } from '@mastra/core/agent';

export const agent2000 = new Agent({
  id: 'agent-2000',
  name: 'Agent 2000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
