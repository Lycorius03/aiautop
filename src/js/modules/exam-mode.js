/**
 * AI 智能刷题平台 — Exam Mode Module
 * 模拟考试：限时、计分、答题卡
 */
import { state } from '../state.js';
import { navigateTo, loadQuestion } from './quiz-engine.js';
import { showToast } from '../utils/helpers.js';

/** 启动考试 */
export function startExam() {
  if (state.questionBank.length === 0) {
    showToast('请先导入或选择题库！', 'error');
    return;
  }
  if (!confirm(`即将开始考试：40道题，限时60分钟，满分1000分，600分及格。\n\n当前题库：${state.questionBank.length}题。确定开始？`)) return;

  // 组卷
  let examSet = [];
  const usedIds = new Set();
  const cats = ["人工智能概览", "机器学习概览", "深度学习和大模型", "人工智能开发框架", "华为人工智能平台", "应用场景"];
  const quota = [4, 8, 10, 8, 8, 2];

  cats.forEach((cat, i) => {
    const pool = state.questionBank.filter(q => q.category === cat);
    const n = Math.min(quota[i] || 0, pool.length);
    const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, n);
    shuffled.forEach(q => { examSet.push(q); usedIds.add(q.id); });
  });

  const remaining = 40 - examSet.length;
  if (remaining > 0) {
    const rest = state.questionBank.filter(q => !usedIds.has(q.id));
    examSet = examSet.concat(rest.sort(() => 0.5 - Math.random()).slice(0, remaining));
  }

  state.examQuestions = examSet.sort(() => 0.5 - Math.random());
  state.examAnswers = {};
  state.currentQIndex = 0;
  state.mode = 'exam';

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('home-view')?.classList.add('hidden');
  document.getElementById('practice-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.remove('hidden');

  renderExamPalette();
  loadExamQuestion();
  startTimer();
}

function startTimer() {
  let seconds = 60 * 60;
  const timerEl = document.getElementById('exam-timer');
  if (state.examTimer) clearInterval(state.examTimer);

  state.examTimer = setInterval(() => {
    seconds--;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    timerEl.innerText = `${m}:${s}`;
    if (seconds <= 0) { clearInterval(state.examTimer); submitExam(); }
  }, 1000);
}

function renderExamPalette() {
  const p = document.getElementById('exam-palette');
  p.innerHTML = '';
  state.examQuestions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'palette-item';
    item.innerText = idx + 1;
    item.id = `pal-${idx}`;
    item.addEventListener('click', () => { state.currentQIndex = idx; loadExamQuestion(); });
    p.appendChild(item);
  });
}

function loadExamQuestion() {
  const q = state.examQuestions[state.currentQIndex];
  document.getElementById('exam-q-type').innerText = q.type || '单选题';
  document.getElementById('exam-q-cat').innerText = q.category || '综合';
  document.getElementById('exam-q-content').innerText = `${state.currentQIndex + 1}. ${q.q}`;

  document.querySelectorAll('.palette-item').forEach(el => el.classList.remove('current'));
  const pi = document.getElementById(`pal-${state.currentQIndex}`);
  if (pi) pi.classList.add('current');

  const container = document.getElementById('exam-options-area');
  container.innerHTML = '';
  const savedAns = state.examAnswers[q.id] || [];

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    const letter = String.fromCharCode(65 + idx);
    btn.innerHTML = `<span style="font-weight:bold;">${letter}.</span> ${opt}`;
    btn.dataset.letter = letter;
    if (savedAns.includes(letter)) btn.classList.add('selected');
    btn.addEventListener('click', () => handleExamSelect(q, letter, btn));
    container.appendChild(btn);
  });
}

function handleExamSelect(q, letter, btn) {
  const isMulti = q.type === '多选题';
  let currentAns = state.examAnswers[q.id] || [];

  if (isMulti) {
    if (currentAns.includes(letter)) {
      currentAns = currentAns.filter(l => l !== letter);
      btn.classList.remove('selected');
    } else {
      currentAns.push(letter);
      btn.classList.add('selected');
    }
  } else {
    currentAns = [letter];
    Array.from(btn.parentNode.children).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }

  state.examAnswers[q.id] = currentAns;
  const pi = document.getElementById(`pal-${state.currentQIndex}`);
  if (pi) {
    pi.classList.toggle('answered', currentAns.length > 0);
  }
}

export function nextExamQ() {
  if (state.currentQIndex < state.examQuestions.length - 1) {
    state.currentQIndex++;
    loadExamQuestion();
  }
}

export function prevExamQ() {
  if (state.currentQIndex > 0) {
    state.currentQIndex--;
    loadExamQuestion();
  }
}

export function markForReview() {
  const pi = document.getElementById(`pal-${state.currentQIndex}`);
  if (pi) pi.classList.toggle('review');
}

export function submitExam() {
  if (state.mode !== 'exam') return;
  clearInterval(state.examTimer);
  let score = 0;
  const wrongList = [];
  const perQ = 1000 / 40;

  state.examQuestions.forEach((q, idx) => {
    const userAns = (state.examAnswers[q.id] || []).sort().join('');
    let correctArr = Array.isArray(q.ans) ? [...q.ans] : (q.ans || '').split('');
    const correctStr = correctArr.sort().join('');

    if (userAns === correctStr) {
      score += perQ;
    } else {
      wrongList.push({ idx: idx + 1, q, user: userAns, correct: correctStr });
      if (!state.progress.mistakes.includes(q.id)) {
        state.progress.mistakes.push(q.id);
      }
    }
  });
  state.saveProgress();

  // 显示结果
  const modal = document.getElementById('result-modal');
  document.getElementById('final-score').innerText = Math.round(score);
  const status = document.getElementById('pass-status');
  if (score >= 600) {
    status.innerText = '恭喜通过！';
    status.style.color = 'var(--success)';
  } else {
    status.innerText = '未通过，继续努力';
    status.style.color = 'var(--error)';
  }

  const ul = document.getElementById('wrong-list');
  ul.innerHTML = wrongList.length === 0
    ? '<li>太棒了！全对！</li>'
    : wrongList.map(w => `<li>第${w.idx}题 - 你的: ${w.user || '未做'} / 正确: ${w.correct} <button class="btn-mini" data-review="${w.q.id}">查看</button></li>`).join('');

  // 绑定查看按钮
  ul.querySelectorAll('[data-review]').forEach(btn => {
    btn.addEventListener('click', () => viewWrongDetail(parseInt(btn.dataset.review)));
  });

  modal.style.display = 'flex';
}

export function closeExamModal() {
  document.getElementById('result-modal').style.display = 'none';
  navigateTo('home');
}

function viewWrongDetail(id) {
  document.getElementById('result-modal').style.display = 'none';
  if (!state.progress.mistakes.includes(id)) {
    state.progress.mistakes.push(id);
    state.saveProgress();
  }
  state.mode = 'mistakes';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('home-view')?.classList.add('hidden');
  document.getElementById('practice-view')?.classList.remove('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  const idx = state.progress.mistakes.indexOf(id);
  state.currentQIndex = idx >= 0 ? idx : 0;
  loadQuestion();
}
