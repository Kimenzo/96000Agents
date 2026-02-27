import { Agent } from '@mastra/core/agent';

export const agent8005 = new Agent({
  id: 'agent-8005',
  name: 'Agent 8005',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
