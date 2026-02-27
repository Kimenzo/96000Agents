import { Agent } from '@mastra/core/agent';

export const agent5081 = new Agent({
  id: 'agent-5081',
  name: 'Agent 5081',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
