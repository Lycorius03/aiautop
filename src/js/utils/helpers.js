/**
 * AI 智能刷题平台 — Helpers
 * Toast 通知、剪贴板兼容、HTML 转义等通用工具
 */

/** 显示 Toast 通知 */
export function showToast(msg, type = '') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  clearTimeout(el._tid);
  el._tid = setTimeout(() => { el.classList.remove('show'); }, 2500);
}

/** 复制文本到剪贴板（兼容 file:// 协议降级） */
export function copyToClipboard(text) {
  // 首选 Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
  }
  return fallbackCopy(text);
}

function fallbackCopy(text) {
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) resolve(true);
      else reject(new Error('execCommand copy failed'));
    } catch (e) {
      reject(e);
    }
  });
}

/** HTML 转义 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** 生成唯一 ID */
export function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

/** 防抖 */
export function debounce(fn, ms = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
