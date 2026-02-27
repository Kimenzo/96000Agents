import { Agent } from '@mastra/core/agent';

export const agent2365 = new Agent({
  id: 'agent-2365',
  name: 'Agent 2365',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
