import { Agent } from '@mastra/core/agent';

export const agent80286 = new Agent({
  id: 'agent-80286',
  name: 'Agent 80286',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
