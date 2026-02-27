import { Agent } from '@mastra/core/agent';

export const agent9002 = new Agent({
  id: 'agent-9002',
  name: 'Agent 9002',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
