const fs = require('node:fs/promises');
const path = require('node:path');
const { configuration } = require('./assistant.cjs');
class Settings {
  constructor(directory, secureStorage, env = process.env) {
    this.queue = Promise.resolve();
    this.file = path.join(directory, 'ai-settings.json');
    this.syncFile = path.join(directory, 'sync-settings.json');
    this.secureStorage = secureStorage;
    this.env = env;
    this.saved = { provider: 'off', model: '', endpoint: '', encryptedKey: '' };
    this.savedSync = { enabled: false, provider: 'off', url: '', user: '', encryptedPassword: '', calendarId: '1' };
  }
  async load() {
    try {
      if ((await fs.stat(this.file)).size > 16384) throw new Error('KI-Einstellungen zu groß.');
      const value = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (!value || typeof value !== 'object') throw new Error('Ungültige KI-Einstellungen.');
      for (const name of ['provider', 'model', 'endpoint', 'encryptedKey']) if (typeof value[name] !== 'string') throw new Error('Ungültige KI-Einstellungen.');
      this.saved = value;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }

    try {
      if ((await fs.stat(this.syncFile)).size > 16384) throw new Error('Sync-Einstellungen zu groß.');
      const syncVal = JSON.parse(await fs.readFile(this.syncFile, 'utf8'));
      if (syncVal && typeof syncVal === 'object') {
        this.savedSync = {
          enabled: syncVal.enabled === true,
          provider: typeof syncVal.provider === 'string' ? syncVal.provider : 'off',
          url: typeof syncVal.url === 'string' ? syncVal.url : '',
          user: typeof syncVal.user === 'string' ? syncVal.user : '',
          encryptedPassword: typeof syncVal.encryptedPassword === 'string' ? syncVal.encryptedPassword : '',
          calendarId: typeof syncVal.calendarId === 'string' ? syncVal.calendarId : '1'
        };
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  fromEnvironment() { return !!(this.env.SIMHUB_AI_PROVIDER || this.env.SIMHUB_AI_MODEL || this.env.SIMHUB_OLLAMA_MODEL); }
  environment() {
    if (this.fromEnvironment()) return this.env;
    const value = this.saved;
    let key = '';
    if (value.encryptedKey) {
      if (!this.secureStorage.isEncryptionAvailable()) throw new Error('Betriebssystem-Schlüsselbund ist nicht verfügbar.');
      key = this.secureStorage.decryptString(Buffer.from(value.encryptedKey, 'base64'));
    }
    return { SIMHUB_AI_PROVIDER: value.provider, SIMHUB_AI_MODEL: value.model, SIMHUB_AI_ENDPOINT: value.endpoint || undefined, SIMHUB_AI_API_KEY: key };
  }
  status() {
    const { provider, model, endpoint } = configuration(this.environment());
    return { provider, model, endpoint: provider === 'api' ? endpoint : '', hasKey: this.fromEnvironment() ? !!this.env.SIMHUB_AI_API_KEY : !!this.saved.encryptedKey, fromEnvironment: this.fromEnvironment() };
  }
  save(input) {
    const task = this.queue.then(() => this.saveNow(input));
    this.queue = task.catch(() => {});
    return task;
  }
  async saveNow(input) {
    if (this.fromEnvironment()) throw new Error('KI wird über Umgebungsvariablen gesteuert. Entferne diese und starte die App neu, um Einstellungen hier zu ändern.');
    if (!input || typeof input !== 'object' || !['off', 'ollama', 'api'].includes(input.provider) || typeof input.model !== 'string' || typeof input.endpoint !== 'string' || typeof input.key !== 'string' || input.key.length > 4096 || input.endpoint.length > 2048) throw new Error('Ungültige KI-Einstellungen.');
    let key = input.key.trim();
    if (input.provider === 'api' && !key && this.saved.provider === 'api' && this.saved.endpoint === input.endpoint && this.saved.encryptedKey) key = this.environment().SIMHUB_AI_API_KEY;
    const { provider, model, endpoint } = configuration({ SIMHUB_AI_PROVIDER: input.provider, SIMHUB_AI_MODEL: input.model.trim(), SIMHUB_AI_ENDPOINT: input.endpoint.trim() || undefined, SIMHUB_AI_API_KEY: key });
    let encryptedKey = '';
    if (provider === 'api') {
      if (!this.secureStorage.isEncryptionAvailable() || this.secureStorage.getSelectedStorageBackend?.() === 'basic_text') throw new Error('Kein sicherer Betriebssystem-Schlüsselbund verfügbar. Bitte Umgebungsvariablen verwenden.');
      encryptedKey = this.secureStorage.encryptString(key).toString('base64');
    }
    const value = { provider, model, endpoint: provider === 'api' ? endpoint : '', encryptedKey };
    const temp = `${this.file}.tmp`;
    await fs.writeFile(temp, JSON.stringify(value), { mode: 0o600 }); await fs.rename(temp, this.file);
    this.saved = value;
    return this.status();
  }
  syncStatus() {
    return {
      enabled: this.savedSync.enabled,
      provider: this.savedSync.provider,
      url: this.savedSync.url,
      user: this.savedSync.user,
      hasPassword: !!this.savedSync.encryptedPassword,
      calendarId: this.savedSync.calendarId
    };
  }
  syncCredentials() {
    if (!this.savedSync.enabled || !this.savedSync.url) return null;
    let password = '';
    if (this.savedSync.encryptedPassword) {
      if (!this.secureStorage.isEncryptionAvailable()) throw new Error('Schlüsselbund nicht verfügbar.');
      password = this.secureStorage.decryptString(Buffer.from(this.savedSync.encryptedPassword, 'base64'));
    }
    return {
      provider: this.savedSync.provider,
      url: this.savedSync.url,
      user: this.savedSync.user,
      password,
      calendarId: this.savedSync.calendarId
    };
  }
  async saveSync(input) {
    if (!input || typeof input !== 'object') throw new Error('Ungültige Synchronisations-Einstellungen.');
    const enabled = input.enabled === true;
    const provider = ['off', 'nextcloud', 'apple', 'custom'].includes(input.provider) ? input.provider : 'off';
    const url = typeof input.url === 'string' ? input.url.trim() : '';
    const user = typeof input.user === 'string' ? input.user.trim() : '';
    const calendarId = typeof input.calendarId === 'string' ? input.calendarId.trim() : '1';
    let password = typeof input.password === 'string' ? input.password.trim() : '';

    if (enabled && (!url || (provider !== 'off' && !user))) {
      throw new Error('Für die Synchronisation werden Server-URL und Benutzername benötigt.');
    }

    let encryptedPassword = this.savedSync.encryptedPassword;
    if (password) {
      if (!this.secureStorage.isEncryptionAvailable() || this.secureStorage.getSelectedStorageBackend?.() === 'basic_text') {
        throw new Error('Sicherer Betriebssystem-Schlüsselbund für Passwortspeicherung nicht verfügbar.');
      }
      encryptedPassword = this.secureStorage.encryptString(password).toString('base64');
    } else if (!enabled) {
      encryptedPassword = '';
    }

    const value = { enabled, provider, url, user, encryptedPassword, calendarId };
    const temp = `${this.syncFile}.tmp`;
    await fs.writeFile(temp, JSON.stringify(value), { mode: 0o600 });
    await fs.rename(temp, this.syncFile);
    this.savedSync = value;
    return this.syncStatus();
  }
}
module.exports = { Settings };
