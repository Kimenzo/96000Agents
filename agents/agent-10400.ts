import { Agent } from '@mastra/core/agent';

export const agent10400 = new Agent({
  id: 'agent-10400',
  name: 'Agent 10400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
