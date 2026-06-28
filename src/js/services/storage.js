/**
 * AI 智能刷题平台 — Storage Service
 * localStorage 封装，含内存降级和错误处理
 */
const STORAGE_KEYS = {
  BANKS: 'ai_ia_banks',
  ACTIVE_BANK: 'ai_ia_active_bank_id',
  PROGRESS: 'ai_ia_progress',
  MODELS: 'ai_models',
  SETTINGS: 'ai_settings'
};

class StorageService {
  constructor() {
    this._mem = {};
    this._ok = this._check();
  }

  _check() {
    try { const k = '__t__'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  }

  get(key, fallback = null) {
    if (this._ok) {
      try {
        const raw = localStorage.getItem(key);
        return raw !== null ? JSON.parse(raw) : fallback;
      } catch (e) { console.warn(`Storage read failed: ${key}`, e); }
    }
    return key in this._mem ? this._mem[key] : fallback;
  }

  set(key, value) {
    if (this._ok) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { console.warn(`Storage write failed: ${key}`, e); }
    }
    this._mem[key] = value;
    return false;
  }

  remove(key) {
    if (this._ok) { try { localStorage.removeItem(key); } catch (e) {} }
    delete this._mem[key];
  }

  available() { return this._ok; }
}

export const storage = new StorageService();
export { STORAGE_KEYS };
export default storage;
