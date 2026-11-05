const { randomUUID } = require('node:crypto');
const CALENDARS = [
  { id: '1', name: 'Persönlich', color: 'violet' },
  { id: '2', name: 'Arbeit', color: 'blue' },
  { id: '3', name: 'Familie', color: 'rose' },
  { id: '4', name: 'Freunde', color: 'green' },
  { id: '5', name: 'Reisen', color: 'amber' },
  { id: '6', name: 'Sonstiges', color: 'slate' },
  { id: '7', name: 'Privat', color: 'violet' },
  { id: '8', name: 'Feiertage', color: 'rose' },
];
function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Ungültiger oder zu langer Text.');
  return value.trim();
}
function validateEvent(input, calendars = CALENDARS) {
  if (!input || typeof input !== 'object') throw new Error('Ungültiger Termin.');
  if (typeof input.start !== 'string' || typeof input.end !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(input.start) || !/^\d{4}-\d{2}-\d{2}T/.test(input.end)) throw new Error('Ungültiges Datumsformat.');
  if (input.allDay !== undefined && typeof input.allDay !== 'boolean') throw new Error('Ungültige Ganztagsangabe.');
  for (const value of [input.start, input.end]) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T.*(?:Z|[+-]\d{2}:\d{2})$/);
    if (!match) throw new Error('Datum benötigt eine Zeitzone.');
    const day = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
    if (day.getUTCFullYear() !== +match[1] || day.getUTCMonth() !== +match[2] - 1 || day.getUTCDate() !== +match[3]) throw new Error('Dieses Datum existiert nicht.');
  }
  const start = new Date(input.start), end = new Date(input.end);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start || start.getFullYear() < 1900 || end.getFullYear() > 2200) throw new Error('Bitte einen gültigen Zeitraum wählen (1900–2200).');
  if (!calendars.some(c => c.id === input.calendarId)) throw new Error('Kalender nicht gefunden.');
  const id = input.id === undefined ? randomUUID() : text(input.id, 100, true);
  if (!/^[\w-]+$/.test(id)) throw new Error('Ungültige Termin-ID.');
  return { id, title: text(input.title, 200, true), start: start.toISOString(), end: end.toISOString(), calendarId: input.calendarId, allDay: input.allDay === true, location: text(input.location ?? '', 300), notes: text(input.notes ?? '', 4000) };
}
function validateData(data) {
  if (!data || data.version !== 2 || !Array.isArray(data.events) || data.events.length > 50000 || !Array.isArray(data.calendars) || data.calendars.length < 1 || data.calendars.length > 30) throw new Error('Unbekanntes oder zu großes Kalenderformat.');
  const colors = new Set(CALENDARS.map(c => c.color));
  const calendars = data.calendars.map(c => ({ id: text(c.id, 100, true), name: text(c.name, 80, true), color: colors.has(c.color) ? c.color : 'violet' }));
  if (new Set(calendars.map(c => c.id)).size !== calendars.length) throw new Error('Doppelte Kalender-ID.');
  const events = data.events.map(e => validateEvent(e, calendars));
  if (new Set(events.map(e => e.id)).size !== events.length) throw new Error('Doppelte Termin-ID.');
  return { version: 2, calendars, events };
}
module.exports = { CALENDARS, validateEvent, validateData };
