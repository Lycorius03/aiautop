/**
 * AI 智能刷题平台 — AI API Routes
 */
const express = require('express');
const router = express.Router();
const { generateAI, testConnection } = require('../services/ai-provider');

/**
 * 解析服务商配置
 * 优先级：请求体中的用户配置 > 环境变量中的默认配置
 */
function resolveConfig(req) {
  const body = req.body || {};

  // 用户自定义配置
  if (body.providerConfig && body.providerConfig.apiKey) {
    return body.providerConfig;
  }

  // 环境变量默认配置
  const providers = [
    { key: 'DEEPSEEK_API_KEY', url: 'DEEPSEEK_BASE_URL', base: 'https://api.deepseek.com', name: 'deepseek' },
    { key: 'OPENAI_API_KEY', url: 'OPENAI_BASE_URL', base: 'https://api.openai.com/v1', name: 'openai' }
  ];

  for (const p of providers) {
    const apiKey = process.env[p.key];
    if (apiKey) {
      return {
        apiKey,
        baseUrl: (process.env[p.url] || p.base).replace(/\/+$/, '') + '/v1',
        model: body.model || 'gpt-3.5-turbo',
        provider: p.name
      };
    }
  }

  throw new Error('未配置 AI 服务商。请在设置中添加 API Key 或在 .env 中配置。');
}

// POST /api/ai/test-connection — 测试服务商连接
router.post('/test-connection', async (req, res) => {
  try {
    const { providerConfig } = req.body;
    if (!providerConfig || !providerConfig.apiKey) {
      return res.status(400).json({ error: '请提供完整的服务商配置（apiKey, baseUrl, model）' });
    }
    const result = await testConnection(providerConfig);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/ai/convert-to-quiz — AI 将文本/文档内容转换为题库 JSON
router.post('/convert-to-quiz', async (req, res) => {
  try {
    const { text, filename, providerConfig: userConfig } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: '请提供要转换的文本内容' });
    }

    const providerConfig = userConfig && userConfig.apiKey ? userConfig : resolveConfig(req);

    const prompt = `你是一个题库生成专家。请将以下内容转换为选择题题库的 JSON 格式。

## 要求
1. 每道题包含：id（从1开始的数字）、type（"单选题"或"多选题"）、q（题目）、options（4个选项的数组）、ans（正确答案，如"A"）、exp（答案解析，含翻译和详细解释）
2. 只提取适合作为选择题的知识点
3. 选项要有迷惑性但只有一个正确答案（多选题除外）
4. 解析要准确、详尽，包含翻译（如适用）
5. 至少生成3道题，最多30道题
6. 只输出 JSON 数组，不要其他内容，不要 markdown 代码块标记

## 内容
${text.slice(0, 20000)}`;

    console.log(`[AI-ROUTE] Converting to quiz: ${filename || 'text'} (${text.length} chars)`);
    const result = await generateAI(prompt, providerConfig);

    // 解析 AI 返回的 JSON
    let cleaned = result.content || '';
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const startIdx = cleaned.indexOf('[');
    const endIdx = cleaned.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.slice(startIdx, endIdx + 1);
    }

    try {
      const questions = JSON.parse(cleaned);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('AI returned empty or invalid question array');
      }
      console.log(`[AI-ROUTE] Generated ${questions.length} quiz questions`);
      res.json({ success: true, questions, count: questions.length });
    } catch (parseErr) {
      console.error('[AI-ROUTE] Failed to parse AI output:', parseErr.message);
      res.status(422).json({
        error: 'AI 生成的题库格式有误，请重试。',
        raw: result.content?.slice(0, 500)
      });
    }
  } catch (err) {
    console.error('[AI-ROUTE] Convert error:', err);
    res.status(500).json({ error: 'AI 转换失败：' + err.message });
  }
});

module.exports = router;
