/**
 * AI 智能刷题平台 — Express Server
 * 静态文件托管 + AI API 代理
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const aiRoutes = require('./server/routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const uploadsDir = path.join(__dirname, 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// 中间件
app.use(express.json({ limit: '50mb' }));

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const symbol = res.statusCode >= 400 ? '⚠' : '✓';
    console.log(`  ${symbol} ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// 静态文件服务
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use(express.static(path.join(__dirname)));

// API 路由
app.use('/api/ai', aiRoutes);

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════');
  console.log(`  AI 智能刷题平台已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
  console.log('═══════════════════════════════════════════');
});
