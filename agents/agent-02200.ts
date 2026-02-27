import { Agent } from '@mastra/core/agent';

export const agent2200 = new Agent({
  id: 'agent-2200',
  name: 'Agent 2200',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
