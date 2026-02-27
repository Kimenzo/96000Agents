import { Agent } from '@mastra/core/agent';

export const agent999 = new Agent({
  id: 'agent-999',
  name: 'Agent 999',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
