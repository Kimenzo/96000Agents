import { Agent } from '@mastra/core/agent';

export const agent22001 = new Agent({
  id: 'agent-22001',
  name: 'Agent 22001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
