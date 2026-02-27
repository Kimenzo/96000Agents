import { Agent } from '@mastra/core/agent';

export const agent5600 = new Agent({
  id: 'agent-5600',
  name: 'Agent 5600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
