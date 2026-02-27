import { Agent } from '@mastra/core/agent';

export const agent27001 = new Agent({
  id: 'agent-27001',
  name: 'Agent 27001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
