/**
 * AI 智能刷题平台 — AI Provider Service
 * 支持任意 OpenAI 兼容 API，用户可自行配置服务商/模型/Key
 */

/**
 * 测试 AI 服务商连接
 */
async function testConnection(config) {
  const { apiKey, baseUrl, model } = config;
  const endpoint = `${baseUrl}/chat/completions`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Hi, respond with just "OK".' }],
      max_tokens: 10,
      temperature: 0
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    console.error(`[AI-PROVIDER] Connection test failed: ${resp.status} ${errBody}`);
    throw new Error(`连接失败 (${resp.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await resp.json();
  console.log(`[AI-PROVIDER] Connection test OK — model: ${data.model || model}`);

  // 尝试获取可用模型列表
  let models = [];
  try {
    const modelsResp = await fetch(`${baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000)
    });
    if (modelsResp.ok) {
      const modelsData = await modelsResp.json();
      models = (modelsData.data || []).map(m => m.id).filter(id =>
        !id.includes('embedding') && !id.includes('moderation') && !id.includes('audio')
      );
    }
  } catch (e) {
    models = [model];
  }

  return { success: true, model: data.model || model, models: models.length > 0 ? models : [model], usage: data.usage };
}

/**
 * 非流式文本生成
 */
async function generateAI(prompt, providerConfig) {
  const { apiKey, baseUrl, model } = providerConfig;
  if (!apiKey) throw new Error('API Key 未配置');

  console.log(`[AI-PROVIDER] generate → ${baseUrl}/chat/completions (model: ${model})`);

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 16384,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(120000)
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`AI API error: ${resp.status} ${err.slice(0, 300)}`);
  }

  const data = await resp.json();
  const content = data.choices[0].message.content;
  console.log(`[AI-PROVIDER] generate OK — ${content.length} chars`);

  return { content, model: data.model, usage: data.usage };
}

module.exports = { generateAI, testConnection };
