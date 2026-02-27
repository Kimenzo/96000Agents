import { Agent } from '@mastra/core/agent';

export const agent50400 = new Agent({
  id: 'agent-50400',
  name: 'Agent 50400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
