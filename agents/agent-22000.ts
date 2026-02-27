import { Agent } from '@mastra/core/agent';

export const agent22000 = new Agent({
  id: 'agent-22000',
  name: 'Agent 22000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
