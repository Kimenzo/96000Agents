import { Agent } from '@mastra/core/agent';

export const agent8084 = new Agent({
  id: 'agent-8084',
  name: 'Agent 8084',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
