import { Agent } from '@mastra/core/agent';

export const agent26657 = new Agent({
  id: 'agent-26657',
  name: 'Agent 26657',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
