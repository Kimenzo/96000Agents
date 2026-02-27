import { Agent } from '@mastra/core/agent';

export const agent25080 = new Agent({
  id: 'agent-25080',
  name: 'Agent 25080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
