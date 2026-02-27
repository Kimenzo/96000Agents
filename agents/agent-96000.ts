import { Agent } from '@mastra/core/agent';

export const agent96000 = new Agent({
  id: 'agent-96000',
  name: 'Agent 96000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
