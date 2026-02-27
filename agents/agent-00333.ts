import { Agent } from '@mastra/core/agent';

export const agent333 = new Agent({
  id: 'agent-333',
  name: 'Agent 333',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
