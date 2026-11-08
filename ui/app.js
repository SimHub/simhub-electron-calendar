'use strict';
const $ = id => document.getElementById(id);
const api = window.calendarAPI;

let currentLang = 'de';
function t(key, ...args) {
  const dict = window.i18n?.[currentLang] || window.i18n?.['de'] || {};
  const val = dict[key];
  if (typeof val === 'function') return val(...args);
  return val !== undefined ? val : key;
}
function currentLocale() {
  return currentLang === 'en' ? 'en-US' : 'de-DE';
}

const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const localInput = date => `${dateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const shortTime = date => new Date(date).toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' });
const longDate = date => date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'long' });
const sameDay = (a, b) => dateKey(a) === dateKey(b);
const plusDays = (date, amount) => { const d = new Date(date); d.setDate(d.getDate() + amount); return d; };
const startDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const state = { data: { calendars: [], events: [] }, anchor: startDay(new Date()), selected: startDay(new Date()), view: 'month', hidden: new Set(), query: '', indexed: new Map() };
let toastTimer;
function element(tag, cls, content) { const el = document.createElement(tag); if (cls) el.className = cls; if (content !== undefined) el.textContent = content; return el; }
function toast(message, error = false) { $('toast').textContent = message; $('toast').className = error ? 'toast-error' : ''; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 9000 : 3500); }
async function call(method, ...args) { if (!api) throw new Error('Bitte die Desktop-App mit npm start öffnen.'); const result = await api[method](...args); if (!result.ok) throw new Error(result.error); return result.value; }
function calendarFor(event) { return state.data.calendars.find(c => c.id === event.calendarId) || state.data.calendars[0]; }
function visible(event) { return !state.hidden.has(event.calendarId) && (!state.query || `${event.title} ${event.location} ${event.notes}`.toLocaleLowerCase('de').includes(state.query)); }
function range() {
  const anchor = state.anchor;
  if (state.view === 'week') { const start = plusDays(anchor, -((anchor.getDay() + 6) % 7)); return { start, count: 7 }; }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  return { start: plusDays(first, -((first.getDay() + 6) % 7)), count: 42 };
}
function indexEvents() {
  state.indexed.clear();
  // Index only visible days; no per-cell disk reads or full-calendar rescans.
  const { start, count } = range();
  const dates = Array.from({ length: count }, (_, i) => plusDays(start, i));
  if (!dates.some(d => sameDay(d, state.selected))) dates.push(state.selected);
  const days = dates.map(date => ({ key: dateKey(date), start: +date, end: +plusDays(date, 1) }));
  for (const day of days) state.indexed.set(day.key, []);
  const events = state.data.events.filter(visible).sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
  for (const event of events) {
    const start = +new Date(event.start), end = +new Date(event.end);
    for (const day of days) if (start < day.end && end > day.start) state.indexed.get(day.key).push(event);
  }
}
function eventsFor(date) { return state.indexed.get(dateKey(date)) || []; }
function renderCalendarFilters() {
  $('calendars').replaceChildren();
  for (const calendar of state.data.calendars) {
    const label = element('label', `calendar-filter color-${calendar.color}`), input = element('input');
    input.type = 'checkbox'; input.checked = !state.hidden.has(calendar.id);
    input.addEventListener('change', () => { input.checked ? state.hidden.delete(calendar.id) : state.hidden.add(calendar.id); render(); });
    label.append(input, element('span', 'color-mark'), document.createTextNode(calendar.name));
    $('calendars').append(label);
  }
  for (const id of ['event-calendar', 'rename-select']) {
    $(id).replaceChildren(...state.data.calendars.map(c => { const option = element('option', '', c.name); option.value = c.id; return option; }));
  }
}
function chip(event) {
  const button = element('button', `event-chip color-${calendarFor(event).color}`);
  button.append(element('time', '', event.allDay ? '' : shortTime(event.start)), element('span', 'event-chip-title', event.title));
  button.title = `${event.title} · ${event.allDay ? t('allDay') : shortTime(event.start)}${event.location ? ' · ' + event.location : ''}`;
  button.addEventListener('click', () => openEvent(event));
  return button;
}
function renderMonth() {
  const { start, count } = range();
  const weekdays = element('div', 'weekdays');
  const daysArr = currentLang === 'en' ? ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] : ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
  daysArr.forEach(day => weekdays.append(element('div', 'weekday', day)));
  const grid = element('div', state.view === 'week' ? 'month-grid week-grid' : 'month-grid');
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const date = plusDays(start, i), events = eventsFor(date);
    const cell = element('div', `day-cell${date.getDay() === 0 || date.getDay() === 6 ? ' weekend' : ''}${date.getMonth() !== state.anchor.getMonth() ? ' outside' : ''}${sameDay(date, today) ? ' today' : ''}${sameDay(date, state.selected) ? ' selected' : ''}`);
    const number = element('button', 'day-number', date.getDate());
    number.setAttribute('aria-label', t('createEventAria', date.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })));
    number.addEventListener('click', () => { selectDay(date); openEvent(null, date); });
    cell.append(number);
    const limit = state.view === 'week' ? 100 : 3;
    events.slice(0, limit).forEach(event => cell.append(chip(event)));
    if (events.length > limit) { const more = element('button', 'more-events', t('moreEvents', events.length - limit)); more.addEventListener('click', () => { state.selected = date; state.anchor = date; state.view = 'agenda'; render(); }); cell.append(more); }
    cell.addEventListener('click', e => { if (e.target === cell) { selectDay(date); openEvent(null, date); } });
    grid.append(cell);
  }
  $('calendar').replaceChildren(weekdays, grid);
}
function selectDay(date) { state.selected = startDay(date); render(); }
function renderAgenda() {
  const list = element('div', 'agenda-list');
  const from = new Date(state.anchor.getFullYear(), state.anchor.getMonth(), 1), to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const events = state.data.events.filter(e => visible(e) && (state.query || (new Date(e.start) < to && new Date(e.end) > from))).sort((a, b) => a.start.localeCompare(b.start));
  if (!events.length) list.append(element('div', 'empty-search', state.query ? t('emptySearch') : t('emptyAgenda')));
  let previousDate = '';
  for (const event of events) {
    const key = dateKey(new Date(event.start));
    if (key !== previousDate) { list.append(element('h3', 'agenda-date', new Date(event.start).toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))); previousDate = key; }
    const button = element('button', `agenda-event color-${calendarFor(event).color}`), detail = element('div');
    button.append(element('time', '', event.allDay ? t('allDay') : `${shortTime(event.start)} – ${shortTime(event.end)}`));
    detail.append(element('strong', '', event.title), element('small', '', [calendarFor(event).name, event.location].filter(Boolean).join(' · ')));
    button.append(detail); button.addEventListener('click', () => openEvent(event)); list.append(button);
  }
  $('calendar').replaceChildren(list);
}
function renderDay() {
  $('day-title').textContent = `${state.selected.toLocaleDateString(currentLocale(), { weekday: 'long' })}, ${longDate(state.selected)}`;
  const events = eventsFor(state.selected);
  $('day-subtitle').textContent = t('eventsPlanned', events.length);
  $('day-events').replaceChildren();
  if (!events.length) {
    const empty = element('div', 'empty-day'); empty.append(element('span', '', '◷'), element('h3', '', t('emptyDayTitle')), element('p', '', t('emptyDayDesc')));
    $('day-events').append(empty);
  }
  events.forEach(event => {
    const button = element('button', `day-event color-${calendarFor(event).color}`);
    button.append(element('time', '', event.allDay ? t('allDayUpper') : `${shortTime(event.start)} – ${shortTime(event.end)}`), element('strong', '', event.title), element('small', '', event.location || calendarFor(event).name));
    button.addEventListener('click', () => openEvent(event)); $('day-events').append(button);
  });
}
function render() {
  indexEvents();
  $('range-title').textContent = state.view === 'week' ? `${longDate(range().start)} – ${longDate(plusDays(range().start, 6))}` : state.anchor.toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' });
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', button.dataset.view === state.view));
  if (state.view === 'agenda' || state.query) renderAgenda(); else renderMonth();
  renderDay();
  $('event-count').textContent = t('eventsCount', state.data.events.length);
}
async function reload() {
  try {
    const appConf = await call('appStatus');
    if (appConf?.language && ['de', 'en'].includes(appConf.language) && appConf.language !== currentLang) {
      currentLang = appConf.language;
      updateStaticTexts();
    }
  } catch {
    // Graceful fallback if appStatus IPC is unavailable
  }
  state.data = await call('load');
  renderCalendarFilters();
  render();
}
function showDialog(id) { if (!$(id).open) $(id).showModal(); }
function openEvent(event = null, date = state.selected) {
  $('event-form').reset(); $('event-error').textContent = ''; $('event-warning').hidden = true;
  $('event-dialog-title').textContent = event ? t('editEvent') : t('newEventTitle');
  $('event-id').value = event?.id || '';
  $('event-title').value = event?.title || '';
  const start = event ? new Date(event.start) : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9);
  const end = event ? new Date(event.end) : new Date(+start + 3600000);
  $('event-start').value = localInput(start); $('event-end').value = localInput(end);
  $('event-calendar').value = event?.calendarId || state.data.calendars[0]?.id;
  $('event-all-day').checked = event?.allDay || false;
  $('event-location').value = event?.location || ''; $('event-notes').value = event?.notes || '';
  $('delete-event').hidden = !event?.id || !state.data.events.some(e => e.id === event.id);
  showDialog('event-dialog'); $('event-title').focus();
}
function draftValues() {
  const start = new Date($('event-start').value), end = new Date($('event-end').value);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start) throw new Error('Das Ende muss nach dem Beginn liegen.');
  const event = { title: $('event-title').value, start: start.toISOString(), end: end.toISOString(), calendarId: $('event-calendar').value, allDay: $('event-all-day').checked, location: $('event-location').value, notes: $('event-notes').value };
  if ($('event-id').value) event.id = $('event-id').value;
  return event;
}
function checkConflicts() {
  try { const event = draftValues(); const conflicts = state.data.events.filter(e => e.id !== event.id && e.calendarId === event.calendarId && e.start < event.end && e.end > event.start); $('event-warning').hidden = !conflicts.length; $('event-warning').textContent = `Hinweis: ${conflicts.length} andere Termine in diesem Kalender überschneiden sich.`; } catch { $('event-warning').hidden = true; }
}
$('event-form').addEventListener('input', checkConflicts);
$('event-form').addEventListener('submit', async event => {
  event.preventDefault(); $('save-event').disabled = true;
  try { const value = draftValues(); const saved = await call('save', value); state.selected = startDay(new Date(saved.start)); state.anchor = state.selected; await reload(); $('event-dialog').close(); toast('Termin gespeichert.'); }
  catch (error) { $('event-error').textContent = error.message; }
  finally { $('save-event').disabled = false; }
});
$('event-all-day').addEventListener('change', () => {
  if ($('event-all-day').checked) { const start = startDay(new Date($('event-start').value)); if (Number.isFinite(+start)) { $('event-start').value = localInput(start); $('event-end').value = localInput(plusDays(start, 1)); } }
});
$('delete-event').addEventListener('click', async () => {
  if (!confirm('Diesen Termin wirklich löschen?')) return;
  try { await call('remove', $('event-id').value); await reload(); $('event-dialog').close(); toast('Termin gelöscht.'); } catch (error) { $('event-error').textContent = error.message; }
});
$('new-event').addEventListener('click', () => openEvent());
$('add-break').addEventListener('click', () => { openEvent(); $('event-title').value = 'Zeit für mich'; });
$('today').addEventListener('click', () => { state.anchor = startDay(new Date()); state.selected = state.anchor; render(); });
for (const [id, direction] of [['previous', -1], ['next', 1]]) $(id).addEventListener('click', () => {
  if (state.view === 'week') state.anchor = plusDays(state.anchor, direction * 7); else state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth() + direction, 1);
  state.selected = state.anchor; render();
});
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; render(); }));
let searchTimer;
$('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.query = $('search').value.trim().toLocaleLowerCase('de'); render(); }, 120); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
function openCalendar() { state.query = ''; $('search').value = ''; state.view = 'month'; render(); }
$('calendar-nav').addEventListener('click', openCalendar);
document.querySelector('.brand').addEventListener('click', openCalendar);
async function aiStatus() {
  try { const status = await call('status'); const label = status.provider === 'off' ? 'Kein KI-Dienst aktiv · Lokale Vorbereitung verfügbar' : `${status.provider === 'ollama' ? 'Ollama · lokal' : 'API · Text wird an den konfigurierten Dienst gesendet'} · ${status.model}`; $('ai-status').textContent = label; $('settings-ai-status').textContent = label; $('ai-provider').value = status.provider; $('ai-model').value = status.model; $('ai-endpoint').value = status.endpoint || ''; $('ai-key').value = ''; $('ai-key').placeholder = status.hasKey ? 'Gespeichert · leer lassen, um beizubehalten' : 'Schlüssel eingeben'; $('ai-settings-save').disabled = status.fromEnvironment; updateProviderFields(); $('ai-draft').disabled = status.provider === 'off'; }
  catch (error) { $('ai-status').textContent = error.message; }
}
function openAssistant() { $('assistant-error').textContent = ''; showDialog('assistant-dialog'); aiStatus(); }
for (const id of ['assistant-open', 'assistant-nav']) $(id).addEventListener('click', openAssistant);
$('local-draft').addEventListener('click', async () => {
  try { const draft = await call('localDraft', $('assistant-prompt').value); $('assistant-dialog').close(); openEvent(draft); $('event-id').value = ''; $('event-warning').hidden = false; $('event-warning').textContent = 'Lokal vorbereitet. Bitte Titel, Datum und Uhrzeit prüfen. Fehlende Zeitangaben werden mit morgen 09:00 Uhr vorbelegt.'; }
  catch (error) { $('assistant-error').textContent = error.message; }
});
$('ai-draft').addEventListener('click', async () => {
  $('ai-draft').disabled = true; $('local-draft').disabled = true; $('assistant-error').textContent = ''; $('ai-draft').textContent = 'Vorschlag wird erstellt …';
  try { const draft = await call('assistant', $('assistant-prompt').value); $('assistant-dialog').close(); openEvent(draft); $('event-id').value = ''; $('event-warning').hidden = false; $('event-warning').textContent = 'KI-Vorschlag: Bitte alle Angaben vor dem Speichern prüfen.'; }
  catch (error) { $('assistant-error').textContent = error.message.includes('fetch') ? 'KI-Dienst nicht erreichbar. Bitte Konfiguration und Verbindung prüfen.' : error.message; }
  finally { $('ai-draft').disabled = false; $('local-draft').disabled = false; $('ai-draft').textContent = '✧ KI-Vorschlag erstellen'; }
});
function updateProviderFields() { const isAPI = $('ai-provider').value === 'api'; $('api-endpoint-label').hidden = !isAPI; $('api-key-label').hidden = !isAPI; $('ai-model').disabled = $('ai-provider').value === 'off'; }
$('ai-provider').addEventListener('change', updateProviderFields);
$('ai-settings-form').addEventListener('submit', async event => { event.preventDefault(); $('ai-settings-error').textContent = ''; $('ai-settings-save').disabled = true; try { await call('configure', { provider: $('ai-provider').value, model: $('ai-model').value, endpoint: $('ai-endpoint').value, key: $('ai-key').value }); $('ai-key').value = ''; await aiStatus(); toast('KI-Einstellungen gespeichert.'); } catch (error) { $('ai-settings-error').textContent = error.message; } finally { $('ai-settings-save').disabled = false; } });
$('settings-dialog').addEventListener('close', () => { $('ai-key').value = ''; });
async function syncStatusUI() {
  try {
    const status = await call('syncStatus');
    $('sync-enabled').checked = status.enabled;
    $('sync-fields').hidden = !status.enabled;
    $('sync-provider').value = status.provider === 'off' ? 'nextcloud' : status.provider;
    $('sync-url').value = status.url || '';
    $('sync-user').value = status.user || '';
    $('sync-password').value = '';
    $('sync-password').placeholder = status.hasPassword ? 'Gespeichert · leer lassen, um beizubehalten' : 'Passwort oder App-Token eingeben';
    $('sync-calendar-target').innerHTML = state.data.calendars.map(c => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`).join('');
    if (status.calendarId) $('sync-calendar-target').value = status.calendarId;
    const label = status.enabled ? `Aktiviert (${status.provider}) · ${status.user || 'Kein Benutzer'} an ${status.url}` : 'Synchronisation deaktiviert · Rein lokaler Betrieb';
    $('settings-sync-status').textContent = label;
  } catch (error) {
    $('settings-sync-status').textContent = error.message;
  }
}
$('sync-enabled').addEventListener('change', () => {
  $('sync-fields').hidden = !$('sync-enabled').checked;
});
$('sync-provider').addEventListener('change', () => {
  const p = $('sync-provider').value;
  if (p === 'apple') $('sync-url').placeholder = 'https://caldav.icloud.com/';
  else if (p === 'nextcloud') $('sync-url').placeholder = 'https://mein-nextcloud.de/remote.php/dav/calendars/benutzer/persoenlich/';
  else $('sync-url').placeholder = 'https://caldav.beispiel.de/';
});
$('sync-settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('sync-settings-error').textContent = '';
  try {
    await call('configureSync', {
      enabled: $('sync-enabled').checked,
      provider: $('sync-provider').value,
      url: $('sync-url').value,
      user: $('sync-user').value,
      password: $('sync-password').value,
      calendarId: $('sync-calendar-target').value
    });
    $('sync-password').value = '';
    await syncStatusUI();
    toast('Synchronisations-Einstellungen gespeichert.');
  } catch (error) {
    $('sync-settings-error').textContent = error.message;
  }
});
$('sync-test-btn').addEventListener('click', async () => {
  $('sync-settings-error').textContent = '';
  $('sync-test-btn').disabled = true;
  $('sync-test-btn').textContent = 'Prüfe …';
  try {
    await call('testSync', {
      url: $('sync-url').value,
      user: $('sync-user').value,
      password: $('sync-password').value
    });
    toast('Verbindung erfolgreich hergestellt!');
  } catch (error) {
    $('sync-settings-error').textContent = 'Verbindung fehlgeschlagen: ' + error.message;
  } finally {
    $('sync-test-btn').disabled = false;
    $('sync-test-btn').textContent = 'Verbindung testen';
  }
});
$('sync-now-btn').addEventListener('click', async () => {
  $('sync-now-btn').disabled = true;
  $('sync-now-btn').textContent = 'Synchronisiere …';
  try {
    const res = await call('syncNow');
    await reload();
    toast(`Synchronisation abgeschlossen: ${res.imported} Termine abgeglichen.`);
  } catch (error) {
    toast('Sync-Fehler: ' + error.message, true);
  } finally {
    $('sync-now-btn').disabled = false;
    $('sync-now-btn').textContent = 'Jetzt synchronisieren';
  }
});
$('settings').addEventListener('click', () => { showDialog('settings-dialog'); aiStatus(); syncStatusUI(); });
$('open-draft').addEventListener('click', async () => { try { const draft = await call('openDraft'); if (draft) { $('settings-dialog').close(); openEvent(draft); $('event-id').value = ''; $('event-warning').hidden = false; $('event-warning').textContent = 'Agenten-Entwurf. Bitte alle Angaben vor dem Speichern prüfen.'; } } catch (error) { toast(error.message, true); } });
$('export').addEventListener('click', async () => { try { if (await call('export')) toast('Backup exportiert.'); } catch (error) { toast(error.message, true); } });
$('import').addEventListener('click', async () => { try { if (await call('import')) { await reload(); toast('Backup wiederhergestellt.'); } } catch (error) { toast(error.message, true); } });
$('rename-calendar').addEventListener('click', () => { $('rename-name').value = state.data.calendars.find(c => c.id === $('rename-select').value)?.name || ''; $('rename-error').textContent = ''; showDialog('rename-dialog'); });
$('rename-select').addEventListener('change', () => { $('rename-name').value = state.data.calendars.find(c => c.id === $('rename-select').value)?.name || ''; });
$('rename-form').addEventListener('submit', async event => { event.preventDefault(); try { await call('rename', $('rename-select').value, $('rename-name').value); await reload(); $('rename-dialog').close(); toast('Kalender umbenannt.'); } catch (error) { $('rename-error').textContent = error.message; } });
$('help').addEventListener('click', () => toast('N: Neuer Termin · ⌘/Strg K: Suche · Esc: Dialog schließen'));
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !document.querySelector('dialog[open]')) { event.preventDefault(); $('search').focus(); }
  if (event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { event.preventDefault(); openEvent(); }
});
function updateStaticTexts() {
  document.documentElement.lang = currentLang;
  $('lang-current').textContent = currentLang.toUpperCase();
  $('settings-lang-select').value = currentLang;
  $('brand-btn').setAttribute('aria-label', t('brandTitle'));
  $('new-event-text').textContent = currentLang === 'en' ? ' New Event ' : ' Neuer Termin ';
  $('nav-my-calendar-text').textContent = t('myCalendarNav');
  $('nav-assistant-text').textContent = t('assistantNav');
  $('privacy-title').textContent = t('privacyTitle');
  $('privacy-desc').textContent = t('privacyText');
  $('privacy-indicator').textContent = t('privacyIndicator');
  $('settings-nav-text').textContent = t('settingsNav');
  $('profile-title').textContent = t('profileRoom');
  $('topbar-breadcrumb-title').textContent = t('topbarBreadcrumb');
  $('saved-indicator-text').textContent = t('offlineReady');
  $('help').setAttribute('aria-label', t('shortcutsHelp'));
  $('heading-main-title').innerHTML = t('headingTitle').replace('.', '<span>.</span>');
  $('heading-sub-title').textContent = t('headingDesc');
  $('assistant-open').innerHTML = `${t('assistantShortcut')} <span>↗</span>`;
  $('previous').setAttribute('aria-label', t('prevPeriod'));
  $('next').setAttribute('aria-label', t('nextPeriod'));
  $('today').textContent = t('today');
  $('footer-today-dot').textContent = t('today');
  $('search').setAttribute('placeholder', t('searchPlaceholder'));
  $('search').setAttribute('aria-label', t('searchPlaceholder'));
  document.querySelector('[data-view="month"]').textContent = t('viewMonth');
  document.querySelector('[data-view="week"]').textContent = t('viewWeek');
  document.querySelector('[data-view="agenda"]').textContent = t('viewAgenda');
  $('footer-hint-text').textContent = t('clickToPlan');
  $('day-panel-eyebrow').textContent = t('dayOverviewEyebrow');
  $('focus-card-title').textContent = t('focusTitle');
  $('focus-card-desc').textContent = t('focusDesc');
  $('add-break').innerHTML = `${t('addBreak')} <span>＋</span>`;
  $('footer-quote').textContent = t('footerLeft');
  $('today-label').textContent = new Date().toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toLocaleUpperCase(currentLocale());

  // Form & dialog static texts
  $('st-eyebrow').textContent = t('workspaceLabel');
  $('st-title').textContent = t('settingsNav').replace('⚙ ', '');
  $('st-backup-title').textContent = currentLang === 'en' ? 'Back up your data' : 'Deine Daten sichern';
  $('st-backup-desc').textContent = currentLang === 'en' ? 'Export all events and calendars as a JSON file. Store your backup in a safe place.' : 'Exportiere alle Termine und Kalender als JSON-Datei. Bewahre dein Backup an einem geschützten Ort auf.';
  $('export').textContent = currentLang === 'en' ? '↓ Export backup' : '↓ Backup exportieren';
  $('import').textContent = currentLang === 'en' ? '↑ Restore backup' : '↑ Backup wiederherstellen';
  $('event-title-label').childNodes[0].textContent = t('eventTitleLabel');
  $('event-title').placeholder = t('eventTitlePlaceholder');
  $('event-start-label').childNodes[0].textContent = t('eventStartLabel');
  $('event-end-label').childNodes[0].textContent = t('eventEndLabel');
  $('event-cal-label').childNodes[0].textContent = t('eventCalendarLabel');
  $('event-all-day-text').textContent = ` ${t('eventAllDayCheck')}`;
  $('event-loc-label').childNodes[0].textContent = t('eventLocationLabel');
  $('event-location').placeholder = t('eventLocationPlaceholder');
  $('event-notes-label').childNodes[0].textContent = t('eventNotesLabel');
  $('event-notes').placeholder = t('eventNotesPlaceholder');
  $('delete-event').textContent = t('deleteEventBtn');
  $('event-cancel-btn').textContent = t('cancelBtn');
  $('save-event').textContent = t('saveBtn');
}

async function setLanguage(lang) {
  if (!['de', 'en'].includes(lang)) return;
  currentLang = lang;
  try {
    await call('configureApp', { language: lang });
  } catch {
    // If running in browser or detached mode, continue gracefully
  }
  updateStaticTexts();
  renderCalendarFilters();
  render();
  toast(t('langChanged'));
}

$('lang-toggle').addEventListener('click', () => {
  setLanguage(currentLang === 'de' ? 'en' : 'de');
});
$('settings-lang-select').addEventListener('change', e => {
  setLanguage(e.target.value);
});

// Initial boot
reload().catch(err => toast(err.message, true));
