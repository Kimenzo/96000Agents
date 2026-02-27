import { Agent } from '@mastra/core/agent';

export const agent2090 = new Agent({
  id: 'agent-2090',
  name: 'Agent 2090',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
