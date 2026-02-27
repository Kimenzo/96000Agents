import { Agent } from '@mastra/core/agent';

export const agent503 = new Agent({
  id: 'agent-503',
  name: 'Agent 503',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
