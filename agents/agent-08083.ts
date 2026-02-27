import { Agent } from '@mastra/core/agent';

export const agent8083 = new Agent({
  id: 'agent-8083',
  name: 'Agent 8083',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
