import { Agent } from '@mastra/core/agent';

export const agent3 = new Agent({
  id: 'agent-3',
  name: 'Agent 3',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
