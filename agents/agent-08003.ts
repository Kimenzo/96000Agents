import { Agent } from '@mastra/core/agent';

export const agent8003 = new Agent({
  id: 'agent-8003',
  name: 'Agent 8003',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
