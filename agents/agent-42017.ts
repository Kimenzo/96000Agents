import { Agent } from '@mastra/core/agent';

export const agent42017 = new Agent({
  id: 'agent-42017',
  name: 'Agent 42017',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
