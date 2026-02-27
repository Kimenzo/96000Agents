import { Agent } from '@mastra/core/agent';

export const agent99 = new Agent({
  id: 'agent-99',
  name: 'Agent 99',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
