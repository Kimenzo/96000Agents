import { Agent } from '@mastra/core/agent';

export const agent80601 = new Agent({
  id: 'agent-80601',
  name: 'Agent 80601',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
