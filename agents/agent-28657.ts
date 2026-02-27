import { Agent } from '@mastra/core/agent';

export const agent28657 = new Agent({
  id: 'agent-28657',
  name: 'Agent 28657',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
