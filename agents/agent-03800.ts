import { Agent } from '@mastra/core/agent';

export const agent3800 = new Agent({
  id: 'agent-3800',
  name: 'Agent 3800',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
