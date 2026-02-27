import { Agent } from '@mastra/core/agent';

export const agent5678 = new Agent({
  id: 'agent-5678',
  name: 'Agent 5678',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
