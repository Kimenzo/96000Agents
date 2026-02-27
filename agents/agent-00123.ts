import { Agent } from '@mastra/core/agent';

export const agent123 = new Agent({
  id: 'agent-123',
  name: 'Agent 123',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
