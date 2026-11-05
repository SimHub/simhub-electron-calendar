const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../desktop/store.cjs');
const event = { title: 'Meeting', start: '2026-11-05T10:00:00Z', end: '2026-11-05T11:00:00Z', calendarId: '1' };
async function fixture(t) { const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'simhub-test-')); t.after(() => fs.rm(dir, { recursive: true, force: true })); const store = new Store(dir); return { dir, store }; }
test('serializes concurrent writes and persists full edits including false and empty values', async t => {
  const { dir, store } = await fixture(t); await store.load();
  const events = await Promise.all(Array.from({ length: 20 }, (_, i) => store.save({ ...event, title: `Termin ${i}`, allDay: true, location: 'Office' })));
  assert.equal(store.snapshot().events.length, 20);
  await store.save({ ...events[0], allDay: false, location: '', title: 'Updated', calendarId: '2' });
  const reopened = new Store(dir); await reopened.load(); const saved = reopened.snapshot().events.find(e => e.id === events[0].id);
  assert.equal(saved.allDay, false); assert.equal(saved.location, ''); assert.equal(saved.calendarId, '2'); assert.equal(saved.title, 'Updated');
  await store.remove(saved.id); assert.equal(store.snapshot().events.length, 19);
});
test('failed validation and disk failures do not corrupt in-memory state or future writes', async t => {
  const { store } = await fixture(t); await store.load();
  await assert.rejects(store.save({ ...event, title: '' })); assert.equal(store.snapshot().events.length, 0);
  const persist = store.persist; store.persist = async () => { throw new Error('disk full'); };
  await assert.rejects(store.save(event)); assert.equal(store.snapshot().events.length, 0);
  store.persist = persist; await store.save(event); assert.equal(store.snapshot().events.length, 1);
});
test('corrupt data fails closed and stays untouched', async t => {
  const { dir, store } = await fixture(t); const file = path.join(dir, 'calendar-v2.json'); await fs.writeFile(file, 'broken');
  await assert.rejects(store.load(), /Originaldatei/); assert.equal(await fs.readFile(file, 'utf8'), 'broken');
});
test('legacy migration preserves originals and handles TUI dates', async t => {
  const { dir, store } = await fixture(t); const legacy = path.join(dir, 'storage'); await fs.mkdir(legacy);
  const data = { ...event, id: 'OLD123', start: { _date: event.start }, end: { _date: event.end }, isAllDay: true };
  await fs.writeFile(path.join(legacy, 'OLD123.json'), JSON.stringify(data));
  await fs.writeFile(path.join(legacy, 'calendar.json'), JSON.stringify([{ id: '1', name: 'Mein alter Kalender' }]));
  await store.load(); assert.equal(store.snapshot().events[0].allDay, true); assert.equal(store.snapshot().calendars[0].name, 'Mein alter Kalender');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(legacy, 'OLD123.json'), 'utf8')), data);
});
test('restore validates the complete dataset before replacement', async t => {
  const { store } = await fixture(t); await store.load(); await store.save(event);
  assert.throws(() => store.import({ version: 2, events: [], calendars: [] })); assert.equal(store.snapshot().events.length, 1);
  await store.import({ ...store.snapshot(), events: [] }); assert.equal(store.snapshot().events.length, 0);
});
