const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execute } = require('../desktop/agent.cjs');
test('agent bridge exposes no mutation tool and drafts cannot choose IDs', async () => {
  const caps = await execute({ tool: 'capabilities' }, {}); assert.equal(caps.writes, false);
  const draft = await execute({ tool: 'calendar.draft', text: 'Morgen um 10 Uhr Meeting' }, {}); assert.equal(draft.id, undefined); assert.equal(draft.title, 'Morgen um 10 Uhr Meeting');
  await assert.rejects(execute({ tool: 'calendar.delete', id: '*' }, {}), /Unbekannt/);
  await assert.rejects(execute({ tool: 'calendar.list' }, {}), /ausdrücklich/);
});
