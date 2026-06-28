/**
 * AI 智能刷题平台 — App Entry Point
 * 初始化、事件绑定、全局键盘支持
 */
import { state } from './state.js';
import {
  renderBankList, renderTemplate, renderPrompt, copyTemplate, copyPrompt,
  importBankFile, handleFileImport, importBankFromText, aiGenerateQuiz,
  deleteAllBanks, exportFullBackup
} from './modules/bank-manager.js';
import { switchMode, navigateTo, loadQuestion, nextQuestion, prevQuestion, jumpToQuestion,
         toggleFavorite, clearProgress, updateStatsUI, handleKeyboard } from './modules/quiz-engine.js';
import { startExam, nextExamQ, prevExamQ, markForReview, closeExamModal, submitExam } from './modules/exam-mode.js';
import { renderSettings } from './modules/settings.js';
import { showToast } from './utils/helpers.js';

/** 初始化 */
async function init() {
  state.init();
  renderTemplate();
  renderPrompt();
  renderBankList();
  updateStatsUI();

  // 全局事件绑定
  bindGlobalEvents();
  bindHeaderEvents();

  // 键盘支持
  document.addEventListener('keydown', handleKeyboard);

  // 题库变更时更新 UI
  document.addEventListener('bank-changed', updateStatsUI);
  document.addEventListener('mode-changed', updateStatsUI);

  // 如果无题库，留在首页；否则可切刷题
  if (state.questionBank.length === 0 && state.mode !== 'home') {
    navigateTo('home');
  }
}

/** 全局事件（非模块内联绑定） */
function bindGlobalEvents() {
  // 导入题库按钮（头部和首页两个）
  document.querySelectorAll('#import-btn, #import-btn2').forEach(b =>
    b.addEventListener('click', importBankFile)
  );

  // 粘贴导入
  document.getElementById('paste-import-btn')?.addEventListener('click', () => {
    const text = prompt('请粘贴 JSON 题库内容：');
    if (text && text.trim()) importBankFromText(text.trim());
  });

  // AI 生成（先展开输入区，再点生成）
  const aiGenBtn = document.getElementById('ai-generate-btn');
  const aiInputArea = document.getElementById('ai-input-area');
  if (aiGenBtn && aiInputArea) {
    aiGenBtn.addEventListener('click', () => {
      if (aiInputArea.classList.contains('hidden')) {
        aiInputArea.classList.remove('hidden');
        aiGenBtn.textContent = '开始 AI 生成';
      } else {
        aiGenerateQuiz();
        aiInputArea.classList.add('hidden');
        aiGenBtn.textContent = 'AI 生成题库';
      }
    });
  }

  // 复制模板 & 提示词
  document.getElementById('copy-template-btn')?.addEventListener('click', copyTemplate);
  document.getElementById('copy-prompt-btn')?.addEventListener('click', copyPrompt);

  // 删除所有题库
  const delAllBtn = document.getElementById('delete-all-btn');
  if (delAllBtn) delAllBtn.addEventListener('click', deleteAllBanks);

  // 导出备份
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportFullBackup);

  // 文件导入隐藏 input
  const fileInput = document.getElementById('importFile');
  if (fileInput) fileInput.addEventListener('change', () => handleFileImport(fileInput));

  // 关闭考试弹窗
  const closeExamBtn = document.getElementById('close-exam-btn');
  if (closeExamBtn) closeExamBtn.addEventListener('click', closeExamModal);
}

/** 头部导航事件 */
function bindHeaderEvents() {
  document.querySelectorAll('.nav-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === 'exam') {
        startExam();
      } else if (mode === 'settings') {
        renderSettings();
        switchMode('settings');
      } else {
        switchMode(mode);
      }
    });
  });

  // 收藏按钮
  document.getElementById('fav-btn')?.addEventListener('click', toggleFavorite);

  // 重置进度
  document.getElementById('clear-progress-btn')?.addEventListener('click', clearProgress);

  // 跳转
  document.getElementById('jump-go-btn')?.addEventListener('click', jumpToQuestion);

  // 题目导航
  document.getElementById('next-btn')?.addEventListener('click', nextQuestion);
  document.getElementById('prev-btn')?.addEventListener('click', prevQuestion);

  // 考试导航
  document.getElementById('next-exam-btn')?.addEventListener('click', nextExamQ);
  document.getElementById('prev-exam-btn')?.addEventListener('click', prevExamQ);
  document.getElementById('mark-review-btn')?.addEventListener('click', markForReview);
  document.getElementById('submit-exam-btn')?.addEventListener('click', submitExam);
}

// 启动
init().catch(err => {
  console.error('App init failed:', err);
  document.body.innerHTML += `<div style="position:fixed;top:0;left:0;right:0;background:var(--error);color:white;padding:12px;z-index:99999;text-align:center;">
    启动失败：${err.message}。请刷新页面或检查浏览器控制台。</div>`;
});

// 暴露给全局（调试 + HTML onclick 兼容）
window.App = {
  switchMode, navigateTo, nextQuestion, prevQuestion, jumpToQuestion,
  toggleFavorite, clearProgress, startExam, nextExamQ, prevExamQ,
  markForReview, closeExamModal, importBankFile, aiGenerateQuiz,
  copyTemplate, deleteAllBanks, exportFullBackup
};
