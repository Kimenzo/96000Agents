import { Agent } from '@mastra/core/agent';

export const agent2600 = new Agent({
  id: 'agent-2600',
  name: 'Agent 2600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
