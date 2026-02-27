import { Agent } from '@mastra/core/agent';

export const agent5002 = new Agent({
  id: 'agent-5002',
  name: 'Agent 5002',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
