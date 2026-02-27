import { Agent } from '@mastra/core/agent';

export const agent8901 = new Agent({
  id: 'agent-8901',
  name: 'Agent 8901',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
