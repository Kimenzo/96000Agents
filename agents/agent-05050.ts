import { Agent } from '@mastra/core/agent';

export const agent5050 = new Agent({
  id: 'agent-5050',
  name: 'Agent 5050',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
