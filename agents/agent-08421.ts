import { Agent } from '@mastra/core/agent';

export const agent8421 = new Agent({
  id: 'agent-8421',
  name: 'Agent 8421',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
