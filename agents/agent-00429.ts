import { Agent } from '@mastra/core/agent';

export const agent429 = new Agent({
  id: 'agent-429',
  name: 'Agent 429',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
