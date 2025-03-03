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

const log = (message) => {
  console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
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
app.post('/', upload.single('image'), async (req, res) => {
  const { name } = req.body;
  const imageFile = req.file;

  // Валидация
  if (!name || name.length <= 4 || !imageFile) {
    log('Invalid input: name or image is invalid');
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
        log(`Unit created with ID: ${this.lastID}`);
        res.status(201).json({ id: this.lastID, name, image: imageUrl });
      }
    );
  } catch (err) {
    log(`Error uploading file: ${err.message}`);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Получение списка юнитов
app.get('/units', (req, res) => {
  db.all('SELECT * FROM units', (err, rows) => {
    if (err) {
      log(`Error fetching units: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }
    log('Units fetched successfully');
    res.status(200).json(rows);
  });
});

// Получение юнита по ID
app.get('/units/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM units WHERE id = ?', [id], (err, row) => {
    if (err) {
      log(`Error fetching unit with ID ${id}: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      log(`Unit with ID ${id} not found`);
      return res.status(404).json({ error: 'Unit not found' });
    }
    log(`Unit with ID ${id} fetched successfully`);
    res.status(200).json(row);
  });
});

// Обновление юнита
app.put('/units/:id', (req, res) => {
  const { id } = req.params;
  const { name, image } = req.body;

  // Валидация
  if (!name || name.length <= 4 || !image) {
    log('Invalid input: name or image is invalid');
    return res.status(400).json({ error: 'Invalid input' });
  }

  db.run(
    'UPDATE units SET name = ?, image = ? WHERE id = ?',
    [name, image, id],
    function (err) {
      if (err) {
        log(`Error updating unit with ID ${id}: ${err.message}`);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        log(`Unit with ID ${id} not found`);
        return res.status(404).json({ error: 'Unit not found' });
      }
      log(`Unit with ID ${id} updated successfully`);
      res.status(200).json({ id, name, image });
    }
  );
});

// Удаление юнита
app.delete('/units/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM units WHERE id = ?', [id], function (err) {
    if (err) {
      log(`Error deleting unit with ID ${id}: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      log(`Unit with ID ${id} not found`);
      return res.status(404).json({ error: 'Unit not found' });
    }
    log(`Unit with ID ${id} deleted successfully`);
    res.status(204).send();
  });
});

// Запуск сервера
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Units service running on port ${PORT}`);
});