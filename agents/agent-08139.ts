import { Agent } from '@mastra/core/agent';

export const agent8139 = new Agent({
  id: 'agent-8139',
  name: 'Agent 8139',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
