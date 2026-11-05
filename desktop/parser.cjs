const { validateEvent } = require('./model.cjs');
function parseDraft(prompt, calendars, now = new Date()) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) throw new Error('Bitte einen Termin mit maximal 2.000 Zeichen beschreiben.');
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9);
  const date = prompt.match(/\b(\d{4})-(\d{2})-(\d{2})\b/) || prompt.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (date) {
    const iso = date[1].length === 4, year = +(iso ? date[1] : date[3]), month = +date[2], day = +(iso ? date[3] : date[1]);
    start = new Date(year, month - 1, day, 9);
    if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) throw new Error('Dieses Datum existiert nicht.');
  } else if (/\bheute\b/i.test(prompt)) start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9);
  else if (/(?:^|\s)übermorgen\b/iu.test(prompt)) start.setDate(start.getDate() + 1);
  const time = prompt.match(/\b(?:um\s+)?(\d{1,2}):(\d{2})(?:\s*Uhr)?\b/i) || prompt.match(/\bum\s+(\d{1,2})\s*Uhr\b/i);
  if (time) { if (+time[1] > 23 || +(time[2] || 0) > 59) throw new Error('Diese Uhrzeit ist ungültig.'); start.setHours(+time[1], +(time[2] || 0)); }
  const duration = prompt.match(/\b(\d+)\s*(Minuten|Minute|Stunden|Stunde)\b/i);
  const minutes = duration ? +duration[1] * (/Stunde/i.test(duration[2]) ? 60 : 1) : 60;
  if (minutes < 1 || minutes > 10080) throw new Error('Bitte eine Dauer zwischen einer Minute und sieben Tagen wählen.');
  const title = prompt.trim().slice(0, 200);
  return validateEvent({ title, start: start.toISOString(), end: new Date(+start + minutes * 60000).toISOString(), calendarId: calendars[0].id, location: '', notes: '' }, calendars);
}
module.exports = { parseDraft };
