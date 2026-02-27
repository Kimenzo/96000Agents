import { Agent } from '@mastra/core/agent';

export const agent30601 = new Agent({
  id: 'agent-30601',
  name: 'Agent 30601',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
