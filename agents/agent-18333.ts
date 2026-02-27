import { Agent } from '@mastra/core/agent';

export const agent18333 = new Agent({
  id: 'agent-18333',
  name: 'Agent 18333',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
