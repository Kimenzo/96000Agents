import { Agent } from '@mastra/core/agent';

export const agent321 = new Agent({
  id: 'agent-321',
  name: 'Agent 321',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
