import { Agent } from '@mastra/core/agent';

export const agent30303 = new Agent({
  id: 'agent-30303',
  name: 'Agent 30303',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
