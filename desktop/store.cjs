const fs = require('node:fs/promises');
const path = require('node:path');
const { CALENDARS, MAX_DATA_BYTES, validateData, validateEvent } = require('./model.cjs');
class Store {
  constructor(directory) { this.directory = directory; this.file = path.join(directory, 'calendar-v2.json'); this.queue = Promise.resolve(); }
  async load() {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    try { this.data = validateData(JSON.parse(await fs.readFile(this.file, 'utf8'))); }
    catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Kalenderdatei nicht lesbar. Die Originaldatei bleibt unverändert. Bitte ein Backup prüfen.');
      this.data = { version: 2, calendars: structuredClone(CALENDARS), events: [] };
      await this.migrate();
      await this.persist(this.data);
    }
    return this.snapshot();
  }
  async migrate() {
    // Legacy files stay untouched; only explicitly validated schedule fields cross the boundary.
    const directory = path.join(this.directory, 'storage');
    let files;
    try { files = await fs.readdir(directory); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    let calendar;
    try { calendar = JSON.parse(await fs.readFile(path.join(directory, 'calendar.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Alte Kalenderdatei nicht lesbar. Migration abgebrochen.'); }
    if (calendar !== undefined) {
      if (!Array.isArray(calendar) || !calendar.length || calendar.length > 30) throw new Error('Alte Kalenderliste ungültig.');
      this.data.calendars = calendar.map((c, i) => ({ id: String(c.id), name: c.name, color: CALENDARS[i % CALENDARS.length].color }));
    }
    for (const file of files.filter(f => f.endsWith('.json') && f !== 'calendar.json')) {
      const old = JSON.parse(await fs.readFile(path.join(directory, file), 'utf8'));
      if (!old.id || !old.start || !old.end) continue;
      this.data.events.push(validateEvent({ ...old, id: String(old.id), calendarId: String(old.calendarId), start: old.start._date ?? old.start, end: old.end._date ?? old.end, allDay: old.isAllDay === true }, this.data.calendars));
    }
    this.data = validateData(this.data);
  }
  snapshot() { return structuredClone(this.data); }
  async persist(data) {
    const temp = `${this.file}.tmp`;
    const serialized = JSON.stringify(data);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_DATA_BYTES) throw new Error('Kalenderdaten überschreiten die maximal erlaubte Größe (20 MB).');
    await fs.writeFile(temp, serialized, { mode: 0o600 });
    await fs.rename(temp, this.file);
  }
  mutate(change) {
    const task = this.queue.then(async () => {
      const next = this.snapshot();
      const result = await change(next);
      const valid = validateData(next);
      await this.persist(valid);
      this.data = valid;
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
  save(input) {
    return this.mutate(data => {
      const event = validateEvent(input, data.calendars);
      const index = data.events.findIndex(e => e.id === event.id);
      if (index < 0) data.events.push(event); else data.events[index] = event;
      return event;
    });
  }
  remove(id) { return this.mutate(data => { data.events = data.events.filter(e => e.id !== id); }); }
  rename(id, name) { return this.mutate(data => { const c = data.calendars.find(c => c.id === id); if (!c) throw new Error('Kalender nicht gefunden.'); c.name = name; }); }
  async export(filePath) {
    const data = this.snapshot();
    let serialized = JSON.stringify(data, null, 2);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_DATA_BYTES) serialized = JSON.stringify(data);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_DATA_BYTES) throw new Error('Kalenderdaten überschreiten die maximal erlaubte Größe (20 MB).');
    await fs.writeFile(filePath, serialized, { mode: 0o600 });
    return true;
  }
  import(data, { backup = false } = {}) {
    const valid = validateData(data);
    return this.mutate(async next => {
      if (backup && this.data) {
        const backupPath = path.join(this.directory, `before-import-${Date.now()}.json`);
        const backupData = JSON.stringify(this.data);
        if (Buffer.byteLength(backupData, 'utf8') > MAX_DATA_BYTES) throw new Error('Aktuelle Kalenderdaten überschreiten das Backup-Limit (20 MB).');
        await fs.writeFile(backupPath, backupData, { mode: 0o600 });
      }
      for (const key of Object.keys(next)) {
        if (!valid.hasOwnProperty(key)) delete next[key];
      }
      Object.assign(next, valid);
    });
  }
}
module.exports = { Store };
