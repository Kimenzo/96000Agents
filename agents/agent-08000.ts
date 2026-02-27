import { Agent } from '@mastra/core/agent';

export const agent8000 = new Agent({
  id: 'agent-8000',
  name: 'Agent 8000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
