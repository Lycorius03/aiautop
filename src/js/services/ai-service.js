/**
 * AI 智能刷题平台 — AI Service (Frontend)
 * 与后端 AI 代理通信，支持用户配置的多服务商
 */
import { storage, STORAGE_KEYS } from './storage.js';

export class AIService {
  constructor() {
    this._providerConfig = null;
  }

  /** 获取用户配置的活跃服务商 */
  getProviderConfig() {
    if (this._providerConfig) return this._providerConfig;

    const models = storage.get(STORAGE_KEYS.MODELS, []);
    const active = models.find(m => m.default) || models[0];
    if (!active || !active.apiKey) return null;

    this._providerConfig = {
      apiKey: active.apiKey,
      baseUrl: (active.baseUrl || '').replace(/\/+$/, ''),
      model: active.model,
      provider: active.provider
    };
    return this._providerConfig;
  }

  /** 清除缓存（模型配置变更后调用） */
  clearCache() { this._providerConfig = null; }

  /** 测试服务商连接 */
  async testConnection(config) {
    const resp = await fetch('/api/ai/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerConfig: config })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || '连接测试失败');
    }
    return resp.json();
  }

  /** AI 将文本转换为题库 */
  async convertToQuiz(text, filename) {
    const providerConfig = this.getProviderConfig();
    if (!providerConfig) throw new Error('请先在设置中配置 AI 服务商和 API Key');

    const resp = await fetch('/api/ai/convert-to-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, filename, providerConfig })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'AI 转换失败');
    }
    return resp.json();
  }
}

export const aiService = new AIService();
export default aiService;
