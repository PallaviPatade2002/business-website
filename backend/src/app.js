const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { SETTING_KEYS } = db;
const { sign, requireAuth } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50kb' }));

const STATUSES = ['new', 'contacted', 'done'];
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ---------- Auth ----------
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE phone = ?').get(text(phone, 20));
  if (!u || !bcrypt.compareSync(password || '', u.password_hash)) {
    return res.status(401).json({ error: 'Wrong phone or password' });
  }
  res.json({ token: sign(u), user: { id: u.id, name: u.name, phone: u.phone, role: u.role } });
});

// ---------- Public site content ----------
const readSettings = () =>
  Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, r.value]));

app.get('/api/site', (req, res) => {
  res.json({
    settings: readSettings(),
    services: db.prepare('SELECT id, title, description, icon FROM services WHERE active = 1 ORDER BY id').all(),
  });
});

app.put('/api/site', requireAuth('admin'), (req, res) => {
  const up = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  for (const k of SETTING_KEYS) {
    if (typeof req.body[k] === 'string') up.run(k, text(req.body[k], 1000));
  }
  res.json({ ok: true });
});

// ---------- Services (admin) ----------
app.get('/api/services', requireAuth('admin'), (req, res) => {
  res.json(db.prepare('SELECT * FROM services ORDER BY id').all());
});

app.post('/api/services', requireAuth('admin'), (req, res) => {
  const title = text(req.body.title, 80);
  if (!title) return res.status(400).json({ error: 'title required' });
  const r = db
    .prepare('INSERT INTO services (title, description, icon) VALUES (?,?,?)')
    .run(title, text(req.body.description, 300), text(req.body.icon, 4) || '✨');
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.put('/api/services/:id', requireAuth('admin'), (req, res) => {
  const cur = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  db.prepare('UPDATE services SET title=?, description=?, icon=?, active=? WHERE id=?').run(
    text(b.title, 80) || cur.title,
    typeof b.description === 'string' ? text(b.description, 300) : cur.description,
    text(b.icon, 4) || cur.icon,
    b.active === undefined ? cur.active : b.active ? 1 : 0,
    cur.id
  );
  res.json({ ok: true });
});

app.delete('/api/services/:id', requireAuth('admin'), (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Enquiries ----------
const hits = new Map(); // ip -> timestamps; simple spam guard for the public form
const tooMany = (ip) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
};

app.post('/api/enquiries', (req, res) => {
  if (tooMany(req.ip)) return res.status(429).json({ error: 'Too many enquiries, please try again later' });
  const name = text(req.body.name, 80);
  const phone = text(req.body.phone, 20);
  const email = text(req.body.email, 120);
  const message = text(req.body.message, 1000);
  if (!name || !message) return res.status(400).json({ error: 'Name and message are required' });
  if (!/^\+?[\d\s-]{8,15}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number' });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email' });
  const r = db
    .prepare('INSERT INTO enquiries (name, phone, email, message) VALUES (?,?,?,?)')
    .run(name, phone, email || null, message);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.get('/api/enquiries', requireAuth('admin'), (req, res) => {
  const { status } = req.query;
  res.json(
    STATUSES.includes(status)
      ? db.prepare('SELECT * FROM enquiries WHERE status = ? ORDER BY id DESC').all(status)
      : db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all()
  );
});

app.patch('/api/enquiries/:id', requireAuth('admin'), (req, res) => {
  if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  const r = db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

app.delete('/api/enquiries/:id', requireAuth('admin'), (req, res) => {
  db.prepare('DELETE FROM enquiries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Serve the built website (single-server deploy)
const dist = path.join(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) =>
    req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(path.join(dist, 'index.html')) : next()
  );
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

module.exports = app;
