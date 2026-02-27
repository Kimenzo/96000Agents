import { Agent } from '@mastra/core/agent';

export const agent27783 = new Agent({
  id: 'agent-27783',
  name: 'Agent 27783',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
