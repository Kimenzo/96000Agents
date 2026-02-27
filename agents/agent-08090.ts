import { Agent } from '@mastra/core/agent';

export const agent8090 = new Agent({
  id: 'agent-8090',
  name: 'Agent 8090',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
