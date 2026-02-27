import { Agent } from '@mastra/core/agent';

export const agent365 = new Agent({
  id: 'agent-365',
  name: 'Agent 365',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
