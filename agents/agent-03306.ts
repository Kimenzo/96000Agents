import { Agent } from '@mastra/core/agent';

export const agent3306 = new Agent({
  id: 'agent-3306',
  name: 'Agent 3306',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
