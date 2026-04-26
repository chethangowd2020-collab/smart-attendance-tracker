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

// Initialize DB
db.initDb().then(() => console.log('Database initialized'));

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
    const result = await db.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, hashedPassword]);
    const userId = result.lastInsertRowid || (result.rows[0] && result.rows[0].id);
    
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, email } });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed') || err.message.includes('unique constraint')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email } });
});

// Sync Routes
app.post('/api/sync/push', authenticate, async (req, res) => {
  const { data } = req.body;
  
  try {
    // Delete old data for this user
    await db.query('DELETE FROM user_data WHERE userId = $1', [req.userId]);
    
    // Insert new data
    for (const [dataType, content] of Object.entries(data)) {
      await db.query('INSERT INTO user_data (userId, dataType, content) VALUES ($1, $2, $3)', [req.userId, dataType, JSON.stringify(content)]);
    }

    res.json({ success: true, message: 'Data synced successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

app.get('/api/sync/pull', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT dataType, content FROM user_data WHERE userId = $1', [req.userId]);
    
    const data = {};
    result.rows.forEach(row => {
      data[row.dataType] = JSON.parse(row.content);
    });
    
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
