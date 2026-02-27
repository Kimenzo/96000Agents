import { Agent } from '@mastra/core/agent';

export const agent9080 = new Agent({
  id: 'agent-9080',
  name: 'Agent 9080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
