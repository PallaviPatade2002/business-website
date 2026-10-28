import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const YEAR = new Date().getFullYear();
const STEPS = [
  { n: '01', t: 'Tell us what you need', d: 'Fill the short enquiry form or message us on WhatsApp.' },
  { n: '02', t: 'We call you back', d: 'We reply quickly, understand your need and share a clear quote.' },
  { n: '03', t: 'We get it done', d: 'Work delivered on time, with support even after it is done.' },
];

// Adds the "in" class once an element scrolls into view (drives the reveal animations).
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.15 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
}

function EnquiryForm() {
  const [f, setF] = useState({ name: '', phone: '', email: '', message: '' });
  const [state, setState] = useState('idle'); // idle | sending | done
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setState('sending');
    try {
      await api('POST', '/enquiries', f);
      setState('done');
      setF({ name: '', phone: '', email: '', message: '' });
    } catch (e2) {
      setErr(e2.message);
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <div className="form-card success">
        <svg viewBox="0 0 52 52" className="tick" aria-hidden="true">
          <circle cx="26" cy="26" r="24" />
          <path d="M14 27l8 8 16-17" />
        </svg>
        <h3>Thank you!</h3>
        <p>We have received your enquiry and will call you back shortly.</p>
        <button className="btn ghost" onClick={() => setState('idle')}>Send another</button>
      </div>
    );
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <h3>Send us an enquiry</h3>
      <div className="grid2">
        <label>Your name<input value={f.name} onChange={set('name')} placeholder="Full name" required /></label>
        <label>Phone<input value={f.phone} onChange={set('phone')} placeholder="10-digit number" inputMode="tel" required /></label>
      </div>
      <label>Email <small>(optional)</small><input type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" /></label>
      <label>How can we help?<textarea rows="4" value={f.message} onChange={set('message')} placeholder="Tell us a little about what you need" required /></label>
      {err && <p className="form-err" role="alert">{err}</p>}
      <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send enquiry'}</button>
    </form>
  );
}

export default function Site() {
  const [site, setSite] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    api('GET', '/site').then((s) => {
      setSite(s);
      document.title = s.settings.business_name;
      loaded.current = true;
    }).catch(() => setSite({ settings: {}, services: [] }));
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useReveal();

  if (!site) return <div className="boot"><span /></div>;
  const s = site.settings;
  const name = s.business_name || 'Your Business';
  const wa = `https://wa.me/${s.whatsapp || ''}?text=${encodeURIComponent('Hi, I would like to know more.')}`;
  const go = () => setMenu(false);

  return (
    <>
      <header className={'nav' + (scrolled ? ' scrolled' : '')}>
        <div className="wrap nav-in">
          <a href="#top" className="brand"><span className="mark">{name.charAt(0)}</span>{name}</a>
          <button className="burger" aria-label="Menu" onClick={() => setMenu(!menu)}><i /><i /><i /></button>
          <nav className={menu ? 'open' : ''}>
            <a href="#services" onClick={go}>Services</a>
            <a href="#how" onClick={go}>How it works</a>
            <a href="#about" onClick={go}>About</a>
            <a href="#contact" className="btn sm" onClick={go}>Get a quote</a>
          </nav>
        </div>
      </header>

      <section className="hero" id="top">
        <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
        <div className="wrap hero-in">
          <span className="pill rise" style={{ '--d': '0ms' }}>● Open for new customers</span>
          <h1 className="rise" style={{ '--d': '100ms' }}>{name}</h1>
          <p className="lead rise" style={{ '--d': '200ms' }}>{s.tagline}</p>
          <div className="cta rise" style={{ '--d': '300ms' }}>
            <a href="#contact" className="btn lg">Send an enquiry</a>
            <a href={wa} target="_blank" rel="noopener" className="btn lg ghost light">Chat on WhatsApp</a>
          </div>
          <ul className="chips rise" style={{ '--d': '420ms' }}>
            <li>⚡ Quick reply</li><li>🧾 Free quote</li><li>📍 Local &amp; trusted</li>
          </ul>
        </div>
      </section>

      <section id="services" className="sec">
        <div className="wrap">
          <p className="eyebrow reveal">What we do</p>
          <h2 className="reveal">Services built around you</h2>
          <div className="cards">
            {site.services.map((sv, i) => (
              <article className="card reveal" style={{ '--d': i * 90 + 'ms' }} key={sv.id}>
                <span className="ico">{sv.icon}</span>
                <h3>{sv.title}</h3>
                <p>{sv.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="sec alt">
        <div className="wrap">
          <p className="eyebrow reveal">Simple process</p>
          <h2 className="reveal">How it works</h2>
          <div className="steps">
            {STEPS.map((st, i) => (
              <div className="step reveal" style={{ '--d': i * 120 + 'ms' }} key={st.n}>
                <b>{st.n}</b>
                <h3>{st.t}</h3>
                <p>{st.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="sec">
        <div className="wrap split">
          <div className="reveal">
            <p className="eyebrow">About us</p>
            <h2>Honest work, happy customers</h2>
            <p className="muted">{s.about}</p>
          </div>
          <div className="info reveal" style={{ '--d': '120ms' }}>
            <div><span>📞</span><div><small>Call us</small><a href={`tel:${(s.phone || '').replace(/\s/g, '')}`}>{s.phone}</a></div></div>
            <div><span>✉️</span><div><small>Email</small><a href={`mailto:${s.email}`}>{s.email}</a></div></div>
            <div><span>📍</span><div><small>Visit</small>{s.address}</div></div>
            <div><span>🕘</span><div><small>Hours</small>{s.hours}</div></div>
          </div>
        </div>
      </section>

      <section id="contact" className="sec contact">
        <div className="wrap split">
          <div className="reveal">
            <p className="eyebrow light">Contact</p>
            <h2 className="light">Let&apos;s talk about your requirement</h2>
            <p className="light-muted">Share a few details and we will call you back. You can also reach us directly on WhatsApp.</p>
            <a href={wa} target="_blank" rel="noopener" className="btn ghost light">WhatsApp us</a>
          </div>
          <div className="reveal" style={{ '--d': '120ms' }}><EnquiryForm /></div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">© {YEAR} {name}. All rights reserved.</div>
      </footer>

      <a href={wa} target="_blank" rel="noopener" className="wa" aria-label="Chat on WhatsApp">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /></svg>
      </a>
    </>
  );
}
