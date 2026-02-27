import { Agent } from '@mastra/core/agent';

export const agent8123 = new Agent({
  id: 'agent-8123',
  name: 'Agent 8123',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
