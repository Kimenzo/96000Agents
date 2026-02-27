import { Agent } from '@mastra/core/agent';

export const agent404 = new Agent({
  id: 'agent-404',
  name: 'Agent 404',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
