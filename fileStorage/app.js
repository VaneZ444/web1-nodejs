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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9); // сборка мега уникального имени
    cb(null, uniqueSuffix + '-' + file.originalname); // сборка мега уникального имени
  },
});

const upload = multer({ storage });

// отправка логов в Log
const sendLog = async (service, message, start, end) => {
  try {
    await axios.post('http://localhost:3003/logs', {
      service,
      message,
      start_time: start,
      end_time: end,
    });
  } catch (err) {
    console.error('Error sending log:', err.message);
  }
};
const log = (message, start_time) => {
  console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
  sendLog("fileStorage", message, start_time, new Date().toISOString())
};

// Загрузка файла
app.post('/upload', upload.single('file'), async (req, res) => {
  const start_time = new Date().toISOString()
  if (!req.file) {
    await log('No file uploaded', start_time);
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Логирование информации о файле
  console.log('Uploaded file:', req.file);

  const fileUrl = `http://localhost:${PORT}/files/${req.file.filename}`;
  await log(`File uploaded: ${fileUrl}`, start_time);
  res.status(201).json({ url: fileUrl });
});

// Получение списка файлов
app.get('/files', async (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');
  const start_time = new Date().toISOString
  // Чтение списка файлов из папки uploads
  fs.readdir(uploadDir, async (err, files) => {
    if (err) {
      await log(`Error reading uploads directory: ${err.message}`, start_time);
      return res.status(500).json({ error: 'Unable to read files' });
    }

    // Формирование списка URL файлов
    const fileUrls = files.map((filename) => ({
      name: filename,
      url: `http://localhost:${PORT}/files/${filename}`,
    }));

    await log('File list retrieved', start_time);
    res.status(200).json(fileUrls);
  });
});

// Получение файла
app.get('/files/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', filename);
  const start_time = new Date().toISOString()
  if (!fs.existsSync(filePath)) {
    await log(`File not found: ${filename}`, start_time);
    return res.status(404).json({ error: 'File not found' });
  }

  await log(`File served: ${filename}`);
  res.sendFile(filePath);
});

// Удаление файла
app.delete('/files/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', filename);
  const start_time = new Date().toISOString()
  if (!fs.existsSync(filePath)) {
    await log(`File not found: ${filename}`, start_time);
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    fs.unlinkSync(filePath); // Удаление файла
    await log(`File deleted: ${filename}`, start_time);
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    await log(`Error deleting file: ${filename} - ${err.message}`, start_time);
    res.status(500).json({ error: 'Unable to delete file' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`FileStorage service running on port ${PORT}`);
});