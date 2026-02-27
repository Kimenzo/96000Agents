import { Agent } from '@mastra/core/agent';

export const agent64001 = new Agent({
  id: 'agent-64001',
  name: 'Agent 64001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
