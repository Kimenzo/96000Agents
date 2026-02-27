import { Agent } from '@mastra/core/agent';

export const agent80403 = new Agent({
  id: 'agent-80403',
  name: 'Agent 80403',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
