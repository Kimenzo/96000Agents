import { Agent } from '@mastra/core/agent';

export const agent8502 = new Agent({
  id: 'agent-8502',
  name: 'Agent 8502',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
