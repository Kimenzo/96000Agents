import { Agent } from '@mastra/core/agent';

export const agent100 = new Agent({
  id: 'agent-100',
  name: 'Agent 100',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
