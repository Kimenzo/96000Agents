import { Agent } from '@mastra/core/agent';

export const agent2700 = new Agent({
  id: 'agent-2700',
  name: 'Agent 2700',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
