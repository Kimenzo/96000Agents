import { Agent } from '@mastra/core/agent';

export const agent6485 = new Agent({
  id: 'agent-6485',
  name: 'Agent 6485',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
