import { Agent } from '@mastra/core/agent';

export const agent8250 = new Agent({
  id: 'agent-8250',
  name: 'Agent 8250',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
