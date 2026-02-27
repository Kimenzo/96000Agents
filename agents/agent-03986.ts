import { Agent } from '@mastra/core/agent';

export const agent3986 = new Agent({
  id: 'agent-3986',
  name: 'Agent 3986',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
