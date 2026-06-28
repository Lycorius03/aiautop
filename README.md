# AI 智能刷题平台

> 纯前端刷题工具 + AI 辅助生成题库 — 支持多题库管理、MFAW 自适应算法、自定义 AI 服务商。

一个模块化的单页 Web 应用，用于刷题练习。支持导入多个 JSON 题库、自由切换、加权随机（MFAW 算法）、模拟考试、错题复习，以及 AI 自动生成题库。所有数据保存在浏览器本地。

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置（可选）

如果希望使用 AI 生成题库功能：

```bash
cp .env.example .env
# 编辑 .env，填入你的 API Key（DeepSeek 或 OpenAI）
```

也可以在启动后，在设置页面直接添加 API Key（无需修改 .env）。

### 3. 启动

```bash
npm start
```

打开 **http://localhost:3000**

> 如果没有题库，可以导入项目自带的 `English. json` 或 `期中英语复习.json` 开始体验。

---

## 功能概览

### 首页仪表盘
- 展示当前题库总数、已刷题数、正确率、错题待复习数
- 题库管理面板：切换、重命名、导出、删除题库
- JSON 格式模板参考（含示例，可一键复制）
- 支持导入题库文件 / 粘贴 JSON 文本 / AI 生成题库

### 刷题模式

| 模式 | 说明 |
|------|------|
| **智能加权** | MFAW 算法自适应排序 — 错题优先、薄弱点多练 |
| **随机刷题** | 随机打乱题目顺序 |
| **顺序刷题** | 按题库顺序逐题练习，支持题号跳转 |
| **错题本** | 专门复习做错的题目，答对自动移出 |

### 模拟考试
- 40 道题，60 分钟倒计时
- 总分 1000 分，600 分及格
- 答题卡面板，快速跳转和标记
- 交卷后显示得分、通过状态和错题列表

### AI 功能
- **AI 生成题库**：粘贴文本内容，AI 自动生成选择题题库
- **自定义服务商**：支持 OpenAI、DeepSeek、Claude、Qwen、Zhipu、Groq、Ollama 等任意 OpenAI-compatible API
- **连接测试**：保存前验证 API Key 是否有效
- **预设模板**：内置 9 个主流服务商预设，选择即自动填充

### MFAW 算法
- 四因子自适应权重：表现因子(PF) + 难度因子(DF) + 稳定因子(SF) + 新颖因子(NF)
- 参数可调节（设置页面）
- 掌握判定：连续正确且错误率低 → 自动降低权重

### 数据管理
- 学习进度自动保存到浏览器本地（按题库分离）
- 支持导入/导出完整备份（含所有题库和进度）
- 支持单个题库导出为 JSON 文件

### 键盘快捷键

| 按键 | 功能 |
|------|------|
| `1` `2` `3` `4` | 选择对应选项 |
| `→` / `n` | 下一题 |
| `←` / `p` | 上一题 |

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
    "exp": "答案解析：含翻译、选项说明等"
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 题目序号 |
| `type` | string | `单选题` 或 `多选题` |
| `q` | string | 题目内容 |
| `options` | string[] | 4个选项 |
| `ans` | string | 正确答案，如 `"A"` 或 `"AB"` |
| `exp` | string | 答案解析（可选） |

---

## 项目结构

```
aiautop/
├── index.html                    # SPA 入口（轻量 Shell）
├── server.js                     # Express 服务器（静态托管 + AI 代理）
├── package.json                  # 依赖配置
├── .env.example                  # 环境变量模板
├── README.md                     # 本文件
├── src/                          # 前端源码
│   ├── css/                      # 样式表
│   │   ├── design-tokens.css     #   CSS 变量
│   │   ├── components.css        #   通用组件样式
│   │   └── quiz.css              #   刷题页面布局
│   ├── js/                       # JavaScript 模块 (ES Modules)
│   │   ├── app.js                #   入口：初始化、事件绑定
│   │   ├── state.js              #   全局状态管理
│   │   ├── modules/              #   功能模块
│   │   │   ├── bank-manager.js   #     题库管理（导入/导出/切换/删除/AI生成）
│   │   │   ├── quiz-engine.js    #     刷题引擎（顺序/随机/MFAW加权/错题本）
│   │   │   ├── exam-mode.js      #     模拟考试
│   │   │   └── settings.js       #     设置（API Key 管理/MFAW参数）
│   │   ├── services/             #   服务层
│   │   │   ├── storage.js        #     localStorage 封装
│   │   │   └── ai-service.js     #     AI API 客户端
│   │   └── utils/                #   工具函数
│   │       ├── mfaw.js           #     MFAW 自适应权重算法
│   │       └── helpers.js        #     Toast/剪贴板/HTML转义
│   └── lib/                      #   第三方库（预留）
└── server/                       # 后端源码
    ├── routes/
    │   └── ai.js                 #   AI 代理路由（生成题库、测试连接）
    └── services/
        └── ai-provider.js        #   多服务商 AI 适配层
```

---

## 技术栈

| 层 | 技术 | 备注 |
|---|---|---|
| 前端 | HTML5, CSS3, JavaScript (ES Modules) | 零框架、零构建 |
| 后端 | Node.js + Express.js | 静态托管 + AI API 代理 |
| AI | OpenAI-compatible API | 多服务商支持（用户自行配置） |
| 数据 | localStorage | 浏览器本地存储 |
| 算法 | MFAW | 四因子自适应加权随机 |

---

## 已有题库

| 文件 | 内容 | 题数 |
|------|------|------|
| `English. json` | 英语四级词汇选择题 | 90 |
| `期中英语复习.json` | 大学英语期中复习词汇选择题 | 90 |

> 这两个题库可直接导入使用。更多题库可通过 AI 生成或自行编辑 JSON 文件创建。

---

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key（默认服务商） | 否 |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | 否 |
| `OPENAI_API_KEY` | OpenAI API Key | 否 |
| `OPENAI_BASE_URL` | OpenAI API 地址 | 否 |
| `PORT` | 服务端口（默认 3000） | 否 |

> 也可以在启动后通过设置页面直接配置 API Key，无需修改环境变量。

---

## 许可证

MIT License
