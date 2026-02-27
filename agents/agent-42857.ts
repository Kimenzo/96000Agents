import { Agent } from '@mastra/core/agent';

export const agent42857 = new Agent({
  id: 'agent-42857',
  name: 'Agent 42857',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
