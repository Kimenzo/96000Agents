import { Agent } from '@mastra/core/agent';

export const agent25001 = new Agent({
  id: 'agent-25001',
  name: 'Agent 25001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
