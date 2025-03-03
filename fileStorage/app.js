const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = 3002;

// Настройка Multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9); // Уникальное имя
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Функция для отправки логов в сервис Log
const sendLog = async (service, message) => {
  try {
    await axios.post('http://localhost:3003/logs', {
      service,
      message,
    });
  } catch (err) {
    console.error('Error sending log:', err.message);
  }
};

// Логирование
const log = async (message) => {
  console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
  await sendLog('FileStorage', message); // Отправляем лог в сервис Log
};

// Загрузка файла
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    await log('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Логирование информации о файле
  console.log('Uploaded file:', req.file);

  const fileUrl = `http://localhost:${PORT}/files/${req.file.filename}`;
  await log(`File uploaded: ${fileUrl}`);
  res.status(201).json({ url: fileUrl });
});

// Получение списка файлов
app.get('/files', async (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');

  // Чтение списка файлов из папки uploads
  fs.readdir(uploadDir, async (err, files) => {
    if (err) {
      await log(`Error reading uploads directory: ${err.message}`);
      return res.status(500).json({ error: 'Unable to read files' });
    }

    // Формирование списка URL файлов
    const fileUrls = files.map((filename) => ({
      name: filename,
      url: `http://localhost:${PORT}/files/${filename}`,
    }));

    await log('File list retrieved');
    res.status(200).json(fileUrls);
  });
});

// Получение файла
app.get('/files/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', filename);

  if (!fs.existsSync(filePath)) {
    await log(`File not found: ${filename}`);
    return res.status(404).json({ error: 'File not found' });
  }

  await log(`File served: ${filename}`);
  res.sendFile(filePath);
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`FileStorage service running on port ${PORT}`);
});