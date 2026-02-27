import { Agent } from '@mastra/core/agent';

export const agent987 = new Agent({
  id: 'agent-987',
  name: 'Agent 987',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
