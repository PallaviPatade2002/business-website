const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const db = new DatabaseSync(process.env.DB_FILE || path.join(__dirname, '..', 'site.db'));
db.exec('PRAGMA foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const DEFAULTS = {
  business_name: 'Your Business Name',
  tagline: 'Quality service you can trust, right in your neighbourhood.',
  about: 'We are a local business focused on honest work and happy customers. Tell us what you need and we will get back to you quickly.',
  phone: '+91 90000 00000',
  whatsapp: '919000000000',
  email: 'hello@example.com',
  address: 'Main Road, Your City',
  hours: 'Mon–Sat, 9 AM – 7 PM',
};
const ins = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(DEFAULTS)) ins.run(k, v);

module.exports = db;
module.exports.SETTING_KEYS = Object.keys(DEFAULTS);
