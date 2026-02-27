import { Agent } from '@mastra/core/agent';

export const agent18001 = new Agent({
  id: 'agent-18001',
  name: 'Agent 18001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
