const { app, BrowserWindow, Menu, ipcMain, protocol, session, dialog, safeStorage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Store } = require('./store.cjs');
const { propose } = require('./assistant.cjs');
const { isTrustedSender } = require('./ipc-security.cjs');
const ORIGIN = 'simhub://calendar';
protocol.registerSchemesAsPrivileged([{ scheme: 'simhub', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let store, settings, mainWindow, assistantBusy = false;
if (process.env.SIMHUB_DATA_DIR) {
  if (!path.isAbsolute(process.env.SIMHUB_DATA_DIR)) throw new Error('SIMHUB_DATA_DIR muss ein absoluter Pfad sein.');
  app.setPath('userData', process.env.SIMHUB_DATA_DIR);
}
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
function createWindow() {
  mainWindow = new BrowserWindow({ width: 1440, height: 920, minWidth: 760, minHeight: 600, backgroundColor: '#f7f8fc', title: 'SimHub Calendar', icon: app.isPackaged ? path.join(process.resourcesPath, 'icon.png') : path.join(__dirname, '../resources/icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, spellcheck: false } });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.loadURL(`${ORIGIN}/index.html`);
  mainWindow.on('closed', () => { mainWindow = null; });
}
function handle(name, callback) {
  ipcMain.handle(`calendar:${name}`, async (event, ...args) => {
    try {
      if (!isTrustedSender(event, mainWindow, `${ORIGIN}/index.html`)) throw new Error('Nicht erlaubter Zugriff.');
      return { ok: true, value: await callback(...args) };
    }
    catch (error) { console.error(`calendar:${name}:`, error.message); return { ok: false, error: error.message }; }
  });
}
if (singleInstance) app.whenReady().then(async () => {
  const assets = { '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/i18n.js': ['i18n.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/brand.svg': ['brand.svg', 'image/svg+xml'] };
  protocol.handle('simhub', async request => {
    const url = new URL(request.url), asset = assets[url.pathname];
    if (url.host !== 'calendar' || !asset || request.method !== 'GET') return new Response('Not found', { status: 404 });
    return new Response(await fs.readFile(path.join(__dirname, '../ui', asset[0])), { headers: { 'Content-Type': `${asset[1]}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'" } });
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  store = new Store(app.getPath('userData'));
  await store.load();
  settings = new (require('./settings.cjs').Settings)(store.directory, safeStorage);
  await settings.load();
  handle('load', () => store.snapshot());
  handle('save', event => store.save(event));
  handle('remove', id => { if (typeof id !== 'string' || id.length > 100) throw new Error('Ungültige ID.'); return store.remove(id); });
  handle('rename', (id, name) => store.rename(id, name));
  handle('localDraft', prompt => require('./parser.cjs').parseDraft(prompt, store.snapshot().calendars));
  handle('status', () => settings.status());
  handle('configure', input => settings.save(input));
  handle('appStatus', () => settings.appStatus());
  handle('configureApp', input => settings.saveAppSettings(input));
  handle('syncStatus', () => settings.syncStatus());
  handle('configureSync', input => settings.saveSync(input));
  handle('testSync', async input => {
    const { CalDavClient } = require('./sync.cjs');
    let creds = input;
    if (!input.password) {
      const saved = settings.syncCredentials();
      if (saved) creds = { ...input, password: saved.password };
    }
    const client = new CalDavClient(creds);
    return client.testConnection();
  });
  handle('syncNow', async () => {
    const creds = settings.syncCredentials();
    if (!creds) throw new Error('Synchronisation ist nicht konfiguriert oder deaktiviert.');
    const { CalDavClient } = require('./sync.cjs');
    const client = new CalDavClient(creds);
    const remoteEvents = await client.fetchEvents(creds.calendarId, store.snapshot().calendars);
    let importedCount = 0;
    for (const event of remoteEvents) {
      await store.save(event);
      importedCount++;
    }
    return { ok: true, imported: importedCount };
  });
  handle('assistant', async prompt => {
    if (assistantBusy) throw new Error('Ein KI-Vorschlag wird bereits erstellt.');
    assistantBusy = true;
    try { return await propose(prompt, store.snapshot().calendars, { env: settings.environment() }); } finally { assistantBusy = false; }
  });
  handle('openDraft', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Agenten-Entwurf öffnen', properties: ['openFile'], filters: [{ name: 'Terminentwurf', extensions: ['json'] }] });
    if (result.canceled) return null;
    if ((await fs.stat(result.filePaths[0])).size > 16384) throw new Error('Entwurf zu groß.');
    const draft = JSON.parse(await fs.readFile(result.filePaths[0], 'utf8'));
    delete draft.id;
    return require('./model.cjs').validateEvent(draft, store.snapshot().calendars);
  });
  handle('export', async () => {
    const result = await dialog.showSaveDialog(mainWindow, { title: 'Kalender sichern', defaultPath: 'simhub-calendar-backup.json', filters: [{ name: 'Kalender-Backup', extensions: ['json'] }] });
    if (result.canceled) return false;
    await store.export(result.filePath);
    return true;
  });
  handle('import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Backup wiederherstellen', properties: ['openFile'], filters: [{ name: 'Kalender-Backup', extensions: ['json'] }] });
    if (result.canceled) return false;
    const file = result.filePaths[0];
    const { MAX_DATA_BYTES, validateData } = require('./model.cjs');
    if ((await fs.stat(file)).size > MAX_DATA_BYTES) throw new Error('Backup ist zu groß (max. 20 MB).');
    const data = validateData(JSON.parse(await fs.readFile(file, 'utf8')));
    const confirmation = await dialog.showMessageBox(mainWindow, { type: 'warning', buttons: ['Abbrechen', 'Wiederherstellen'], defaultId: 0, cancelId: 0, message: `${data.events.length} Termine wiederherstellen?`, detail: 'Der aktuelle Kalender wird ersetzt. Vorher wird automatisch eine Sicherung im Datenordner angelegt.' });
    if (confirmation.response !== 1) return false;
    await store.import(data, { backup: true });
    return true;
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { label: 'Bearbeiten', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Ansicht', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
  ]));
  if (process.platform === 'darwin' && !app.isPackaged) app.dock.setIcon(path.join(__dirname, '../resources/icon.png'));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch(error => { dialog.showErrorBox('Kalender konnte nicht starten', error.message); app.quit(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
