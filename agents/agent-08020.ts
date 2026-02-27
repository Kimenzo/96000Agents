import { Agent } from '@mastra/core/agent';

export const agent8020 = new Agent({
  id: 'agent-8020',
  name: 'Agent 8020',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
