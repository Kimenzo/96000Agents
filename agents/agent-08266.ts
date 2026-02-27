import { Agent } from '@mastra/core/agent';

export const agent8266 = new Agent({
  id: 'agent-8266',
  name: 'Agent 8266',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
