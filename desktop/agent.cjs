// Agent bridge: one JSON request on stdin, one JSON response on stdout.
// No datastore writes and no command execution. Draft files are opened by the user in the app.
const fs = require('node:fs/promises');
const path = require('node:path');
const { CALENDARS, MAX_DATA_BYTES, validateData } = require('./model.cjs');
const { parseDraft } = require('./parser.cjs');
const { propose } = require('./assistant.cjs');
async function execute(request, env = process.env) {
  if (!request || typeof request !== 'object') throw new Error('JSON-Anfrage erwartet.');
  if (request.tool === 'capabilities') return { tools: ['capabilities', 'calendar.list', 'calendar.draft'], writes: false, approval: 'Entwurf in der App öffnen und Speichern wählen.' };
  let data = { version: 2, calendars: CALENDARS, events: [] };
  if (env.SIMHUB_DATA_DIR) {
    if (!path.isAbsolute(env.SIMHUB_DATA_DIR)) throw new Error('SIMHUB_DATA_DIR muss absolut sein.');
    const file = path.join(env.SIMHUB_DATA_DIR, 'calendar-v2.json');
    if ((await fs.stat(file)).size > MAX_DATA_BYTES) throw new Error('Kalender zu groß.');
    data = validateData(JSON.parse(await fs.readFile(file, 'utf8')));
  }
  if (request.tool === 'calendar.list') {
    if (!env.SIMHUB_DATA_DIR) throw new Error('Für lesenden Datenzugriff SIMHUB_DATA_DIR ausdrücklich setzen.');
    return data;
  }
  if (request.tool === 'calendar.draft') {
    if (request.mode !== undefined && !['local', 'ai'].includes(request.mode)) throw new Error('Modus local oder ai wählen.');
    const draft = request.mode === 'ai' ? await propose(request.text, data.calendars, { env }) : parseDraft(request.text, data.calendars);
    delete draft.id;
    return draft;
  }
  throw new Error('Unbekanntes Werkzeug.');
}
if (require.main === module) {
  (async () => {
    let input = '';
    for await (const chunk of process.stdin) { input += chunk; if (Buffer.byteLength(input) > 16384) throw new Error('Anfrage zu groß.'); }
    const result = await execute(JSON.parse(input));
    process.stdout.write(JSON.stringify(result) + '\n');
  })().catch(error => { process.stderr.write(JSON.stringify({ error: error.message }) + '\n'); process.exitCode = 1; });
}
module.exports = { execute };
