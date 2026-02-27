import { Agent } from '@mastra/core/agent';

export const agent502 = new Agent({
  id: 'agent-502',
  name: 'Agent 502',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
