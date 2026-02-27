import { Agent } from '@mastra/core/agent';

export const agent3389 = new Agent({
  id: 'agent-3389',
  name: 'Agent 3389',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
