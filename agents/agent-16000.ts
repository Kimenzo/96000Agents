import { Agent } from '@mastra/core/agent';

export const agent16000 = new Agent({
  id: 'agent-16000',
  name: 'Agent 16000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
