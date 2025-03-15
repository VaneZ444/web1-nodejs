const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const upload = multer({ dest: 'temp/' });

const db = new sqlite3.Database('./database.db');

db.run(`
  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image TEXT NOT NULL
  )
`);
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
  console.log("units", message, start_time, new Date().toISOString())
  sendLog("units", message, start_time, new Date().toISOString())
};

const uploadFile = async (file) => {
  const formData = new FormData();

  if (!fs.existsSync(file.path)) {
    throw new Error('File does not exist');
  }

  formData.append('file', fs.createReadStream(file.path), {
    filename: file.originalname,
  });

  try {
    const response = await axios.post('http://localhost:3002/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    // Удаляем временный файл после успешной загрузки
    fs.unlinkSync(file.path);

    return response.data.url;
  } catch (err) {
    // Удаляем временный файл в случае ошибки
    fs.unlinkSync(file.path);
    throw err; // Пробрасываем ошибку для обработки в основном коде
  }
};

// Создание юнита
app.post('/units', upload.single('image'), async (req, res) => {
  const { name } = req.body;
  const imageFile = req.file;
  const start_time = new Date().toISOString()
  // Валидация
  if (!name || name.length <= 4 || !imageFile) {
    log('Invalid input: name or image is invalid', start_time);
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    // Загрузка изображения в FileStorage
    const imageUrl = await uploadFile(imageFile);

    // Сохранение юнита в базу данных
    db.run(
      'INSERT INTO units (name, image) VALUES (?, ?)',
      [name, imageUrl],
      function (err) {
        if (err) {
          log(`Error creating unit: ${err.message}`);
          return res.status(500).json({ error: err.message });
        }
        setTimeout(() => {
          log(`Unit created with ID: ${this.lastID}`, start_time);
          res.status(201).json({ id: this.lastID, name, image: imageUrl })}, 1000);
      }
    );
  } catch (err) {
    log(`Error uploading file: ${err.message}`);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Получение списка юнитов
app.get('/units', (req, res) => {
  const start_time = new Date().toISOString()
  db.all('SELECT * FROM units', (err, rows) => {
    if (err) {
      log(`Error fetching units: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }
    log('Units fetched successfully', start_time);
    res.status(200).json(rows);
  });
});

// Получение юнита по ID
app.get('/units/:id', (req, res) => {
  const { id } = req.params;
  const start_time = new Date().toISOString()
  db.get('SELECT * FROM units WHERE id = ?', [id], (err, row) => {
    if (err) {
      log(`Error fetching unit with ID ${id}: ${err.message}`, start_time);
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      log(`Unit with ID ${id} not found`);
      return res.status(404).json({ error: 'Unit not found' });
    }
    log(`Unit with ID ${id} fetched successfully`, start_time);
    res.status(200).json(row);
  });
});

// Обновление юнита
app.put('/units/:id', (req, res) => {
  const { id } = req.params;
  const { name, image } = req.body;
  const start_time = new Date().toISOString()
  // Валидация
  if (!name || name.length <= 4 || !image) {
    //console.log('Request body:', req.body);
    log('Invalid input: name or image is invalid', start_time);
    return res.status(400).json({ error: 'Invalid input' });
  }

  db.run(
    'UPDATE units SET name = ?, image = ? WHERE id = ?',
    [name, image, id],
    function (err) {
      if (err) {
        log(`Error updating unit with ID ${id}: ${err.message}`, start_time);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        log(`Unit with ID ${id} not found`, start_time);
        return res.status(404).json({ error: 'Unit not found' });
      }
      log(`Unit with ID ${id} updated successfully`, start_time);
      res.status(200).json({ id, name, image });
    }
  );
});

// Удаление юнита
app.delete('/units/:id', (req, res) => {
  const { id } = req.params;
  const start_time = new Date().toISOString()
  db.run('DELETE FROM units WHERE id = ?', [id], function (err) {
    if (err) {
      log(`Error deleting unit with ID ${id}: ${err.message}`, start_time);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      log(`Unit with ID ${id} not found`, start_time);
      return res.status(404).json({ error: 'Unit not found' });
    }
    log(`Unit with ID ${id} deleted successfully`, start_time);
    res.status(204).send();
  });
});

// Запуск сервера
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Units service running on port ${PORT}`);
});