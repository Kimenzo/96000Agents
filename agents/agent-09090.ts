import { Agent } from '@mastra/core/agent';

export const agent9090 = new Agent({
  id: 'agent-9090',
  name: 'Agent 9090',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
