import { Agent } from '@mastra/core/agent';

export const agent8022 = new Agent({
  id: 'agent-8022',
  name: 'Agent 8022',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
