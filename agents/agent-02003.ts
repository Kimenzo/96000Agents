import { Agent } from '@mastra/core/agent';

export const agent2003 = new Agent({
  id: 'agent-2003',
  name: 'Agent 2003',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
