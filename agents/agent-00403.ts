import { Agent } from '@mastra/core/agent';

export const agent403 = new Agent({
  id: 'agent-403',
  name: 'Agent 403',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
