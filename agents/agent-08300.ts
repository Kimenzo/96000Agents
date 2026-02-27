import { Agent } from '@mastra/core/agent';

export const agent8300 = new Agent({
  id: 'agent-8300',
  name: 'Agent 8300',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
