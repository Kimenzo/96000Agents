import { Agent } from '@mastra/core/agent';

export const agent1200 = new Agent({
  id: 'agent-1200',
  name: 'Agent 1200',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
