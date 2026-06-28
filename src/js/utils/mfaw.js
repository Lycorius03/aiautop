/**
 * AI 智能刷题平台 — MFAW (Multi-Factor Adaptive Weight) Algorithm
 *
 * 四因子自适应权重算法，用于加权随机刷题模式：
 *   PF — 表现因子 (EMA of recent answers)
 *   DF — 难度因子 (historical error rate)
 *   SF — 稳定因子 (consecutive correct streak)
 *   NF — 新颖因子 (time decay since last seen)
 *
 * Weight = α·PF + β·DF + γ·(1−SF) + δ·NF
 */
export class MFAW {
  constructor(options = {}) {
    this.alpha = options.alpha ?? 0.35;
    this.beta  = options.beta  ?? 0.25;
    this.gamma = options.gamma ?? 0.25;
    this.delta = options.delta ?? 0.15;
    this.emaAlpha = options.emaAlpha ?? 0.4;
    this.lambda = options.lambda ?? 0.05;
    this.minWeight = options.minWeight ?? 0.05;
    this.maxWeight = options.maxWeight ?? 15.0;
  }

  /**
   * 计算单题权重
   * @param {Object} stats - { totalAttempts, wrongCount, streak, ema, lastSeenAt }
   * @param {number} [now=Date.now()]
   * @returns {number} weight
   */
  calculateWeight(stats, now = Date.now()) {
    const { totalAttempts = 0, wrongCount = 0, streak = 0, ema = 0.5, lastSeenAt } = stats;

    const pf = 1 - ema;
    const df = totalAttempts > 0 ? (wrongCount + 1) / (totalAttempts + 2) : 0.5;
    const sf = Math.min(streak / 3, 1.0);
    let nf = 0.5;
    if (lastSeenAt) {
      const dtMinutes = (now - lastSeenAt) / 60000;
      nf = 1 - Math.exp(-this.lambda * dtMinutes);
    }

    let weight = this.alpha * pf + this.beta * df + this.gamma * (1 - sf) + this.delta * nf;
    return Math.max(this.minWeight, Math.min(this.maxWeight, weight));
  }

  /**
   * 答题后更新统计数据
   */
  updateStats(stats, correct, now = Date.now()) {
    const updated = { ...stats };
    updated.totalAttempts = (stats.totalAttempts || 0) + 1;
    updated.wrongCount = (stats.wrongCount || 0) + (correct ? 0 : 1);
    updated.streak = correct ? (stats.streak || 0) + 1 : 0;

    const result = correct ? 1 : 0;
    const prevEma = stats.ema !== undefined ? stats.ema : 0.5;
    updated.ema = this.emaAlpha * result + (1 - this.emaAlpha) * prevEma;
    updated.lastSeenAt = now;

    return updated;
  }

  /**
   * 判断题目是否已掌握（可从错题本移除）
   */
  isMastered(stats) {
    const pf = 1 - (stats.ema || 0.5);
    const df = stats.totalAttempts > 0 ? (stats.wrongCount + 1) / (stats.totalAttempts + 2) : 0.5;
    const sf = Math.min((stats.streak || 0) / 3, 1.0);
    return sf >= 0.9 && pf <= 0.2 && df <= 0.25;
  }
}
