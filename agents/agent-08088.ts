import { Agent } from '@mastra/core/agent';

export const agent8088 = new Agent({
  id: 'agent-8088',
  name: 'Agent 8088',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
