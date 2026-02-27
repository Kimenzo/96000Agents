import { Agent } from '@mastra/core/agent';

export const agent80100 = new Agent({
  id: 'agent-80100',
  name: 'Agent 80100',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
