import { Agent } from '@mastra/core/agent';

export const agent84000 = new Agent({
  id: 'agent-84000',
  name: 'Agent 84000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
