import { Agent } from '@mastra/core/agent';

export const agent9300 = new Agent({
  id: 'agent-9300',
  name: 'Agent 9300',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
