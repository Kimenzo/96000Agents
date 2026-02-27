import { Agent } from '@mastra/core/agent';

export const agent8080 = new Agent({
  id: 'agent-8080',
  name: 'Agent 8080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
