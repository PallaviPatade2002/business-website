import { useEffect, useState } from 'react';
import { api, getSession, setSession } from '../api';

const FIELDS = [
  ['business_name', 'Business name', true],
  ['tagline', 'Tagline (hero text)', true],
  ['about', 'About us', true],
  ['phone', 'Phone'],
  ['whatsapp', 'WhatsApp (91XXXXXXXXXX)'],
  ['email', 'Email'],
  ['address', 'Address'],
  ['hours', 'Opening hours'],
];

function Login({ onLogin }) {
  const [f, setF] = useState({ phone: '', password: '' });
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      onLogin(await api('POST', '/auth/login', f));
    } catch (e2) {
      setErr(e2.message);
    }
  };
  return (
    <div className="login-box">
      <form className="form-card" onSubmit={submit}>
        <h3>Owner login</h3>
        <label>Phone<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required /></label>
        <label>Password<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></label>
        {err && <p className="form-err">{err}</p>}
        <button className="btn">Login</button>
        <small>Demo: 9000000001 / 123456</small>
      </form>
    </div>
  );
}

function Enquiries() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const query = '/enquiries' + (filter ? '?status=' + filter : '');
  const load = () => api('GET', query).then(setRows);
  useEffect(() => {
    api('GET', query).then(setRows);
  }, [query]);
  const setStatus = (id, status) => api('PATCH', '/enquiries/' + id, { status }).then(load);
  const del = (id) => confirm('Delete this enquiry?') && api('DELETE', '/enquiries/' + id).then(load);
  return (
    <section className="panel">
      <h2>Enquiries</h2>
      <div className="seg">
        {['', 'new', 'contacted', 'done'].map((s) => (
          <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s || 'All'}</button>
        ))}
      </div>
      {rows.length === 0 && <p className="empty">No enquiries here.</p>}
      {rows.map((q) => (
        <div className="enq" key={q.id}>
          <div>
            <b>{q.name}</b> <span className={'tag ' + q.status}>{q.status}</span>
            <br />
            <small>{q.phone}{q.email ? ' · ' + q.email : ''} · {q.created_at}</small>
            <p>{q.message}</p>
          </div>
          <div className="act">
            <a className="mini" href={'tel:' + q.phone}>Call</a>
            {q.status !== 'contacted' && <button className="mini" onClick={() => setStatus(q.id, 'contacted')}>Contacted</button>}
            {q.status !== 'done' && <button className="mini" onClick={() => setStatus(q.id, 'done')}>Done</button>}
            <button className="mini danger" onClick={() => del(q.id)}>Delete</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function Content() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api('GET', '/site').then((d) => setS(d.settings));
  }, []);
  if (!s) return null;
  const save = async (e) => {
    e.preventDefault();
    await api('PUT', '/site', s);
    setMsg('Saved ✔');
    setTimeout(() => setMsg(''), 2000);
  };
  return (
    <form className="panel" onSubmit={save}>
      <h2>Website content</h2>
      <div className="fgrid">
        {FIELDS.map(([k, label, full]) => (
          <label key={k} className={full ? 'full' : ''}>
            {label}
            {k === 'about' ? (
              <textarea rows="3" value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
            ) : (
              <input value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
            )}
          </label>
        ))}
      </div>
      <div className="addrow"><button className="btn sm">Save changes</button>{msg && <span>{msg}</span>}</div>
    </form>
  );
}

function Services() {
  const [rows, setRows] = useState([]);
  const [n, setN] = useState({ icon: '✨', title: '', description: '' });
  const load = () => api('GET', '/services').then(setRows);
  useEffect(() => {
    load();
  }, []);
  const add = async (e) => {
    e.preventDefault();
    await api('POST', '/services', n);
    setN({ icon: '✨', title: '', description: '' });
    load();
  };
  return (
    <section className="panel">
      <h2>Services shown on the website</h2>
      {rows.map((r) => (
        <div className="srow" key={r.id}>
          <span>{r.icon} <b>{r.title}</b> {!r.active && <small>(hidden)</small>}<br /><small>{r.description}</small></span>
          <span className="act">
            <button className="mini" onClick={() => api('PUT', '/services/' + r.id, { active: !r.active }).then(load)}>{r.active ? 'Hide' : 'Show'}</button>
            <button className="mini danger" onClick={() => confirm('Delete service?') && api('DELETE', '/services/' + r.id).then(load)}>Delete</button>
          </span>
        </div>
      ))}
      <form className="addrow" onSubmit={add}>
        <input style={{ maxWidth: 70, flex: 'none' }} value={n.icon} onChange={(e) => setN({ ...n, icon: e.target.value })} />
        <input placeholder="Service title" value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} required />
        <input placeholder="Short description" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} />
        <button className="btn sm">Add</button>
      </form>
    </section>
  );
}

export default function Admin() {
  const [session, setS] = useState(getSession());
  const [tab, setTab] = useState('enq');
  const [stats, setStats] = useState({ new: 0, contacted: 0, done: 0 });

  useEffect(() => {
    document.title = 'Admin';
    if (!session) return;
    api('GET', '/enquiries')
      .then((rows) => setStats({ new: rows.filter((r) => r.status === 'new').length, contacted: rows.filter((r) => r.status === 'contacted').length, done: rows.filter((r) => r.status === 'done').length }))
      .catch(() => {
        setSession(null);
        setS(null);
      });
  }, [session, tab]);

  const update = (s) => {
    setSession(s);
    setS(s);
  };
  if (!session) return <Login onLogin={update} />;

  return (
    <>
      <div className="adm-bar">
        <a href="/" className="brand"><span className="mark">A</span>Admin</a>
        <span>
          <a href="/" className="mini">View website</a>{' '}
          <button className="mini" onClick={() => update(null)}>Logout</button>
        </span>
      </div>
      <main className="adm">
        <div className="stats">
          <div className="stat"><b>{stats.new}</b><span>New</span></div>
          <div className="stat"><b>{stats.contacted}</b><span>Contacted</span></div>
          <div className="stat"><b>{stats.done}</b><span>Done</span></div>
        </div>
        <div className="tabs">
          {[['enq', 'Enquiries'], ['content', 'Website content'], ['services', 'Services']].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {tab === 'enq' && <Enquiries />}
        {tab === 'content' && <Content />}
        {tab === 'services' && <Services />}
      </main>
    </>
  );
}
