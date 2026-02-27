import { Agent } from '@mastra/core/agent';

export const agent8082 = new Agent({
  id: 'agent-8082',
  name: 'Agent 8082',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
