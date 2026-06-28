/**
 * AI 智能刷题平台 — Settings Module
 * API Key 管理、服务商配置、MFAW 参数调节
 */
import { state } from '../state.js';
import { storage, STORAGE_KEYS } from '../services/storage.js';
import { aiService } from '../services/ai-service.js';
import { showToast, escapeHtml } from '../utils/helpers.js';
import { updateMFAWParams } from './quiz-engine.js';

// 内置服务商预设
export const PRESETS = [
  { provider: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] },
  { provider: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
  { provider: '硅基流动 (SiliconFlow)', baseUrl: 'https://api.siliconflow.cn/v1', models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-7B-Instruct'] },
  { provider: '阿里百炼 (Qwen)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-turbo', 'qwen-plus', 'qwen-max'] },
  { provider: '智谱 (Zhipu)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash'] },
  { provider: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b', 'mixtral-8x7b'] },
  { provider: 'Ollama (本地)', baseUrl: 'http://localhost:11434/v1', models: ['llama3', 'mistral', 'qwen2.5'] },
  { provider: '自定义', baseUrl: '', models: [] }
];

/** 获取已保存的模型列表 */
export function getModels() {
  return storage.get(STORAGE_KEYS.MODELS, []);
}

/** 保存模型列表 */
export function saveModels(models) {
  storage.set(STORAGE_KEYS.MODELS, models);
  aiService.clearCache();
}

/** 渲染设置页面 */
export function renderSettings() {
  const container = document.getElementById('settings-container');
  if (!container) return;

  const models = getModels();

  container.innerHTML = `
    <div class="settings-section">
      <h3>AI 服务商配置</h3>
      <p class="text-sm text-muted mb-4">配置 AI 服务商后，可使用 AI 自动生成题库。支持任意 OpenAI-compatible API。</p>

      <div id="model-list">
        ${models.length === 0 ? '<p class="text-muted text-sm">暂无配置，请添加模型</p>' : ''}
        ${models.map((m, i) => `
          <div class="model-card">
            <div class="model-info">
              <div class="model-name">${escapeHtml(m.provider)} / ${escapeHtml(m.model)}</div>
              <div class="model-meta">${escapeHtml(m.baseUrl)} ${m.default ? '· <span style="color:var(--primary-color)">默认</span>' : ''}</div>
            </div>
            <div class="model-actions">
              ${!m.default ? `<button class="btn-mini" data-set-default="${i}">设为默认</button>` : ''}
              <button class="btn-mini" data-test="${i}">测试连接</button>
              <button class="btn-mini danger" data-delete="${i}">删除</button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="mt-4" style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-outline" id="add-model-btn">＋ 添加模型</button>
        <button class="btn btn-outline" id="clear-models-btn" style="color:var(--error);border-color:#fecaca;">清除所有配置</button>
      </div>
    </div>

    <div id="add-model-form" class="settings-section hidden mt-4">
      <h4>添加/编辑模型</h4>
      <div class="form-group">
        <label class="form-label">服务商</label>
        <select class="form-select" id="model-preset">
          <option value="">-- 选择预设或自定义 --</option>
          ${PRESETS.map(p => `<option value="${p.provider}" data-url="${p.baseUrl}" data-models="${p.models.join(',')}">${p.provider}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">API Base URL</label>
        <input class="form-input" id="model-base-url" placeholder="https://api.example.com/v1">
      </div>
      <div class="form-group">
        <label class="form-label">模型名称</label>
        <input class="form-input" id="model-name" placeholder="gpt-4o / deepseek-chat">
      </div>
      <div class="form-group">
        <label class="form-label">API Key</label>
        <input class="form-input" id="model-api-key" type="password" placeholder="sk-...">
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="save-model-btn">保存</button>
        <button class="btn btn-outline" id="cancel-model-btn">取消</button>
      </div>
    </div>

    <div class="settings-section mt-4">
      <h3>MFAW 算法参数</h3>
      <p class="text-sm text-muted mb-4">调节加权随机刷题的四个因子权重（范围 0-1）</p>
      <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${[
          ['alpha', '表现因子 (PF) — 错误率越高，权重越大', 0.35],
          ['beta', '难度因子 (DF) — 历史错误率影响', 0.25],
          ['gamma', '稳定因子 (SF) — 连续正确降低权重', 0.25],
          ['delta', '新颖因子 (NF) — 长期未练增加权重', 0.15]
        ].map(([key, desc, val]) => `
          <div>
            <label class="form-label">${desc}</label>
            <input class="form-input mfaw-param" data-key="${key}" type="number" step="0.01" min="0" max="1" value="${val}">
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary mt-4" id="save-mfaw-btn">应用 MFAW 参数</button>
    </div>
  `;

  bindSettingsEvents();
}

function bindSettingsEvents() {
  // 添加模型
  document.getElementById('add-model-btn')?.addEventListener('click', () => {
    document.getElementById('add-model-form').classList.remove('hidden');
  });

  // 取消
  document.getElementById('cancel-model-btn')?.addEventListener('click', () => {
    document.getElementById('add-model-form').classList.add('hidden');
    clearModelForm();
  });

  // 预设选择 → 自动填充
  document.getElementById('model-preset')?.addEventListener('change', function () {
    const opt = this.selectedOptions[0];
    if (opt && opt.dataset.url) {
      document.getElementById('model-base-url').value = opt.dataset.url;
      document.getElementById('model-name').value = opt.dataset.models.split(',')[0];
    }
  });

  // 保存模型
  document.getElementById('save-model-btn')?.addEventListener('click', () => {
    const provider = document.getElementById('model-preset')?.value || '自定义';
    const baseUrl = document.getElementById('model-base-url')?.value.trim();
    const model = document.getElementById('model-name')?.value.trim();
    const apiKey = document.getElementById('model-api-key')?.value.trim();

    if (!baseUrl || !model || !apiKey) {
      showToast('请填写所有字段', 'error');
      return;
    }

    const models = getModels();
    const newModel = { provider, baseUrl, model, apiKey, default: models.length === 0 };
    models.push(newModel);
    saveModels(models);
    renderSettings();
    clearModelForm();
    document.getElementById('add-model-form').classList.add('hidden');
    showToast('模型已保存', 'success');
  });

  // 模型列表操作（事件委托）
  document.getElementById('model-list')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-test], [data-delete], [data-set-default]');
    if (!btn) return;

    const idx = parseInt(btn.dataset.test ?? btn.dataset.delete ?? btn.dataset.setDefault);
    const models = getModels();

    if (btn.dataset.test !== undefined) {
      // 测试连接
      const m = models[idx];
      showToast('正在测试连接...');
      try {
        const result = await aiService.testConnection(m);
        showToast(`连接成功！模型: ${result.model}`, 'success');
      } catch (err) {
        showToast('连接失败：' + err.message, 'error');
      }
    } else if (btn.dataset.delete !== undefined) {
      if (confirm('确定删除此模型配置？')) {
        models.splice(idx, 1);
        saveModels(models);
        renderSettings();
        showToast('已删除', 'success');
      }
    } else if (btn.dataset.setDefault !== undefined) {
      models.forEach((m, i) => m.default = (i === idx));
      saveModels(models);
      renderSettings();
      showToast('已设为默认模型', 'success');
    }
  });

  // 清除所有
  document.getElementById('clear-models-btn')?.addEventListener('click', () => {
    if (confirm('确定删除所有模型配置？')) {
      saveModels([]);
      renderSettings();
      showToast('已清除所有模型配置', 'success');
    }
  });

  // MFAW 参数
  document.getElementById('save-mfaw-btn')?.addEventListener('click', () => {
    const params = {};
    document.querySelectorAll('.mfaw-param').forEach(el => {
      params[el.dataset.key] = parseFloat(el.value) || 0;
    });
    updateMFAWParams(params);
  });
}

function clearModelForm() {
  const preset = document.getElementById('model-preset');
  if (preset) preset.value = '';
  const url = document.getElementById('model-base-url');
  if (url) url.value = '';
  const name = document.getElementById('model-name');
  if (name) name.value = '';
  const key = document.getElementById('model-api-key');
  if (key) key.value = '';
}
