import { Agent } from '@mastra/core/agent';

export const agent2060 = new Agent({
  id: 'agent-2060',
  name: 'Agent 2060',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
