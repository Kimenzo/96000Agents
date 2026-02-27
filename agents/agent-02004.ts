import { Agent } from '@mastra/core/agent';

export const agent2004 = new Agent({
  id: 'agent-2004',
  name: 'Agent 2004',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
