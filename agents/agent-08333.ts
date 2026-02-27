import { Agent } from '@mastra/core/agent';

export const agent8333 = new Agent({
  id: 'agent-8333',
  name: 'Agent 8333',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
