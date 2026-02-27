import { Agent } from '@mastra/core/agent';

export const agent42001 = new Agent({
  id: 'agent-42001',
  name: 'Agent 42001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
