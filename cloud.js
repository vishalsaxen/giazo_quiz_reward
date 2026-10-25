// Firebase (Firestore + Auth) over plain REST, so the pages need no SDK.
// Collections:
//   entries/{id}  private player rows (name, email, phone, score). Readable only by signed-in admins (see firestore.rules).
//   results/{id}  public rows for the leaderboard (masked email, score, time). Same id as the entry.
//   locks/{id}    one per phone number per quiz per day, so a phone can't enter twice.
//   sellers/{prefix} a seller account's claim on its shop prefix (DES_3210). The seller can then read entries for that prefix.
//   days/{phone}_{date} one per seller per day, naming that day's quiz code.
//   quizzes/{code} each seller's quiz and player link, saved on Save and continue. Admin-only read.
// With no config in firebase-config.js, GiazoCloud.on is false and the app keeps its example data.
(() => {
  const cfg = window.GIAZO_FIREBASE || {};
  const on = !!(cfg.apiKey && cfg.projectId);
  const DB = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents`;
  const KEY = `key=${encodeURIComponent(cfg.apiKey || '')}`;
  const AUTH_KEY = 'giazo-admin-auth';
  const ADMINS = ['vishalsaxen@gmail.com', 'gizee@giazonest.com'];

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
  // Same call for admins and sellers; signUp creates a new seller account.
  async function signIn(email, password, signUp) {
    const r = await call(`https://identitytoolkit.googleapis.com/v1/accounts:${signUp ? 'signUp' : 'signInWithPassword'}?${KEY}`, { method: 'POST', body: JSON.stringify({ email, password, returnSecureToken: true }) });
    saveAuth({ email: r.email, uid: r.localId, token: r.idToken, refresh: r.refreshToken, exp: Date.now() + (+r.expiresIn - 60) * 1000 });
  }
  const uid = () => auth && (auth.uid || (() => { try { return JSON.parse(atob(auth.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).user_id; } catch (_) { return null; } })());
  const needToken = async () => { const t = await token(); if (!t) { const e = new Error('signin'); e.code = 'signin'; throw e; } return t; };
  async function token() {
    if (!auth) return null;
    if (Date.now() < auth.exp) return auth.token;
    try {
      const r = await fetch(`https://securetoken.googleapis.com/v1/token?${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(auth.refresh) });
      const b = await r.json(); if (!r.ok) throw new Error('refresh');
      saveAuth({ email: auth.email, uid: b.user_id, token: b.id_token, refresh: b.refresh_token, exp: Date.now() + (+b.expires_in - 60) * 1000 });
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
    isAdmin: () => !!auth && ADMINS.includes(String(auth.email).toLowerCase()),
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
    async entriesOn(date) { return query('entries', 'date', date, await needToken()); },
    // Private: entries for one quiz code (the admin, or the seller who claimed its shop prefix).
    async entriesFor(code) { return query('entries', 'code', code, await needToken()); },
    // Shop prefixes (DES_3210) this seller account has claimed.
    async myShops() { return (await query('sellers', 'owner', uid(), await needToken())).map(d => d.id); },
    // Claim a shop prefix for this seller account. Throws { code: 'taken' } if another account has it.
    async claimShop(prefix, date) {
      const t = await needToken();
      try { await call(`${DB}/sellers?documentId=${prefix}&${KEY}`, { method: 'POST', body: JSON.stringify({ fields: toFields({ owner: uid(), email: auth.email, at: date }) }) }, t); }
      catch (e) {
        if (e.status !== 409) throw e;
        const mine = await call(`${DB}/sellers/${prefix}?${KEY}`, {}, t).then(() => true, () => false);
        if (!mine) { const x = new Error('taken'); x.code = 'taken'; throw x; }
      }
    },
    // Public: results for one quiz code.
    resultsFor: code => query('results', 'code', code),
    // Public: every result on a date.
    resultsOn: date => query('results', 'date', date),
    // Post a seller's quiz: one per seller (phone number) per day. Returns { code } of the day's quiz;
    // existing: true means the seller had already posted today and nothing new was saved.
    async postQuiz(q) {
      const pkey = `${String(q.phone).replace(/\D/g, '')}_${q.date}`;
      try { await call(`${DB}/days?documentId=${pkey}&${KEY}`, { method: 'POST', body: JSON.stringify({ fields: toFields({ code: q.code, date: q.date }) }) }); }
      catch (e) {
        if (e.status !== 409) throw e;
        const d = fromDoc(await call(`${DB}/days/${pkey}?${KEY}`));
        return { code: d.code, existing: true };
      }
      try { await call(`${DB}/quizzes?documentId=${encodeURIComponent(q.code)}&${KEY}`, { method: 'POST', body: JSON.stringify({ fields: toFields(Object.assign({ pkey }, q)) }) }); }
      catch (e) { if (e.status === 409) return { code: q.code, existing: true }; throw e; }
      return { code: q.code, existing: false };
    },
    // Public: one quiz by its code (the short player link reads its prize details from here).
    getQuiz: async code => fromDoc(await call(`${DB}/quizzes/${encodeURIComponent(code)}?${KEY}`)),
    // Private: every quiz posted on a date (signed-in admin only).
    async quizzesOn(date) { return query('quizzes', 'date', date, await needToken()); },
  };
})();
