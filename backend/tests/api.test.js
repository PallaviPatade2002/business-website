process.env.DB_FILE = ':memory:';
const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const db = require('../src/db');

let server, base;
test.before(
  () =>
    new Promise((resolve) => {
      server = app.listen(0, () => {
        base = 'http://localhost:' + server.address().port;
        resolve();
      });
    })
);
test.after(() => server.close());

const call = async (method, path, body, token) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

test('public form, admin login, enquiries and content', async () => {
  db.prepare("INSERT INTO users (name, phone, password_hash) VALUES ('Owner','1',?)").run(bcrypt.hashSync('secret1', 4));
  const adm = (await call('POST', '/api/auth/login', { phone: '1', password: 'secret1' })).body.token;
  assert.equal((await call('POST', '/api/auth/login', { phone: '1', password: 'bad' })).status, 401);

  assert.equal((await call('POST', '/api/enquiries', { name: 'A', phone: 'abc', message: 'hi' })).status, 400);
  assert.equal((await call('POST', '/api/enquiries', { name: '', phone: '9876543210', message: 'hi' })).status, 400);
  const e = await call('POST', '/api/enquiries', { name: 'Asha', phone: '9876543210', message: 'Need a quote' });
  assert.equal(e.status, 201);

  assert.equal((await call('GET', '/api/enquiries')).status, 401);
  const list = (await call('GET', '/api/enquiries', null, adm)).body;
  assert.equal(list.length, 1);
  assert.equal(list[0].status, 'new');

  assert.equal((await call('PATCH', '/api/enquiries/' + e.body.id, { status: 'contacted' }, adm)).status, 200);
  assert.equal((await call('PATCH', '/api/enquiries/' + e.body.id, { status: 'bogus' }, adm)).status, 400);
  assert.equal((await call('GET', '/api/enquiries?status=contacted', null, adm)).body.length, 1);
  assert.equal((await call('GET', '/api/enquiries?status=new', null, adm)).body.length, 0);

  assert.equal((await call('PUT', '/api/site', { business_name: 'Glow Co' }, adm)).status, 200);
  const s = await call('POST', '/api/services', { title: 'Cleaning', icon: '🧹' }, adm);
  assert.equal(s.status, 201);
  const site = (await call('GET', '/api/site')).body;
  assert.equal(site.settings.business_name, 'Glow Co');
  assert.equal(site.services.length, 1);

  await call('PUT', '/api/services/' + s.body.id, { active: false }, adm);
  assert.equal((await call('GET', '/api/site')).body.services.length, 0);
});

test('spam guard limits public enquiries', async () => {
  let last;
  for (let i = 0; i < 8; i++) {
    last = await call('POST', '/api/enquiries', { name: 'S', phone: '9876543210', message: 'x' });
  }
  assert.equal(last.status, 429);
});
