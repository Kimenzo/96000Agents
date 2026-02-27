import { Agent } from '@mastra/core/agent';

export const agent888 = new Agent({
  id: 'agent-888',
  name: 'Agent 888',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
