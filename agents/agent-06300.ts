import { Agent } from '@mastra/core/agent';

export const agent6300 = new Agent({
  id: 'agent-6300',
  name: 'Agent 6300',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
