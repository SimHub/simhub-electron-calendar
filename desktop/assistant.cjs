const { validateEvent } = require('./model.cjs');
function configuration(env = process.env) {
  const provider = env.SIMHUB_AI_PROVIDER || (env.SIMHUB_OLLAMA_MODEL ? 'ollama' : 'off');
  if (!['off', 'ollama', 'api'].includes(provider)) throw new Error('SIMHUB_AI_PROVIDER muss off, ollama oder api sein.');
  const model = env.SIMHUB_AI_MODEL || env.SIMHUB_OLLAMA_MODEL || '';
  if (provider !== 'off' && (!model || model.length > 200)) throw new Error('Bitte SIMHUB_AI_MODEL setzen.');
  const endpoint = provider === 'ollama' ? 'http://127.0.0.1:11434/api/chat' : env.SIMHUB_AI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
  const url = new URL(endpoint);
  if (provider === 'api' && (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search)) throw new Error('API-Endpunkt muss eine HTTPS-Adresse ohne Zugangsdaten oder Query sein.');
  const key = env.SIMHUB_AI_API_KEY || '';
  if (provider === 'api' && (key.length > 4096 || /[^\x21-\x7E]/.test(key))) throw new Error('API-Schlüssel enthält unzulässige Zeichen oder ist zu lang.');
  if (provider === 'api' && !key) throw new Error('Bitte SIMHUB_AI_API_KEY setzen.');
  return { provider, model, endpoint, key };
}
async function limitedJSON(response) {
  const reader = response.body.getReader(); let size = 0; const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); throw new Error('KI-Antwort zu groß.'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { reader.releaseLock(); }
}
async function propose(prompt, calendars, options = {}) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) throw new Error('Bitte maximal 2.000 Zeichen eingeben.');
  const config = configuration(options.env);
  if (config.provider === 'off') throw new Error('KI ist nicht eingerichtet. Bitte einen lokalen oder API-Anbieter konfigurieren.');
  const messages = [
    { role: 'system', content: `Du entwirfst genau einen Kalendertermin. Keine Werkzeuge, keine Aktionen. Heute: ${new Date().toString()}. Zeitzone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}. Antworte nur mit JSON: {"title":string,"start":ISO8601 mit Offset,"end":ISO8601 mit Offset,"calendarId":string,"allDay":boolean,"location":string,"notes":string}. Kalender: ${JSON.stringify(calendars)}. Falls Angaben fehlen, wähle einen sinnvollen Vorschlag. Alle Ausgaben werden vom Menschen geprüft.` },
    { role: 'user', content: prompt },
  ];
  const local = config.provider === 'ollama';
  // Endpoint and secrets come from validated settings or the process environment, never from model output.
  // Redirects are rejected so Authorization cannot be forwarded to another service.
  const response = await (options.fetch || fetch)(config.endpoint, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60000),
    headers: { 'Content-Type': 'application/json', ...(!local ? { Authorization: `Bearer ${config.key}` } : {}) },
    body: JSON.stringify({ model: config.model, messages, stream: false, ...(local ? { format: 'json' } : { response_format: { type: 'json_object' }, store: false }) }),
  });
  if (!response.ok) throw new Error(`KI-Dienst antwortet mit HTTP ${response.status}. Bitte Anbieter und Modell prüfen.`);
  let draft;
  try {
    const result = await limitedJSON(response);
    draft = JSON.parse(local ? result.message.content : result.choices[0].message.content);
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw new Error();
  } catch (error) { if (error.message === 'KI-Antwort zu groß.') throw error; throw new Error('KI hat keinen gültigen Terminvorschlag geliefert.'); }
  delete draft.id;
  // Model output is untrusted data, validated exactly like a manually entered event.
  return validateEvent(draft, calendars);
}
module.exports = { propose, configuration, limitedJSON };
