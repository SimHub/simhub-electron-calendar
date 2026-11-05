const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isTrustedSender } = require('../desktop/ipc-security.cjs');
const URL = 'simhub://calendar/index.html';
function fixture(url = URL) {
  const frame = { url };
  const sender = { mainFrame: frame };
  return { event: { sender, senderFrame: frame }, window: { webContents: sender, isDestroyed: () => false } };
}
test('trusted main document keeps IPC access after a fragment navigation', () => {
  for (const url of [URL, `${URL}#`, `${URL}#calendar`, `${URL}#https://evil.example/`]) {
    const { event, window } = fixture(url);
    assert.equal(isTrustedSender(event, window, URL), true);
  }
});
test('foreign windows, subframes, paths, queries and origins remain denied', () => {
  for (const url of ['https://calendar/index.html', 'simhub://evil/index.html', 'simhub://calendar/other.html', `${URL}?other=true`, 'simhub://calendar:123/index.html', 'simhub://user@calendar/index.html', 'not a URL']) {
    const { event, window } = fixture(url);
    assert.equal(isTrustedSender(event, window, URL), false, url);
  }
  const { event, window } = fixture();
  assert.equal(isTrustedSender({ ...event, sender: {} }, window, URL), false);
  assert.equal(isTrustedSender({ ...event, senderFrame: { url: URL } }, window, URL), false);
  assert.equal(isTrustedSender({ ...event, senderFrame: null }, window, URL), false);
  assert.equal(isTrustedSender(event, null, URL), false);
  assert.equal(isTrustedSender(event, { ...window, isDestroyed: () => true }, URL), false);
  assert.equal(isTrustedSender({ ...event, get senderFrame() { throw new Error('detached'); } }, window, URL), false);
});
