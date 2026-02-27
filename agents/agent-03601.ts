import { Agent } from '@mastra/core/agent';

export const agent3601 = new Agent({
  id: 'agent-3601',
  name: 'Agent 3601',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
