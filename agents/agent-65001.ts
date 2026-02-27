import { Agent } from '@mastra/core/agent';

export const agent65001 = new Agent({
  id: 'agent-65001',
  name: 'Agent 65001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
