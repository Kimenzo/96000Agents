import { Agent } from '@mastra/core/agent';

export const agent2011 = new Agent({
  id: 'agent-2011',
  name: 'Agent 2011',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
