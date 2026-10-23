// Firebase (Firestore + Auth) over plain REST, so the pages need no SDK.
// Collections:
//   entries/{id}  private player rows (name, email, phone, score). Readable only by signed-in admins (see firestore.rules).
//   results/{id}  public rows for the leaderboard (masked email, score, time). Same id as the entry.
//   locks/{id}    one per phone number per quiz per day, so a phone can't enter twice.
// With no config in firebase-config.js, GiazoCloud.on is false and the app keeps its example data.
(() => {
  const cfg = window.GIAZO_FIREBASE || {};
  const on = !!(cfg.apiKey && cfg.projectId);
  const DB = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents`;
  const KEY = `key=${encodeURIComponent(cfg.apiKey || '')}`;
  const AUTH_KEY = 'giazo-admin-auth';

  // ---------- Firestore value <-> JS ----------
  const toVal = v => v === null || v === undefined ? { nullValue: null }
    : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
    : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) };
  const toFields = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toVal(v)]));
  const fromVal = v => 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'nullValue' in v ? null : v.stringValue;
  const fromDoc = d => Object.assign({ id: d.name.split('/').pop() }, Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, fromVal(v)])));

  async function call(url, opts = {}, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = await fetch(url, Object.assign({ headers }, opts));
    const body = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((body.error && body.error.message) || r.statusText); e.status = r.status; throw e; }
    return body;
  }
  const hash = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);

  // ---------- admin sign-in (Firebase Auth, email + password) ----------
  let auth = null;
  try { auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (_) {}
  const saveAuth = a => { auth = a; try { a ? localStorage.setItem(AUTH_KEY, JSON.stringify(a)) : localStorage.removeItem(AUTH_KEY); } catch (_) {} };
  async function signIn(email, password) {
    const r = await call(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?${KEY}`, { method: 'POST', body: JSON.stringify({ email, password, returnSecureToken: true }) });
    saveAuth({ email: r.email, token: r.idToken, refresh: r.refreshToken, exp: Date.now() + (+r.expiresIn - 60) * 1000 });
  }
  async function token() {
    if (!auth) return null;
    if (Date.now() < auth.exp) return auth.token;
    try {
      const r = await fetch(`https://securetoken.googleapis.com/v1/token?${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(auth.refresh) });
      const b = await r.json(); if (!r.ok) throw new Error('refresh');
      saveAuth({ email: auth.email, token: b.id_token, refresh: b.refresh_token, exp: Date.now() + (+b.expires_in - 60) * 1000 });
      return auth.token;
    } catch (_) { saveAuth(null); return null; }
  }

  // ---------- queries ----------
  async function query(collection, field, value, tok) {
    const rows = await call(`${DB}:runQuery?${KEY}`, { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: toVal(value) } }, limit: 1000 } }) }, tok);
    return rows.filter(r => r.document).map(r => fromDoc(r.document));
  }

  window.GiazoCloud = {
    on,
    signedIn: () => !!auth,
    adminEmail: () => auth && auth.email,
    signIn,
    signOut: () => saveAuth(null),
    // A player enters today's quiz. Returns { id } or throws { code: 'dup-email' | 'dup-phone' }.
    async enter(p) {
      const id = `${p.date}_${p.code}_${await hash(p.email)}`;
      const lock = `${p.date}_${p.code}_${await hash(p.phone.replace(/\D/g, ''))}`;
      const dup = code => { const e = new Error(code); e.code = code; return e; };
      try { await call(`${DB}/locks?documentId=${lock}&${KEY}`, { method: 'POST', body: JSON.stringify({ fields: toFields({ at: p.date }) }) }); }
      catch (e) { if (e.status === 409) throw dup('dup-phone'); throw e; }
      const common = { code: p.code, date: p.date, status: 'playing', shop: p.shop, prod: p.prod, prize: p.prize };
      try { await call(`${DB}/entries?documentId=${id}&${KEY}`, { method: 'POST', body: JSON.stringify({ fields: toFields(Object.assign({ name: p.name, email: p.email, phone: p.phone }, common)) }) }); }
      catch (e) { if (e.status === 409) throw dup('dup-email'); throw e; }
      await call(`${DB}/results?documentId=${id}&${KEY}`, { method: 'POST', body: JSON.stringify({ fields: toFields(Object.assign({ masked: p.masked }, common)) }) });
      return { id };
    },
    // Save the final score on both the private entry and the public result.
    async finish(id, score, secs) {
      const mask = 'updateMask.fieldPaths=status&updateMask.fieldPaths=score&updateMask.fieldPaths=secs&currentDocument.exists=true';
      const body = JSON.stringify({ fields: toFields({ status: 'done', score, secs }) });
      await Promise.all(['entries', 'results'].map(c => call(`${DB}/${c}/${id}?${mask}&${KEY}`, { method: 'PATCH', body })));
    },
    // Private: every entry on a date (signed-in admin only).
    async entriesOn(date) { const t = await token(); if (!t) { const e = new Error('signin'); e.code = 'signin'; throw e; } return query('entries', 'date', date, t); },
    // Public: results for one quiz code.
    resultsFor: code => query('results', 'code', code),
  };
})();
