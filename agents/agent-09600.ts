import { Agent } from '@mastra/core/agent';

export const agent9600 = new Agent({
  id: 'agent-9600',
  name: 'Agent 9600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
