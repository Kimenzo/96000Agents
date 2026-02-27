import { Agent } from '@mastra/core/agent';

export const agent8085 = new Agent({
  id: 'agent-8085',
  name: 'Agent 8085',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
