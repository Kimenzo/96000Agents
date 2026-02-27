import { Agent } from '@mastra/core/agent';

export const agent18502 = new Agent({
  id: 'agent-18502',
  name: 'Agent 18502',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
