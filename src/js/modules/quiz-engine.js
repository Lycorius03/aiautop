/**
 * AI 智能刷题平台 — Quiz Engine Module
 * 核心刷题逻辑：顺序、随机、MFAW加权、错题本
 */
import { state } from '../state.js';
import { MFAW } from '../utils/mfaw.js';
import { showToast } from '../utils/helpers.js';

const mfaw = new MFAW(state.settings.mfaw || {});

/** 切换刷题模式 */
export function switchMode(mode) {
  if (mode !== 'home' && mode !== 'settings' && state.questionBank.length === 0) {
    showToast('请先导入或选择题库！', 'error');
    navigateTo('home');
    return;
  }

  state.mode = mode;

  // 更新导航按钮
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const targetBtn = document.querySelector(`[data-mode="${mode}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  // 视图切换
  document.getElementById('home-view')?.classList.add('hidden');
  document.getElementById('practice-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  document.getElementById('settings-view')?.classList.add('hidden');
  const jumpBox = document.getElementById('jump-container');
  if (jumpBox) jumpBox.style.display = 'none';

  if (mode === 'home') {
    document.getElementById('home-view')?.classList.remove('hidden');
  } else if (mode === 'settings') {
    document.getElementById('settings-view')?.classList.remove('hidden');
  } else if (mode === 'exam') {
    // handled by exam-mode
  } else {
    document.getElementById('practice-view')?.classList.remove('hidden');
    resetCardUI();

    if (mode === 'random') {
      state.currentQIndex = Math.floor(Math.random() * state.questionBank.length);
    } else if (mode === 'weighted') {
      state.currentQIndex = pickWeightedIndex();
    } else if (mode === 'sequential') {
      let idx = state.progress.lastSequenceIndex || 0;
      if (idx >= state.questionBank.length) idx = 0;
      state.currentQIndex = idx;
      if (jumpBox) jumpBox.style.display = 'flex';
    } else if (mode === 'mistakes') {
      if (state.progress.mistakes.length === 0) {
        showToast('错题本为空，快去刷题吧！', 'error');
        navigateTo('home');
        return;
      }
      state.currentQIndex = 0;
    }
    loadQuestion();
  }
  document.dispatchEvent(new CustomEvent('mode-changed', { detail: { mode } }));
}

/** 程序化导航 */
export function navigateTo(mode) {
  switchMode(mode);
  // 强制点亮对应导航按钮
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-mode="${mode}"]`);
  if (btn) btn.classList.add('active');
}

/** MFAW 加权随机选題 */
function pickWeightedIndex() {
  const qs = state.questionBank;
  if (qs.length === 0) return 0;
  const now = Date.now();
  const pw = state.progress;  // 使用题目的 per-question stats，从 progress 或新建

  // 初始化 per-q stats 存储
  if (!pw._qstats) pw._qstats = {};

  const weights = qs.map((q, i) => {
    const stats = pw._qstats[q.id] || { totalAttempts: 0, wrongCount: 0, streak: 0, ema: 0.5 };
    return { i, w: mfaw.calculateWeight(stats, now) };
  });

  // Alias Method 简化：按权重排序后概率采样
  const totalW = weights.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * totalW;
  for (const { i, w } of weights) {
    r -= w;
    if (r <= 0) return i;
  }
  return weights[weights.length - 1].i;
}

/** 加载当前题目 */
export function loadQuestion() {
  let q;
  if (state.mode === 'mistakes') {
    const id = state.progress.mistakes[state.currentQIndex];
    q = state.questionBank.find(item => item.id === id);
    if (!q) {
      state.progress.mistakes.splice(state.currentQIndex, 1);
      state.saveProgress();
      if (state.progress.mistakes.length === 0) {
        showToast('错题本已清空！');
        navigateTo('home');
        return;
      }
      state.currentQIndex = Math.min(state.currentQIndex, state.progress.mistakes.length - 1);
      loadQuestion();
      return;
    }
  } else {
    q = state.questionBank[state.currentQIndex];
  }
  if (!q) return;

  document.getElementById('q-type').innerText = q.type || '单选题';
  document.getElementById('q-cat').innerText = q.category || '未分类';

  let badgeText = `#${q.id}`;
  if (state.mode === 'sequential') {
    badgeText += ` (第 ${state.currentQIndex + 1} / ${state.questionBank.length} 题)`;
    const ji = document.getElementById('jump-input');
    if (ji) ji.value = state.currentQIndex + 1;
  } else if (state.mode === 'mistakes') {
    badgeText += ` (错题 ${state.currentQIndex + 1} / ${state.progress.mistakes.length})`;
  } else if (state.mode === 'weighted') {
    badgeText += ' (加权随机)';
  } else {
    badgeText += ' (随机)';
  }
  document.getElementById('q-index-badge').innerText = badgeText;
  document.getElementById('q-content').innerText = q.q;

  const favBtn = document.getElementById('fav-btn');
  if (favBtn) {
    favBtn.className = state.progress.favorites.includes(q.id) ? 'icon-btn active' : 'icon-btn';
  }

  const optsContainer = document.getElementById('options-area');
  optsContainer.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    const letter = String.fromCharCode(65 + idx);
    btn.innerHTML = `<span style="font-weight:bold;margin-right:10px;">${letter}. <span class="kbd-hint">${idx + 1}</span></span> ${opt}`;
    btn.dataset.letter = letter;
    btn.addEventListener('click', () => checkAnswer(q, letter, btn));
    optsContainer.appendChild(btn);
  });

  const expBox = document.getElementById('explanation-area');
  if (expBox) expBox.classList.remove('visible');
  document.getElementById('exp-text').innerText = q.exp || '暂无详细解析。';
}

/** 判分 */
function checkAnswer(q, userVal, btnElement) {
  const isMulti = q.type === '多选题';
  if (isMulti) {
    btnElement.classList.toggle('selected');
    if (!document.getElementById('multi-submit-btn')) {
      const submitBtn = document.createElement('button');
      submitBtn.id = 'multi-submit-btn';
      submitBtn.className = 'btn btn-primary';
      submitBtn.style.marginTop = '1rem';
      submitBtn.textContent = '提交多选答案';
      submitBtn.addEventListener('click', () => {
        const selected = Array.from(document.querySelectorAll('.option-btn.selected'))
          .map(b => b.dataset.letter);
        finalizeAnswer(q, selected.sort());
        submitBtn.remove();
      });
      document.getElementById('options-area').after(submitBtn);
    }
  } else {
    finalizeAnswer(q, [userVal]);
  }
}

function finalizeAnswer(q, userArr) {
  const btns = document.querySelectorAll('.option-btn');
  let correctArr = Array.isArray(q.ans) ? [...q.ans] : (q.ans || '').split('');
  if (typeof q.ans === 'string' && q.ans.length === 1) correctArr = [q.ans];

  const userStr = userArr.sort().join('');
  const correctStr = correctArr.sort().join('');
  const isCorrect = userStr === correctStr;

  btns.forEach(btn => {
    btn.disabled = true;
    const letter = btn.dataset.letter;
    if (correctArr.includes(letter)) btn.classList.add('correct');
    if (userArr.includes(letter) && !correctArr.includes(letter)) btn.classList.add('wrong');
  });

  document.getElementById('explanation-area')?.classList.add('visible');

  // 更新进度
  if (!state.progress.done.includes(q.id)) {
    state.progress.done.push(q.id);
    state.progress.totalAttempted++;
    if (isCorrect) state.progress.correctCount++;
  }

  const mIdx = state.progress.mistakes.indexOf(q.id);
  if (!isCorrect && mIdx === -1) {
    state.progress.mistakes.push(q.id);
  } else if (isCorrect && mIdx !== -1) {
    state.progress.mistakes.splice(mIdx, 1);
  }

  // MFAW per-q stats
  if (!state.progress._qstats) state.progress._qstats = {};
  state.progress._qstats[q.id] = mfaw.updateStats(
    state.progress._qstats[q.id] || { totalAttempts: 0, wrongCount: 0, streak: 0, ema: 0.5 },
    isCorrect
  );

  state.saveProgress();
  updateStatsUI();
}

/** 键盘支持 */
export function handleKeyboard(e) {
  if (['home', 'settings'].includes(state.mode)) return;
  if (e.target.tagName === 'INPUT') return;

  const key = e.key;
  if (['1', '2', '3', '4'].includes(key)) {
    const idx = parseInt(key) - 1;
    const btns = document.querySelectorAll('.option-btn:not([disabled])');
    if (btns[idx]) btns[idx].click();
  } else if (key === 'ArrowRight' || key === 'n') {
    e.preventDefault();
    nextQuestion();
  } else if (key === 'ArrowLeft' || key === 'p') {
    e.preventDefault();
    prevQuestion();
  } else if (key === 'ArrowUp') {
    scrollToTop();
  }
}

/** 导航 */
export function nextQuestion() {
  const qlen = state.mode === 'mistakes' ? state.progress.mistakes.length : state.questionBank.length;
  if (qlen === 0) { navigateTo('home'); return; }

  if (state.mode === 'random') {
    state.currentQIndex = Math.floor(Math.random() * state.questionBank.length);
  } else if (state.mode === 'weighted') {
    state.currentQIndex = pickWeightedIndex();
  } else if (state.mode === 'sequential') {
    state.currentQIndex = (state.currentQIndex + 1) % qlen;
    state.progress.lastSequenceIndex = state.currentQIndex;
    state.saveProgress();
  } else if (state.mode === 'mistakes') {
    state.currentQIndex = (state.currentQIndex + 1) % qlen;
  }
  resetCardUI();
  loadQuestion();
}

export function prevQuestion() {
  const qlen = state.mode === 'mistakes' ? state.progress.mistakes.length : state.questionBank.length;
  if (qlen === 0) { navigateTo('home'); return; }

  if (state.mode === 'random' || state.mode === 'weighted') {
    state.currentQIndex = Math.floor(Math.random() * state.questionBank.length);
  } else {
    state.currentQIndex = state.currentQIndex > 0 ? state.currentQIndex - 1 : qlen - 1;
    if (state.mode === 'sequential') {
      state.progress.lastSequenceIndex = state.currentQIndex;
      state.saveProgress();
    }
  }
  resetCardUI();
  loadQuestion();
}

export function jumpToQuestion() {
  const val = parseInt(document.getElementById('jump-input')?.value);
  if (isNaN(val) || val < 1 || val > state.questionBank.length) {
    showToast(`请输入 1 到 ${state.questionBank.length} 之间的数字`, 'error');
    return;
  }
  state.currentQIndex = val - 1;
  state.progress.lastSequenceIndex = state.currentQIndex;
  state.saveProgress();
  resetCardUI();
  loadQuestion();
}

export function toggleFavorite() {
  let q;
  if (state.mode === 'mistakes') {
    const id = state.progress.mistakes[state.currentQIndex];
    q = state.questionBank.find(i => i.id === id);
  } else {
    q = state.questionBank[state.currentQIndex];
  }
  if (!q) return;

  const idx = state.progress.favorites.indexOf(q.id);
  const favBtn = document.getElementById('fav-btn');
  if (idx === -1) {
    state.progress.favorites.push(q.id);
    if (favBtn) favBtn.classList.add('active');
  } else {
    state.progress.favorites.splice(idx, 1);
    if (favBtn) favBtn.classList.remove('active');
  }
  state.saveProgress();
}

export function clearProgress() {
  if (!confirm('确定要清空当前题库的刷题记录吗？（不删除题库）')) return;
  state.progress = state._emptyProgress();
  state.currentQIndex = 0;
  state.saveProgress();
  if (state.mode !== 'home') loadQuestion();
  updateStatsUI();
}

function resetCardUI() {
  document.getElementById('explanation-area')?.classList.remove('visible');
  const subBtn = document.getElementById('multi-submit-btn');
  if (subBtn) subBtn.remove();
}

function scrollToTop() {
  document.querySelector('.question-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** 更新统计栏 */
export function updateStatsUI() {
  const qBank = state.questionBank;
  const p = state.progress;
  document.getElementById('total-questions-count').innerText = qBank.length;
  document.getElementById('user-done-count').innerText = p.done.length;
  const rate = p.totalAttempted === 0 ? 0 : Math.round((p.correctCount / p.totalAttempted) * 100);
  document.getElementById('user-correct-rate').innerText = `${rate}%`;
  document.getElementById('user-mistake-count').innerText = p.mistakes.length;

  // 更新导航按钮可用性
  document.querySelectorAll('.nav-btn[data-mode]').forEach(btn => {
    const m = btn.dataset.mode;
    btn.disabled = (m !== 'home' && m !== 'settings' && qBank.length === 0);
  });

  // 更新头部题库名
  const badge = document.getElementById('header-bank-name');
  const bank = state.getActiveBank();
  if (badge) {
    badge.textContent = bank ? bank.name : '未选择题库';
  }
}

/** MFAW 参数设置 */
export function updateMFAWParams(params) {
  Object.assign(mfaw, params);
  state.updateSettings({ mfaw: params });
  showToast('MFAW 算法参数已更新', 'success');
}
