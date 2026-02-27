import { Agent } from '@mastra/core/agent';

export const agent2023 = new Agent({
  id: 'agent-2023',
  name: 'Agent 2023',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
