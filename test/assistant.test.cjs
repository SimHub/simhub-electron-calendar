const { test } = require('node:test');
const assert = require('node:assert/strict');
const { propose, configuration } = require('../desktop/assistant.cjs');
const { CALENDARS } = require('../desktop/model.cjs');
const draft = { id: 'untrusted', title: 'Meeting', start: '2026-11-06T14:00:00+01:00', end: '2026-11-06T15:00:00+01:00', calendarId: '1' };
test('AI configuration is off by default and rejects insecure API endpoints', () => {
  assert.equal(configuration({}).provider, 'off');
  assert.throws(() => configuration({ SIMHUB_AI_PROVIDER: 'api', SIMHUB_AI_MODEL: 'test', SIMHUB_AI_ENDPOINT: 'http://evil.test', SIMHUB_AI_API_KEY: 'test' }));
  assert.throws(() => configuration({ SIMHUB_AI_PROVIDER: 'api', SIMHUB_AI_MODEL: 'test' }));
});
test('Ollama sends only prompt and calendar names, rejects model-chosen IDs', async () => {
  const value = await propose('Meeting morgen', CALENDARS, { env: { SIMHUB_OLLAMA_MODEL: 'local' }, fetch: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat'); assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, undefined);
    const body = JSON.parse(options.body); assert.equal(body.messages.length, 2); assert.equal(body.tools, undefined);
    return new Response(JSON.stringify({ message: { content: JSON.stringify(draft) } }));
  } });
  assert.notEqual(value.id, draft.id); assert.equal(value.start, '2026-11-06T13:00:00.000Z');
});
test('compatible API keeps credentials in request headers and validates response', async () => {
  const env = { SIMHUB_AI_PROVIDER: 'api', SIMHUB_AI_MODEL: 'test', SIMHUB_AI_API_KEY: 'secret-for-test', SIMHUB_AI_ENDPOINT: 'https://provider.example/v1/chat/completions' };
  const value = await propose('Meeting', CALENDARS, { env, fetch: async (url, options) => { assert.equal(options.headers.Authorization, 'Bearer secret-for-test'); assert.equal(JSON.parse(options.body).store, false); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(draft) } }] })); } });
  assert.equal(value.title, draft.title);
  await assert.rejects(propose('Meeting', CALENDARS, { env, fetch: async () => new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] })) }));
  await assert.rejects(propose('Meeting', CALENDARS, { env, fetch: async () => new Response('x'.repeat(70000)) }), /zu groß/);
});
