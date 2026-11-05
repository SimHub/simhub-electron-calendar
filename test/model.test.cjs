const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CALENDARS, validateEvent, validateData } = require('../desktop/model.cjs');
const { parseDraft } = require('../desktop/parser.cjs');
const input = { title: 'Meeting', start: '2026-11-05T10:00:00+01:00', end: '2026-11-05T11:00:00+01:00', calendarId: '1' };
test('normalizes dates, generates unique IDs and keeps plain text', () => { const event = validateEvent({ ...input, title: '<img src=x onerror=alert(1)>' }); assert.equal(event.title, '<img src=x onerror=alert(1)>'); assert.equal(event.start, '2026-11-05T09:00:00.000Z'); assert.notEqual(event.id, validateEvent(input).id); });
test('rejects invalid data at the main-process boundary', () => {
  for (const invalid of [{ title: '' }, { title: 'x'.repeat(201) }, { start: 'invalid' }, { end: input.start }, { calendarId: 'unknown' }, { id: '../secrets' }, { notes: {} }, { start: null }, { start: '2026-02-31T10:00:00Z' }, { start: '2026-11-05T10:00:00' }]) assert.throws(() => validateEvent({ ...input, ...invalid }));
});
test('rejects corrupt backup and duplicate IDs', () => { const event = validateEvent(input); const data = { version: 2, calendars: CALENDARS, events: [event] }; assert.deepEqual(validateData(data), data); assert.throws(() => validateData({ ...data, events: [event, event] })); assert.throws(() => validateData({ ...data, calendars: [] })); });
test('local drafts resolve relative and explicit dates deterministically', () => {
  const now = new Date(2026, 10, 5, 12);
  const event = parseDraft('Morgen um 14:30 Uhr Meeting 2 Stunden', CALENDARS, now);
  assert.equal(new Date(event.start).getDate(), 6); assert.equal(new Date(event.start).getHours(), 14); assert.equal(new Date(event.end) - new Date(event.start), 7200000);
  assert.equal(new Date(parseDraft('Übermorgen um 9 Uhr Kaffee', CALENDARS, now).start).getDate(), 7);
  assert.equal(new Date(parseDraft('Termin am 2026-12-01 um 10:00', CALENDARS, now).start).getMonth(), 11);
  assert.throws(() => parseDraft('Termin 31.02.2027', CALENDARS, now));
  assert.throws(() => parseDraft('Termin um 25:00 Uhr', CALENDARS, now));
});
