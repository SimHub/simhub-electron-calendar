const { test } = require('node:test');
const assert = require('node:assert/strict');
const { escapeIcsText, unescapeIcsText, eventToIcs, icsToEvents } = require('../desktop/sync.cjs');
const { CALENDARS } = require('../desktop/model.cjs');

test('escapes and unescapes ICS special characters correctly', () => {
  const text = 'Hallo, Welt; mit \\ Backslash und\nneuer Zeile.';
  const escaped = escapeIcsText(text);
  assert.equal(escaped, 'Hallo\\, Welt\\; mit \\\\ Backslash und\\nneuer Zeile.');
  const unescaped = unescapeIcsText(escaped);
  assert.equal(unescaped, text);
});

test('formats local event to valid RFC 5545 iCalendar string', () => {
  const event = {
    id: 'test-event-123',
    title: 'Projektbesprechung',
    start: '2026-11-08T10:00:00.000Z',
    end: '2026-11-08T11:00:00.000Z',
    calendarId: '1',
    allDay: false,
    location: 'Büro / Online',
    notes: 'Agenda:\n1. Status\n2. Rollout'
  };
  const ics = eventToIcs(event);
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('BEGIN:VEVENT'));
  assert.ok(ics.includes('UID:test-event-123'));
  assert.ok(ics.includes('SUMMARY:Projektbesprechung'));
  assert.ok(ics.includes('DTSTART:20261108T100000Z'));
  assert.ok(ics.includes('DTEND:20261108T110000Z'));
  assert.ok(ics.includes('LOCATION:Büro / Online'));
  assert.ok(ics.includes('END:VEVENT'));
});

test('parses incoming ICS calendar into normalized SimHub events', () => {
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Nextcloud Calendar//DE
BEGIN:VEVENT
UID:nc-event-456
DTSTART:20261109T140000Z
DTEND:20261109T153000Z
SUMMARY:Familienessen
LOCATION:Restaurant Krone
DESCRIPTION:Tisch auf Lackmann reserviert
END:VEVENT
BEGIN:VEVENT
UID:nc-allday-789
DTSTART;VALUE=DATE:20261110
DTEND;VALUE=DATE:20261111
SUMMARY:Urlaubstag
END:VEVENT
END:VCALENDAR`;

  const parsed = icsToEvents(ics, '1', CALENDARS);
  assert.equal(parsed.length, 2);

  const regular = parsed[0];
  assert.equal(regular.id, 'nc-event-456');
  assert.equal(regular.title, 'Familienessen');
  assert.equal(regular.location, 'Restaurant Krone');
  assert.equal(regular.notes, 'Tisch auf Lackmann reserviert');
  assert.equal(regular.allDay, false);
  assert.equal(regular.start, '2026-11-09T14:00:00.000Z');

  const allday = parsed[1];
  assert.equal(allday.id, 'nc-allday-789');
  assert.equal(allday.title, 'Urlaubstag');
  assert.equal(allday.allDay, true);
  assert.equal(allday.start, '2026-11-10T00:00:00.000Z');
});
