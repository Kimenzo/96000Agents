import { Agent } from '@mastra/core/agent';

export const agent303 = new Agent({
  id: 'agent-303',
  name: 'Agent 303',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
