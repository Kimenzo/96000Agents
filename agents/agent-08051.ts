import { Agent } from '@mastra/core/agent';

export const agent8051 = new Agent({
  id: 'agent-8051',
  name: 'Agent 8051',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
