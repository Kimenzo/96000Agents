import { Agent } from '@mastra/core/agent';

export const agent9001 = new Agent({
  id: 'agent-9001',
  name: 'Agent 9001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
