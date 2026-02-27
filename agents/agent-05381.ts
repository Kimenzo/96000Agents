import { Agent } from '@mastra/core/agent';

export const agent5381 = new Agent({
  id: 'agent-5381',
  name: 'Agent 5381',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
