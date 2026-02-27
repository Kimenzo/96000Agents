import { Agent } from '@mastra/core/agent';

export const agent4800 = new Agent({
  id: 'agent-4800',
  name: 'Agent 4800',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
