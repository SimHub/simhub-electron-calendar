const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { Settings } = require('../desktop/settings.cjs');
const secure = { isEncryptionAvailable: () => true, encryptString: value => Buffer.from(value.split('').reverse().join('')), decryptString: value => value.toString().split('').reverse().join('') };
test('settings never return plaintext keys and retain keys only for unchanged API endpoints', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'simhub-settings-')); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const settings = new Settings(dir, secure, {}); await settings.load(); assert.equal(settings.status().provider, 'off');
  await settings.save({ provider: 'api', model: 'test', endpoint: 'https://provider.example/v1/chat/completions', key: 'private-test-key' });
  assert.equal(settings.environment().SIMHUB_AI_API_KEY, 'private-test-key'); assert.equal(settings.status().key, undefined);
  assert.equal((await fs.readFile(settings.file, 'utf8')).includes('private-test-key'), false);
  await settings.save({ provider: 'api', model: 'test2', endpoint: 'https://provider.example/v1/chat/completions', key: '' });
  assert.equal(settings.environment().SIMHUB_AI_API_KEY, 'private-test-key');
  await assert.rejects(settings.save({ provider: 'api', model: 'test', endpoint: 'https://other.example/v1/chat/completions', key: '' }));
  await settings.save({ provider: 'off', model: '', endpoint: '', key: '' }); assert.equal(settings.saved.encryptedKey, '');
});
test('settings refuse insecure OS storage or overriding explicit environment configuration', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'simhub-settings-')); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const input = { provider: 'api', model: 'test', endpoint: '', key: 'test' };
  await assert.rejects(new Settings(dir, { ...secure, isEncryptionAvailable: () => false }, {}).save(input), /Schlüsselbund/);
  await assert.rejects(new Settings(dir, { ...secure, getSelectedStorageBackend: () => 'basic_text' }, {}).save(input), /Schlüsselbund/);
  await assert.rejects(new Settings(dir, secure, { SIMHUB_AI_PROVIDER: 'off' }).save(input), /Umgebungsvariablen/);
});
