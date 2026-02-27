import { Agent } from '@mastra/core/agent';

export const agent9400 = new Agent({
  id: 'agent-9400',
  name: 'Agent 9400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
