const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Получаем адреса сервисов из переменных окружения
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const UNITS_SERVICE_URL = process.env.UNITS_SERVICE_URL || 'http://localhost:3001';
const FILE_STORAGE_SERVICE_URL = process.env.FILE_STORAGE_SERVICE_URL || 'http://localhost:3002';
const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || 'http://localhost:3003';

// Проксирование запросов к сервису Units
app.use(
  '/units',
  createProxyMiddleware({
    target: `${UNITS_SERVICE_URL}/units`,
    changeOrigin: true,
  })
);

// Проксирование запросов к сервису FileStorage
app.use(
  '/upload',
  createProxyMiddleware({
    target: `${FILE_STORAGE_SERVICE_URL}/upload`,
    changeOrigin: true,
  })
);

app.use(
  '/files',
  createProxyMiddleware({
    target: `${FILE_STORAGE_SERVICE_URL}/files`,
    changeOrigin: true,
  })
);

// Проксирование запросов к сервису Log
app.use(
  '/logs',
  createProxyMiddleware({
    target: `${LOG_SERVICE_URL}/logs`,
    changeOrigin: true,
  })
);

// Обработка корневого маршрута
app.get('/', (req, res) => {
  res.json({
    message: 'welcome to the gateway',
    endpoints: {
      units: `${GATEWAY_URL}/units`,
      upload: `${GATEWAY_URL}/upload`,
      files: `${GATEWAY_URL}/files`,
      logs: `${GATEWAY_URL}/logs`,
    },
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Gateway error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gateway service running on port ${PORT}`);
  console.log('Configured services:');
  console.log(`- Units: ${UNITS_SERVICE_URL}`);
  console.log(`- FileStorage: ${FILE_STORAGE_SERVICE_URL}`);
  console.log(`- Log: ${LOG_SERVICE_URL}`);
});