import { Agent } from '@mastra/core/agent';

export const agent5300 = new Agent({
  id: 'agent-5300',
  name: 'Agent 5300',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
