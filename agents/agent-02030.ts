import { Agent } from '@mastra/core/agent';

export const agent2030 = new Agent({
  id: 'agent-2030',
  name: 'Agent 2030',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
