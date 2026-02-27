import { Agent } from '@mastra/core/agent';

export const agent6200 = new Agent({
  id: 'agent-6200',
  name: 'Agent 6200',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
