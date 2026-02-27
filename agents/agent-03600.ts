import { Agent } from '@mastra/core/agent';

export const agent3600 = new Agent({
  id: 'agent-3600',
  name: 'Agent 3600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
