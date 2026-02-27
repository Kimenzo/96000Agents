import { Agent } from '@mastra/core/agent';

export const agent401 = new Agent({
  id: 'agent-401',
  name: 'Agent 401',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
