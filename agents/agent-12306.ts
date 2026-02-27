import { Agent } from '@mastra/core/agent';

export const agent12306 = new Agent({
  id: 'agent-12306',
  name: 'Agent 12306',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
