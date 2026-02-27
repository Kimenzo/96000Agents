import { Agent } from '@mastra/core/agent';

export const agent2022 = new Agent({
  id: 'agent-2022',
  name: 'Agent 2022',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
