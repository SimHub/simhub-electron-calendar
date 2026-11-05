const fs = require('node:fs/promises');
const path = require('node:path');
const { configuration } = require('./assistant.cjs');
class Settings {
  constructor(directory, secureStorage, env = process.env) { this.queue = Promise.resolve(); this.file = path.join(directory, 'ai-settings.json'); this.secureStorage = secureStorage; this.env = env; this.saved = { provider: 'off', model: '', endpoint: '', encryptedKey: '' }; }
  async load() {
    try {
      if ((await fs.stat(this.file)).size > 16384) throw new Error('KI-Einstellungen zu groß.');
      const value = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (!value || typeof value !== 'object') throw new Error('Ungültige KI-Einstellungen.');
      for (const name of ['provider', 'model', 'endpoint', 'encryptedKey']) if (typeof value[name] !== 'string') throw new Error('Ungültige KI-Einstellungen.');
      this.saved = value;
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
}
module.exports = { Settings };
