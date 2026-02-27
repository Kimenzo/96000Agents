import { Agent } from '@mastra/core/agent';

export const agent2 = new Agent({
  id: 'agent-2',
  name: 'Agent 2',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
