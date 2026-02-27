import { Agent } from '@mastra/core/agent';

export const agent250 = new Agent({
  id: 'agent-250',
  name: 'Agent 250',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
