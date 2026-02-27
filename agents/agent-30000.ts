import { Agent } from '@mastra/core/agent';

export const agent30000 = new Agent({
  id: 'agent-30000',
  name: 'Agent 30000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
