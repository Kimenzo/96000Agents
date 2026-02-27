import { Agent } from '@mastra/core/agent';

export const agent111 = new Agent({
  id: 'agent-111',
  name: 'Agent 111',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
