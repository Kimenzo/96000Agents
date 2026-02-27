import { Agent } from '@mastra/core/agent';

export const agent5280 = new Agent({
  id: 'agent-5280',
  name: 'Agent 5280',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
