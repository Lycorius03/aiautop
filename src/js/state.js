/**
 * AI 智能刷题平台 — App State
 * 集中状态管理
 */
import { storage, STORAGE_KEYS } from '../services/storage.js';

export class AppState {
  constructor() {
    /** @type {Array<{id:string,name:string,questions:Array,createdAt:string}>} */
    this.banks = [];
    this.activeBankId = null;
    this.questionBank = [];      // 活跃题库的快捷引用

    // 刷题模式状态
    this.mode = 'home';          // home | sequential | random | weighted | mistakes | exam
    this.currentQIndex = 0;
    this.examQuestions = [];
    this.examAnswers = {};
    this.examTimer = null;

    // 当前题库进度
    this.progress = this._emptyProgress();

    // 设置
    this.settings = storage.get(STORAGE_KEYS.SETTINGS, {
      mfaw: { alpha: 0.35, beta: 0.25, gamma: 0.25, delta: 0.15 }
    });
  }

  _emptyProgress() {
    return { done: [], mistakes: [], favorites: [], correctCount: 0, totalAttempted: 0, lastSequenceIndex: 0 };
  }

  /** 初始化：从 localStorage 加载题库和进度 */
  init() {
    this.banks = storage.get(STORAGE_KEYS.BANKS, []);
    if (!Array.isArray(this.banks)) this.banks = [];

    const savedId = storage.get(STORAGE_KEYS.ACTIVE_BANK);
    if (savedId && this.banks.some(b => b.id === savedId)) {
      this.activeBankId = savedId;
    } else if (this.banks.length > 0) {
      this.activeBankId = this.banks[0].id;
    }

    const bank = this.getActiveBank();
    this.questionBank = bank ? bank.questions : [];

    if (this.activeBankId) {
      this.progress = this.loadProgress(this.activeBankId);
    }

    this.settings = storage.get(STORAGE_KEYS.SETTINGS, this.settings);
  }

  getActiveBank() {
    return this.banks.find(b => b.id === this.activeBankId) || null;
  }

  /** 保存题库列表 */
  saveBanks() {
    storage.set(STORAGE_KEYS.BANKS, this.banks);
  }

  /** 切换活跃题库 */
  switchBank(bankId) {
    this.saveProgress();
    this.activeBankId = bankId;
    storage.set(STORAGE_KEYS.ACTIVE_BANK, bankId);
    const bank = this.getActiveBank();
    this.questionBank = bank ? bank.questions : [];
    this.progress = this.activeBankId ? this.loadProgress(this.activeBankId) : this._emptyProgress();
    this.currentQIndex = 0;
  }

  /** 添加题库 */
  addBank(name, questions) {
    const id = 'bk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    const bank = { id, name, questions, createdAt: new Date().toISOString() };
    this.banks.push(bank);
    this.saveBanks();
    if (!this.activeBankId || this.banks.length === 1) {
      this.switchBank(bank.id);
    }
    return bank;
  }

  /** 删除题库 */
  deleteBank(bankId) {
    const bank = this.banks.find(b => b.id === bankId);
    if (!bank) return false;
    const wasActive = this.activeBankId === bankId;

    this.banks = this.banks.filter(b => b.id !== bankId);
    this.saveBanks();

    // 删除进度
    const allP = storage.get(STORAGE_KEYS.PROGRESS, {});
    delete allP[bankId];
    storage.set(STORAGE_KEYS.PROGRESS, allP);

    if (wasActive) {
      if (this.banks.length > 0) {
        this.switchBank(this.banks[0].id);
      } else {
        this.activeBankId = null;
        this.questionBank = [];
        this.progress = this._emptyProgress();
        storage.remove(STORAGE_KEYS.ACTIVE_BANK);
      }
    }
    return true;
  }

  /** 保存当前题库进度 */
  saveProgress() {
    if (!this.activeBankId) return;
    const allP = storage.get(STORAGE_KEYS.PROGRESS, {});
    allP[this.activeBankId] = this.progress;
    storage.set(STORAGE_KEYS.PROGRESS, allP);
  }

  /** 加载指定题库的进度 */
  loadProgress(bankId) {
    const allP = storage.get(STORAGE_KEYS.PROGRESS, {});
    return allP[bankId] || this._emptyProgress();
  }

  /** 更新设置 */
  updateSettings(patch) {
    Object.assign(this.settings, patch);
    storage.set(STORAGE_KEYS.SETTINGS, this.settings);
  }
}

/** 全局单例 */
export const state = new AppState();
export default state;
