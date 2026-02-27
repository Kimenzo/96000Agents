import { Agent } from '@mastra/core/agent';

export const agent42021 = new Agent({
  id: 'agent-42021',
  name: 'Agent 42021',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
