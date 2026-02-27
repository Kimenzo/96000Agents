import { Agent } from '@mastra/core/agent';

export const agent8200 = new Agent({
  id: 'agent-8200',
  name: 'Agent 8200',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
