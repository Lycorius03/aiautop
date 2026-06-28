# AI 智能刷题平台

> 纯前端刷题工具 + AI 辅助生成题库 — 多题库管理、MFAW 自适应算法、自定义 AI 服务商、API Key 加密存储。

模块化单页 Web 应用，支持 JSON 题库导入/导出、多题库切换、MFAW 加权随机刷题、模拟考试、错题复习，以及 AI 自动生成题库（支持文件上传，单次最多 120 道）。所有学习数据保存在浏览器本地，API Key 经 AES-GCM 加密存储，不会出现在源代码中。

---

## 快速开始

```bash
npm install        # 安装依赖
npm start          # 启动服务 → http://localhost:3000
```

> 如果没有题库，可导入项目自带的 `English. json` 或 `期中英语复习.json` 体验。

---

## 功能概览

### 刷题模式

| 模式 | 说明 |
|---|---|
| **智能加权** | MFAW 四因子算法自适应排序 — 错题优先、薄弱点多练 |
| **随机刷题** | 随机打乱题目顺序 |
| **顺序刷题** | 按题库顺序逐题练习，支持题号跳转 |
| **错题本** | 专门复习做错的题目，答对自动移除 |
| **模拟考试** | 40 题 / 60 分钟 / 1000 分制 / 答题卡 + 标记功能 |

### AI 生成题库

- **文件上传**：直接上传 txt / md / json / docx / pdf，后端自动解析文本
- **单次 120 题**：max_tokens = 131072，充分利用大模型上下文窗口
- **多服务商**：内置 DeepSeek / OpenAI / Claude / SiliconFlow / Qwen / Zhipu / Groq / Ollama 预设，也支持自定义 OpenAI-compatible API
- **连接测试**：保存前验证 API Key 是否有效

### 安全

- **API Key 加密**：AES-GCM-256 加密后存入 localStorage，密钥派生自随机设备盐值
- **设备绑定**：即使 localStorage 数据泄露，也无法在其他设备解密
- **源码安全**：API Key 仅存浏览器本地，永远不会出现在源代码或 Git 历史中
- **后端代理**：前端不直接调用 AI API，通过本地 Express 服务转发

### 数据管理

- 学习进度按题库独立存储，自动保存
- 完整备份：导出/导入所有题库 + 进度（JSON）
- 单题库导出为独立 JSON 文件

### 键盘快捷键

| 按键 | 功能 |
|---|---|
| `1` `2` `3` `4` | 选择对应选项 |
| `→` / `n` | 下一题 |
| `←` / `p` | 上一题 |

### 移动端适配

- 双断点响应式：平板 (768px) / 手机 (480px)
- 导航横向滚动、触摸优化、iOS 输入防缩放
- 支持刘海屏 (`viewport-fit=cover`) 和添加到主屏幕 (PWA meta)

---

## 题库格式

```json
[
  {
    "id": 1,
    "type": "单选题",
    "q": "题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "ans": "C",
    "exp": "答案解析"
  }
]
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 题号 |
| `type` | string | `单选题` / `多选题` |
| `q` | string | 题干 |
| `options` | string[] | 4 个选项 |
| `ans` | string | 答案，如 `"A"` 或 `"AB"` |
| `exp` | string | 解析（可选） |

---

## 项目结构

```
aiautop/
├── index.html               # SPA Shell
├── server.js                # Express (静态 + AI 代理)
├── package.json
├── .env.example             # 环境变量模板
├── src/
│   ├── css/
│   │   ├── design-tokens.css
│   │   ├── components.css
│   │   └── quiz.css
│   ├── js/
│   │   ├── app.js           # 入口
│   │   ├── state.js         # 全局状态
│   │   ├── modules/
│   │   │   ├── bank-manager.js   # 题库管理 + AI 生成
│   │   │   ├── quiz-engine.js    # 刷题引擎 (MFAW)
│   │   │   ├── exam-mode.js      # 模拟考试
│   │   │   └── settings.js       # API Key 管理
│   │   ├── services/
│   │   │   ├── storage.js        # localStorage 封装
│   │   │   └── ai-service.js     # AI 客户端
│   │   └── utils/
│   │       ├── crypto.js         # AES-GCM 加密
│   │       ├── mfaw.js           # MFAW 算法
│   │       └── helpers.js        # 工具函数
├── server/
│   ├── routes/
│   │   └── ai.js            # AI 代理 + 文件解析
│   └── services/
│       └── ai-provider.js   # 多服务商适配
├── English. json
└── 期中英语复习.json
```

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | HTML5 / CSS3 / ES Modules (零框架零构建) |
| 后端 | Node.js + Express |
| AI | OpenAI-compatible API (DeepSeek / GPT-4o / Claude 等) |
| 存储 | localStorage (进度) + AES-GCM (Key) |
| 算法 | MFAW 四因子自适应权重 |

---

## 环境变量

| 变量 | 说明 | 必填 |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 否 |
| `OPENAI_API_KEY` | OpenAI API Key | 否 |
| `PORT` | 服务端口 (默认 3000) | 否 |

> 启动后也可通过 **设置** 页面直接配置 API Key，无需 .env 文件。

---

MIT License
