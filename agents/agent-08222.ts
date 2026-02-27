import { Agent } from '@mastra/core/agent';

export const agent8222 = new Agent({
  id: 'agent-8222',
  name: 'Agent 8222',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
