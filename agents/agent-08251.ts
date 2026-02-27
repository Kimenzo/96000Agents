import { Agent } from '@mastra/core/agent';

export const agent8251 = new Agent({
  id: 'agent-8251',
  name: 'Agent 8251',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
