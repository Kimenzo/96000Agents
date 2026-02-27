import { Agent } from '@mastra/core/agent';

export const agent18080 = new Agent({
  id: 'agent-18080',
  name: 'Agent 18080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
