require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'trackify-secret-key-123';

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const info = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hashedPassword);
    
    const token = jwt.sign({ id: info.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: info.lastInsertRowid, email } });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email } });
});

// Sync Routes
app.post('/api/sync/push', authenticate, (req, res) => {
  const { data } = req.body; // { semesters: [], subjects: [], ... }
  
  const upsert = db.transaction((userId, tables) => {
    for (const [dataType, content] of Object.entries(tables)) {
      db.prepare(`
        INSERT INTO user_data (userId, dataType, content, updated_at) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP
      `).run(userId, dataType, JSON.stringify(content));
    }
  });

  // Simple approach: Delete old data and insert new for this user
  db.prepare('DELETE FROM user_data WHERE userId = ?').run(req.userId);
  
  const insert = db.prepare('INSERT INTO user_data (userId, dataType, content) VALUES (?, ?, ?)');
  for (const [dataType, content] of Object.entries(data)) {
    insert.run(req.userId, dataType, JSON.stringify(content));
  }

  res.json({ success: true, message: 'Data synced successfully' });
});

app.get('/api/sync/pull', authenticate, (req, res) => {
  const data = db.prepare('SELECT dataType, content FROM user_data WHERE userId = ?').all(req.userId);
  
  const result = {};
  data.forEach(row => {
    result[row.dataType] = JSON.parse(row.content);
  });
  
  res.json({ data: result });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
