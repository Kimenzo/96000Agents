import { Agent } from '@mastra/core/agent';

export const agent18000 = new Agent({
  id: 'agent-18000',
  name: 'Agent 18000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
