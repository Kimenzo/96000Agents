import { Agent } from '@mastra/core/agent';

export const agent2512 = new Agent({
  id: 'agent-2512',
  name: 'Agent 2512',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
