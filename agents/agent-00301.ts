import { Agent } from '@mastra/core/agent';

export const agent301 = new Agent({
  id: 'agent-301',
  name: 'Agent 301',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
