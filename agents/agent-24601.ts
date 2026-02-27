import { Agent } from '@mastra/core/agent';

export const agent24601 = new Agent({
  id: 'agent-24601',
  name: 'Agent 24601',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
