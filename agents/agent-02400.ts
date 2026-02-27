import { Agent } from '@mastra/core/agent';

export const agent2400 = new Agent({
  id: 'agent-2400',
  name: 'Agent 2400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
