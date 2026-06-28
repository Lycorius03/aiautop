/**
 * AI 智能刷题平台 — Bank Manager Module
 * 题库管理 UI：列表渲染、导入/导出、切换/删除/重命名
 */
import { state } from '../state.js';
import { storage, STORAGE_KEYS } from '../services/storage.js';
import { aiService } from '../services/ai-service.js';
import { showToast, copyToClipboard, escapeHtml, generateId } from '../utils/helpers.js';

/** JSON 格式样例模板（仅页面参考） */
export const SAMPLE_TEMPLATE = [
  {
    "id": 1,
    "type": "单选题",
    "q": "This research has attracted wide _____ coverage.",
    "options": ["message", "information", "media", "data"],
    "ans": "C",
    "exp": "media coverage 指'媒体报道'，为固定搭配。"
  },
  {
    "id": 2,
    "type": "多选题",
    "q": "Which of the following are fruits?",
    "options": ["Apple", "Carrot", "Banana", "Potato"],
    "ans": "AC",
    "exp": "Apple 和 Banana 是水果；Carrot、Potato 是蔬菜。多选题答案用字符串拼接，如 \"AC\"。"
  }
];

/** 渲染题库列表 */
export function renderBankList() {
  const container = document.getElementById('bank-list-container');
  if (!container) return;

  if (state.banks.length === 0) {
    container.innerHTML = `<div class="text-center" style="padding:2rem;color:var(--text-light);">
      <p>📭 暂无题库</p>
      <p class="text-sm">导入本地 JSON 题库文件、粘贴 JSON 文本、或用 AI 生成题库</p>
    </div>`;
    return;
  }

  container.innerHTML = state.banks.map(bank => {
    const isActive = bank.id === state.activeBankId;
    return `
      <div class="bank-item ${isActive ? 'active-bank' : ''}">
        <div class="bank-info">
          <span class="bank-name">${escapeHtml(bank.name)}</span>
          <span class="bank-count">${bank.questions.length} 题</span>
          ${isActive ? '<span class="bank-active-tag">当前使用</span>' : ''}
        </div>
        <div class="bank-actions">
          ${!isActive ? `<button class="btn-mini" data-action="switch" data-id="${bank.id}">切换</button>` : ''}
          <button class="btn-mini" data-action="export" data-id="${bank.id}">导出</button>
          <button class="btn-mini" data-action="rename" data-id="${bank.id}">重命名</button>
          <button class="btn-mini danger" data-action="delete" data-id="${bank.id}">删除</button>
        </div>
      </div>`;
  }).join('');

  // 事件委托
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'switch') switchToBank(id);
      else if (action === 'export') exportBank(id);
      else if (action === 'rename') renameBank(id);
      else if (action === 'delete') removeBank(id);
    });
  });
}

/** 渲染 JSON 模板 */
export function renderTemplate() {
  const el = document.getElementById('template-code');
  if (el) el.textContent = JSON.stringify(SAMPLE_TEMPLATE, null, 2);
}

/** 复制模板 */
export async function copyTemplate() {
  try {
    await copyToClipboard(JSON.stringify(SAMPLE_TEMPLATE, null, 2));
    showToast('模板已复制到剪贴板', 'success');
  } catch (e) {
    showToast('复制失败，请手动选择复制', 'error');
  }
}

/** 导入题库（JSON 文件） */
export function importBankFile() {
  const input = document.getElementById('importFile');
  if (input) input.click();
}

export function handleFileImport(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      processImportData(data, file.name);
    } catch (err) {
      showToast('文件解析失败：' + err.message, 'error');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

/** 导入题库（粘贴 JSON 文本） */
export function importBankFromText(jsonText, defaultName) {
  try {
    const data = JSON.parse(jsonText);
    processImportData(data, defaultName || '手动导入');
  } catch (err) {
    showToast('JSON 格式错误：' + err.message, 'error');
  }
}

/** 统一处理导入数据 */
function processImportData(data, sourceName) {
  // 识别题库数组
  if (Array.isArray(data) && data.length > 0 && data[0].q && data[0].options) {
    const name = prompt('请输入题库名称：', sourceName.replace(/\.json$/i, '')) || sourceName;
    if (!name.trim()) return;
    const bank = state.addBank(name.trim(), data);
    autoTagBank(bank);
    renderBankList();
    updateUIAfterBankChange();
    showToast(`题库"${name.trim()}"导入成功！(${data.length}题)`, 'success');
  }
  // 识别完整备份 (v2)
  else if (data.version === 2 && data.banks) {
    importBackup(data);
  }
  // 识别旧版进度
  else if (data.done && data.mistakes && !data.banks) {
    if (state.activeBankId) {
      if (confirm('识别到旧版学习进度，是否覆盖当前题库的进度？')) {
        state.progress = data;
        state.saveProgress();
        showToast('学习进度导入成功！', 'success');
      }
    } else {
      showToast('请先导入或创建一个题库', 'error');
    }
  }
  else {
    showToast('无法识别的文件格式，请检查 JSON 结构', 'error');
  }
}

function importBackup(data) {
  if (!confirm(`识别到完整数据备份：${data.banks.length} 个题库。是否导入？\n\n（将合并到现有题库，同名覆盖）`)) return;

  data.banks.forEach(b => {
    const existingIdx = state.banks.findIndex(x => x.id === b.id);
    if (existingIdx >= 0) {
      state.banks[existingIdx] = b;
    } else {
      state.banks.push(b);
    }
  });
  state.saveBanks();

  if (data.progress) {
    const allP = storage.get(STORAGE_KEYS.PROGRESS, {});
    Object.entries(data.progress).forEach(([bid, p]) => { allP[bid] = p; });
    storage.set(STORAGE_KEYS.PROGRESS, allP);
  }

  if (data.activeBankId && state.banks.some(b => b.id === data.activeBankId)) {
    state.switchBank(data.activeBankId);
  } else if (state.banks.length > 0 && !state.activeBankId) {
    state.switchBank(state.banks[0].id);
  }

  renderBankList();
  updateUIAfterBankChange();
  showToast('数据备份导入成功！', 'success');
}

/** AI 生成题库 */
export async function aiGenerateQuiz() {
  const text = document.getElementById('ai-input-text')?.value?.trim();
  if (!text) { showToast('请粘贴要生成题库的文本内容', 'error'); return; }

  const btn = document.getElementById('ai-generate-btn');
  btn.disabled = true;
  btn.textContent = 'AI 生成中...';

  try {
    const result = await aiService.convertToQuiz(text, '手动输入');
    if (result.questions && result.questions.length > 0) {
      const name = prompt('请输入生成的题库名称：', 'AI生成题库') || 'AI生成题库';
      const bank = state.addBank(name.trim(), result.questions);
      autoTagBank(bank);
      renderBankList();
      updateUIAfterBankChange();
      showToast(`AI 已生成 ${result.questions.length} 道题目！`, 'success');
    }
  } catch (err) {
    showToast('AI 生成失败：' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🤖 AI 生成题库';
  }
}

/** 自动标签（基于内容分类） */
function autoTagBank(bank) {
  const keywords = {
    "人工智能": ["人工智能", "AI", "图灵", "神经网络", "深度学习", "机器学习", "Transformer"],
    "英语词汇": ["adj", "adv", "v.", "n.", "翻译", "本题考查", "解析"],
    "编程": ["代码", "函数", "变量", "数组", "对象", "API"]
  };
  bank.questions.forEach(q => {
    if (!q.category || q.category === "其他") {
      q.category = "其他";
      for (const [cat, kws] of Object.entries(keywords)) {
        if (kws.some(k => (q.q || '').includes(k) || (q.exp || '').includes(k))) {
          q.category = cat; break;
        }
      }
    }
  });
}

function switchToBank(id) {
  state.switchBank(id);
  renderBankList();
  updateUIAfterBankChange();
}

function exportBank(id) {
  const bank = state.banks.find(b => b.id === id);
  if (!bank) return;
  const blob = new Blob([JSON.stringify(bank.questions, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${bank.name}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function renameBank(id) {
  const bank = state.banks.find(b => b.id === id);
  if (!bank) return;
  const name = prompt('新名称：', bank.name);
  if (name && name.trim()) {
    bank.name = name.trim();
    state.saveBanks();
    renderBankList();
    updateUIAfterBankChange();
  }
}

function removeBank(id) {
  const bank = state.banks.find(b => b.id === id);
  if (!bank) return;
  if (!confirm(`确定删除"${bank.name}"（${bank.questions.length}题）？\n该题库的学习进度也将被清除。`)) return;
  if (state.deleteBank(id)) {
    renderBankList();
    updateUIAfterBankChange();
    showToast(`已删除"${bank.name}"`, 'success');
  }
}

export function deleteAllBanks() {
  if (state.banks.length === 0) { showToast('没有可删除的题库', 'error'); return; }
  if (!confirm(`确定删除全部 ${state.banks.length} 个题库？此操作不可撤销！`)) return;
  state.banks = [];
  state.activeBankId = null;
  state.questionBank = [];
  state.progress = state._emptyProgress();
  storage.remove(STORAGE_KEYS.BANKS);
  storage.remove(STORAGE_KEYS.ACTIVE_BANK);
  storage.remove(STORAGE_KEYS.PROGRESS);
  renderBankList();
  updateUIAfterBankChange();
  showToast('已清除所有题库', 'success');
}

export function exportFullBackup() {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    banks: state.banks,
    activeBankId: state.activeBankId,
    progress: storage.get(STORAGE_KEYS.PROGRESS, {})
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ai_study_full_backup.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function updateUIAfterBankChange() {
  const badge = document.getElementById('header-bank-name');
  const bank = state.getActiveBank();
  if (badge) {
    badge.textContent = bank ? bank.name : '未选择题库';
    badge.title = bank ? `${bank.name}（${bank.questions.length}题）` : '';
  }
  // 触发自定义事件，通知其他模块
  document.dispatchEvent(new CustomEvent('bank-changed'));
}
