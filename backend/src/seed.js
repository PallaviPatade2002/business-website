const bcrypt = require('bcryptjs');
const db = require('./db');

db.prepare('INSERT OR IGNORE INTO users (name, phone, password_hash, role) VALUES (?,?,?,?)').run(
  'Owner',
  '9000000001',
  bcrypt.hashSync('123456', 10),
  'admin'
);

if (!db.prepare('SELECT COUNT(*) c FROM services').get().c) {
  const ins = db.prepare('INSERT INTO services (title, description, icon) VALUES (?,?,?)');
  ins.run('Consultation', 'Tell us what you need and get honest advice, no pressure.', '💬');
  ins.run('Quality Service', 'Reliable work delivered on time by experienced people.', '🛠️');
  ins.run('After-sales Support', 'We stay in touch after the job is done.', '🤝');
  ins.run('Free Quotes', 'Clear pricing up front, with no hidden charges.', '🧾');
}
if (!db.prepare('SELECT COUNT(*) c FROM enquiries').get().c) {
  const ins = db.prepare('INSERT INTO enquiries (name, phone, email, message, status) VALUES (?,?,?,?,?)');
  ins.run('Amit Joshi', '9876543210', 'amit@example.com', 'Hi, I would like a quote for a 2-day job next week.', 'new');
  ins.run('Neha Kulkarni', '9822012345', null, 'What are your charges for a monthly plan?', 'contacted');
  ins.run('Rahul Patil', '9922334455', null, 'Please call me back, I need help urgently.', 'new');
}
console.log('Seeded. Admin login: 9000000001 / 123456');
