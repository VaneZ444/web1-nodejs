const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const dbPath = path.join(__dirname, 'logs.db');

const db = new sqlite3.Database(dbPath);

db.run(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    service TEXT NOT NULL,
    message TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT
  )
`);

// Прием лога
app.post('/logs', (req, res) => {
  const { service, message, start_time, end_time } = req.body;

  if (!service || !message) {
    return res.status(400).json({ error: 'Service and message are required' });
  }

  const timestamp = new Date().toISOString();

  db.run(
    'INSERT INTO logs (timestamp, service, message, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
    [timestamp, service, message, start_time, end_time],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, timestamp, service, message, start_time, end_time });
    }
  );
});

// Получение списка логов
app.get('/logs', (req, res) => {
  db.all('SELECT * FROM logs', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(rows);
  });
});

// Запуск сервера
const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Log service running on port ${PORT}`);
});