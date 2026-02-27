import { Agent } from '@mastra/core/agent';

export const agent5100 = new Agent({
  id: 'agent-5100',
  name: 'Agent 5100',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
