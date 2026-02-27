import { Agent } from '@mastra/core/agent';

export const agent80502 = new Agent({
  id: 'agent-80502',
  name: 'Agent 80502',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
