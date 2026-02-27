import { Agent } from '@mastra/core/agent';

export const agent20200 = new Agent({
  id: 'agent-20200',
  name: 'Agent 20200',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
