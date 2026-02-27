import { Agent } from '@mastra/core/agent';

export const agent4200 = new Agent({
  id: 'agent-4200',
  name: 'Agent 4200',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
