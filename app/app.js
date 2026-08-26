/* Sidekick — app.js  (all screens + logic + PWA boot)
 * Local-first freelance-admin PWA. Vanilla JS + IndexedDB + Service Worker.
 * NO backend, NO secrets, NO external CDNs. English-only MVP; i18n engine is
 * built so Thai (or any locale) can be added later by extending I18N.
 *
 * VERSION LOCKSTEP: APP_VERSION tracks sw.js SW_VERSION and the ?v= query on
 * the precached app.js / styles.css. Bump all three together on every deploy.
 *
 * Formerly "Freelanz Gym" (a personal-gym-trainer-focused fork of the general
 * "Freelanz" app). Rebranded to Sidekick and promoted to be the flagship app —
 * see RENAME/MIGRATION below for how existing local data carries over.
 */
const APP_VERSION = '0.9.50';          // <-> sw.js SW_VERSION 'sidekick-v0.9.50'

// ─── DB ───────────────────────────────────────────────────────────────
// Per-uid keyed stores (guest uid = 'guest'). M1 actively uses users / jobs /
// expenses / settings; clients / invoices / documents / meta / outbox are
// created now (dormant) so M2/M3 features and a future sync layer can land
// without a schema migration.
let db;
// DB_VER bumped 1→2 in M1.5 ('services'), 2→3 in M3 ('bookings'/'followups'/
// 'portfolio' — the M2 invoices/documents stores were added under the old v2
// without a version bump, so onupgradeneeded never re-fired for existing v2
// databases; this bump fixes that too, since the guarded creates below run
// for ANY store still missing, not just the three new ones), 3→4 in M5
// ('research'), 4→5 ('memberTags' — retired; the store creation line was
// removed once Member Tags merged into the Client system, see saveJob()),
// 5→6 ('usageEvents' — local usage analytics), 6→7 ('packages' — session
// bundles, e.g. "buy 10, track remaining"; 'progressLogs' — per-client
// weight/notes entries over time). onupgradeneeded only CREATES
// missing stores (each guarded by !contains) — it never drops or clears
// existing stores, so guest jobs / clients / settings survive the upgrade.
const DB_NAME = 'sidekick-v1', DB_VER = 7;
// RENAME/MIGRATION: this app used to be "Freelanz Gym" (DB_NAME
// 'freelanz-gym-v1'), namespaced that way because it co-hosted with a
// separate "Freelanz" app on the same GitHub Pages origin. That sibling app
// has been retired and this one promoted to be the flagship — see
// migrateLegacyStorageIfNeeded() below, which one-time-copies any existing
// local data (IndexedDB stores + the logged-in session + UI prefs) from the
// old names into the new ones, so nobody's on-device data is silently
// orphaned by the rename.
const LEGACY_DB_NAME = 'freelanz-gym-v1';
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('users')) {
        const u = d.createObjectStore('users', {keyPath:'id', autoIncrement:true});
        u.createIndex('username', 'username', {unique:true});
      }
      if (!d.objectStoreNames.contains('jobs'))      d.createObjectStore('jobs',      {keyPath:'id', autoIncrement:true});
      if (!d.objectStoreNames.contains('expenses'))  d.createObjectStore('expenses',  {keyPath:'id', autoIncrement:true});
      if (!d.objectStoreNames.contains('clients'))   d.createObjectStore('clients',   {keyPath:'id', autoIncrement:true});
      if (!d.objectStoreNames.contains('services'))  d.createObjectStore('services',  {keyPath:'id', autoIncrement:true}); // M1.5 catalog
      if (!d.objectStoreNames.contains('invoices'))  d.createObjectStore('invoices',  {keyPath:'id', autoIncrement:true});
      if (!d.objectStoreNames.contains('documents')) d.createObjectStore('documents', {keyPath:'id', autoIncrement:true});
      if (!d.objectStoreNames.contains('bookings'))  d.createObjectStore('bookings',  {keyPath:'id', autoIncrement:true}); // M3 day view
      if (!d.objectStoreNames.contains('followups')) d.createObjectStore('followups', {keyPath:'id', autoIncrement:true}); // M3 CRM snooze/dismiss state
      if (!d.objectStoreNames.contains('portfolio')) d.createObjectStore('portfolio', {keyPath:'id', autoIncrement:true}); // M3 showcase
      if (!d.objectStoreNames.contains('research'))  d.createObjectStore('research',  {keyPath:'id', autoIncrement:true}); // M5 content library
      if (!d.objectStoreNames.contains('usageEvents')) d.createObjectStore('usageEvents', {keyPath:'id', autoIncrement:true}); // local-only usage analytics (never leaves this device)
      if (!d.objectStoreNames.contains('packages'))    d.createObjectStore('packages',    {keyPath:'id', autoIncrement:true}); // session bundles
      if (!d.objectStoreNames.contains('progressLogs')) d.createObjectStore('progressLogs', {keyPath:'id', autoIncrement:true}); // per-client weight/notes over time
      if (!d.objectStoreNames.contains('settings'))  d.createObjectStore('settings',  {keyPath:'key'});
      if (!d.objectStoreNames.contains('meta'))      d.createObjectStore('meta',      {keyPath:'key'});   // dormant (future sync)
      if (!d.objectStoreNames.contains('outbox'))    d.createObjectStore('outbox',    {keyPath:'key', autoIncrement:true}); // dormant
    };
    req.onsuccess = e => {
      db = e.target.result;
      // If another tab opens a newer version, close this connection so its
      // upgrade isn't blocked (and doesn't wedge). No silent hang.
      db.onversionchange = () => { db.close(); location.reload(); };
      res(db);
    };
    req.onerror = () => rej(req.error);
    // Another tab holds an older-version connection open: surface it instead of hanging forever.
    req.onblocked = () => rej(new Error('DB upgrade blocked — close other Sidekick tabs and reload.'));
  });
}
// One-time carry-over from the pre-rebrand "Freelanz Gym" database/session/UI-pref
// names into the new Sidekick ones, so a browser that already had local data
// doesn't get silently logged out or see an empty account after the rename.
// Guarded by a flag so it only ever runs once per browser; safe to no-op if
// the legacy DB never existed (a fresh install) or the browser doesn't support
// indexedDB.databases() (older Safari/Firefox — skips migration rather than
// crashing boot, since this is a best-effort convenience, not the data itself).
const LEGACY_MIGRATION_FLAG = 'sidekick_migrated_from_freelanz_gym';
async function migrateLegacyStorageIfNeeded() {
  if (localStorage.getItem(LEGACY_MIGRATION_FLAG)) return;
  try {
    const hasLegacyDb = typeof indexedDB.databases === 'function'
      ? (await indexedDB.databases()).some(d => d.name === LEGACY_DB_NAME)
      : false;
    if (hasLegacyDb) {
      const legacyDb = await new Promise((res, rej) => {
        const req = indexedDB.open(LEGACY_DB_NAME);   // no version arg — opens as-is, never triggers an upgrade
        req.onsuccess = e => res(e.target.result);
        req.onerror = () => rej(req.error);
      });
      for (const storeName of Array.from(legacyDb.objectStoreNames)) {
        if (!db.objectStoreNames.contains(storeName)) continue;   // e.g. retired 'memberTags'
        const rows = await new Promise(res => {
          legacyDb.transaction(storeName, 'readonly').objectStore(storeName).getAll().onsuccess = e => res(e.target.result);
        });
        for (const row of rows) {
          // put() (not add()) preserves each row's original id/key, so
          // cross-store references (jobs.clientId -> clients.id, etc.) stay intact.
          await new Promise(res => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).put(row);
            tx.oncomplete = () => res();
          });
        }
      }
      legacyDb.close();
    }
    // Carry over the logged-in session and UI prefs too, so a returning user
    // isn't bounced to the login screen or has their language/theme reset.
    const legacyPairs = [
      ['freelanz_gym_uid', SESSION_KEY],
      ['gym_guest_username', 'sidekick_guest_username'],
      ['gym_guest_counter', 'sidekick_guest_counter'],
      ['gym_ui_lang', 'sidekick_ui_lang'],
      ['gym_ui_theme', 'sidekick_ui_theme'],
    ];
    legacyPairs.forEach(([oldKey, newKey]) => {
      const v = localStorage.getItem(oldKey);
      if (v != null && localStorage.getItem(newKey) == null) localStorage.setItem(newKey, v);
    });
  } catch (e) { console.error('migrateLegacyStorageIfNeeded', e); }
  localStorage.setItem(LEGACY_MIGRATION_FLAG, '1');
}
function dbAll(store) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = e => res(e.target.result);
    req.onerror = () => rej(req.error);
  });
}
function dbPut(store, obj) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(obj);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
function dbAdd(store, obj) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(obj);
    req.onsuccess = () => res(req.result);
    req.onerror = e => { e.preventDefault(); rej(req.error); };
  });
}
function dbDel(store, id) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}
function dbGet(store, key) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = e => res(e.target.result);
    req.onerror = () => rej(req.error);
  });
}
function dbGetByUsername(username) {
  return new Promise((res, rej) => {
    const tx = db.transaction('users', 'readonly');
    const req = tx.objectStore('users').index('username').get(username);
    req.onsuccess = e => res(e.target.result);
    req.onerror = () => rej(req.error);
  });
}
function cuid() { return crypto.randomUUID ? crypto.randomUUID() : 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
function nowISO() { return new Date().toISOString(); }

// ─── AUTH ─────────────────────────────────────────────────────────────
const SESSION_KEY = 'sidekick_uid';
let currentUser = null;
let authMode = 'login';
let isGuest = false;

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
}
function randomSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2,'0')).join('');
}
const PBKDF2_ITERS = 100000;
async function hashPassword(password, salt, iters) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {name:'PBKDF2', hash:'SHA-256', salt: enc.encode(salt), iterations: iters},
    key, 256
  );
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2,'0')).join('');
}
function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-register').classList.toggle('active', mode === 'register');
  document.getElementById('auth-confirm-wrap').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('auth-name-wrap').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('auth-submit').textContent = mode === 'register' ? t('create_account') : t('login');
  document.getElementById('auth-pass').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  authError('');
}
function authError(msg) {
  const el = document.getElementById('auth-err');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', !!msg);
}
// Stable per-device guest identity (label only; all guest data lives under the
// fixed uid 'guest' so leaving and re-entering guest mode restores it).
function guestUsername() {
  let u = localStorage.getItem('sidekick_guest_username');
  if (!u) {
    const n = (parseInt(localStorage.getItem('sidekick_guest_counter') || '0', 10) + 1);
    localStorage.setItem('sidekick_guest_counter', String(n));
    u = 'Guest' + String(n).padStart(6, '0');
    localStorage.setItem('sidekick_guest_username', u);
  }
  return u;
}
// Guest data lives under one fixed uid ('guest') per device, so a shared
// device's second guest sees the first guest's data by default — asking
// "resume or start fresh?" only when there's actually something to choose
// between (a brand-new guest on this device skips straight through, no
// extra tap for the common case).
async function loginGuest() {
  if (await guestDataExists()) {
    document.getElementById('s-auth').classList.remove('active');
    document.getElementById('s-guest-choice').classList.add('active');
    const nameEl = document.getElementById('guest-choice-name');
    if (nameEl) nameEl.textContent = guestUsername();
    return;
  }
  await proceedAsGuest();
}
function cancelGuestChoice() {
  document.getElementById('s-guest-choice').classList.remove('active');
  document.getElementById('s-auth').classList.add('active');
}
async function resumeGuest() { await proceedAsGuest(); }
async function startFreshGuest() {
  if (!confirm(t('guest_fresh_confirm'))) return;
  await wipeGuestData();
  await proceedAsGuest();
}
async function proceedAsGuest() {
  isGuest = true;
  currentUser = {id: 0, username: guestUsername()};
  localStorage.setItem(SESSION_KEY, 'guest');
  sessionStorage.setItem('sidekick_post_login_toast', t('welcome') + ', ' + t('guest_name') + '!');
  location.href = './';
}
// Cheap existence check reusing BACKUP_STORES (every uid-scoped store) —
// true the moment any of them holds a guest-uid row.
async function guestDataExists() {
  const lists = await Promise.all(BACKUP_STORES.map(s => dbAll(s)));
  return lists.some(rows => rows.some(r => r.uid === 'guest'));
}
// Erases every guest-uid row across every uid-scoped store, guest-prefixed
// settings, and local usage-analytics events (excluded from BACKUP_STORES
// since backups never carry it, but it's still this guest's data on this
// device) — then drops the remembered guest username/counter so the next
// guestUsername() call mints a genuinely new label, not the erased one's.
async function wipeGuestData() {
  for (const s of BACKUP_STORES) {
    const rows = (await dbAll(s)).filter(r => r.uid === 'guest');
    for (const row of rows) await dbDel(s, row.id);
  }
  const settingsRows = (await dbAll('settings')).filter(r => r.key.startsWith('guest:'));
  for (const row of settingsRows) await dbDel('settings', row.key);
  const events = (await dbAll('usageEvents')).filter(r => r.uid === 'guest');
  for (const row of events) await dbDel('usageEvents', row.id);
  localStorage.removeItem('sidekick_guest_username');
}

// ─── LINE LOGIN ───────────────────────────────────────────────────────
// api/line-login-callback.js hands the verified LINE profile back as a URL
// fragment (never sent to any server) on redirect to this page. Accounts
// are local-only here too — a LINE user is just another 'users' row, keyed
// by username `line:<sub>` so it can't collide with an email/username a
// person would type by hand, with hash:null marking it passwordless (only
// reachable via loginWithLine(), never via submitAuth()'s password check).
function base64UrlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b64url.length % 4) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
// The Vercel deployment is the only origin that runs api/ handlers at all
// (GitHub Pages is 100% static) — so this has to be an absolute cross-origin
// URL, not a relative one that would 404 on GitHub Pages. `returnTo` tells
// the serverless side which of the app's several live origins (GitHub Pages
// root, its /gym/ mirror, or this Vercel project's own static mirror) to
// send the browser back to once LINE's redirect dance is done — each is a
// separate origin with its own separate local IndexedDB, so getting this
// wrong strands the login in the wrong account store.
const LINE_LOGIN_ORIGIN = 'https://sidekickz.vercel.app';
function loginWithLine() {
  const returnTo = encodeURIComponent(location.origin + location.pathname);
  location.href = `${LINE_LOGIN_ORIGIN}/api/line-login-start?returnTo=${returnTo}`;
}
// Returns true if this load was a LINE redirect and login was handled
// (caller should stop its own boot sequence); false otherwise.
async function handleLineLoginRedirect() {
  const hash = location.hash;
  if (!hash) return false;
  const params = new URLSearchParams(hash.slice(1));
  const errCode = params.get('line_error');
  const encoded = params.get('line');
  // Signed proof of this exact, server-verified LINE identity — stored on
  // the local account so a later "Enable cloud backup" click
  // (enableCloudBackup()) can register a real backend account for a
  // password-less LINE login without redoing the OAuth dance. See
  // lib/lineLogin.js's signLineIdentity() header for the full reasoning.
  const lineToken = params.get('lineToken') || null;
  history.replaceState(null, '', location.pathname + location.search);
  if (!errCode && !encoded) return false;
  if (errCode) { authError(t('err_line_login')); return false; }

  let profile;
  try { profile = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))); }
  catch { authError(t('err_line_login')); return false; }
  if (!profile || !profile.sub) { authError(t('err_line_login')); return false; }

  const username = 'line:' + profile.sub;
  let user = await dbGetByUsername(username);
  if (!user) {
    const id = await dbAdd('users', {
      username, salt: null, hash: null, iters: null,
      firstName: profile.name || '', linePicture: profile.picture || '',
      lineAuth: true, lineIdentityToken: lineToken, profileComplete: false, createdAt: nowISO(),
    });
    // Re-fetch the full stored row rather than hand-assembling a slim one —
    // completeLineProfile() below does a keyPath put() of this same object,
    // which replaces the whole record, so it must carry every field
    // (salt/hash/iters/linePicture/etc.), not just the ones used here.
    user = await dbGet('users', id);
  } else if (lineToken && user.lineIdentityToken !== lineToken) {
    // Refresh on every re-login (covers accounts created before this
    // token existed, and just keeps the stored proof from ever going
    // stale) — a plain field update via the same full-object put()
    // pattern used everywhere else in this function.
    user.lineIdentityToken = lineToken;
    await dbPut('users', user);
  }
  // profileComplete is undefined on any account created before this gate
  // existed (password accounts always had a name up front, and earlier LINE
  // sign-ins finished before this field existed) — only an explicit `false`
  // blocks entry, so nobody already-signed-up gets stopped retroactively.
  if (user.profileComplete === false) {
    showLineProfileStep(user);
    return true;
  }
  finishLineLogin(user);
  return true;
}

function finishLineLogin(user) {
  currentUser = { id: user.id, username: user.username, firstName: user.firstName || '' };
  isGuest = false;
  localStorage.setItem(SESSION_KEY, String(user.id));
  sessionStorage.setItem('sidekick_post_login_toast', t('welcome_back') + (user.firstName ? ', ' + user.firstName : '') + '!');
  location.href = './';
}

// First LINE sign-in only: LINE's own display name is sometimes a nickname/
// emoji, not the name the user wants stored — required (no skip), same as
// the equivalent field on password registration, but shown as its own step
// since there's no registration form to fold it into here. The account row
// already exists at this point (created above) but isn't logged into yet —
// SESSION_KEY is only set once this completes, so closing the tab mid-step
// just re-shows this same step next time, rather than leaving a half-signed-
// -in session.
let pendingLineUser = null;
function showLineProfileStep(user) {
  pendingLineUser = user;
  document.getElementById('line-profile-name').value = user.firstName || '';
  document.getElementById('s-auth').classList.remove('active');
  document.getElementById('s-line-profile').classList.add('active');
}
async function completeLineProfile() {
  const firstName = document.getElementById('line-profile-name').value.trim();
  if (!firstName) { document.getElementById('line-profile-err').classList.add('show'); return; }
  document.getElementById('line-profile-err').classList.remove('show');
  const user = { ...pendingLineUser, firstName, profileComplete: true };
  await dbPut('users', user);
  finishLineLogin(user);
}

async function submitAuth() {
  const id0 = document.getElementById('auth-user').value.trim().toLowerCase();
  const password = document.getElementById('auth-pass').value;
  const nameEl = document.getElementById('auth-name');
  const firstName = nameEl ? nameEl.value.trim() : '';
  // Local-only accounts, keyed by email/username string. (No cloud backend in M1.)
  if (!id0 || id0.length < 3) { authError(t('err_id_min3')); return; }
  if (!password || password.length < 8) { authError(t('err_pw_min4')); return; }
  if (authMode === 'register') {
    // 'line:' is a reserved prefix (see handleLineLoginRedirect() above) —
    // without this guard, someone could register e.g. "line:U1234..." by
    // hand and either collide with, or preemptively squat, a real LINE
    // user's account.
    if (id0.startsWith('line:')) { authError(t('err_reserved_username')); return; }
    if (!firstName) { authError(t('err_auth_name_required')); return; }
    if (password !== document.getElementById('auth-confirm').value) { authError(t('err_pw_mismatch')); return; }
    if (await dbGetByUsername(id0)) { authError(t('err_account_exists')); return; }
    const salt = randomSalt();
    const iters = PBKDF2_ITERS;
    const hash = await hashPassword(password, salt, iters);
    const id = await dbAdd('users', {username:id0, salt, hash, iters, firstName, profileComplete: true, createdAt: nowISO()});
    currentUser = {id, username:id0, firstName};
    isGuest = false;
    localStorage.setItem(SESSION_KEY, String(id));
    sessionStorage.setItem('sidekick_post_login_toast', t('welcome') + (firstName ? ', ' + firstName : '') + '!');
    location.href = './';
  } else {
    const user = await dbGetByUsername(id0);
    if (!user) { authError(t('err_no_account')); return; }
    const hash = await hashPassword(password, user.salt, user.iters || PBKDF2_ITERS);
    if (hash !== user.hash) { authError(t('err_incorrect_pw')); return; }
    currentUser = {id: user.id, username: user.username, firstName: user.firstName || ''};
    isGuest = false;
    localStorage.setItem(SESSION_KEY, String(user.id));
    sessionStorage.setItem('sidekick_post_login_toast', t('welcome_back') + (user.firstName ? ', ' + user.firstName : '') + '!');
    location.href = './';
  }
}
async function logout() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.setItem('sidekick_post_login_toast', t('logged_out'));
  location.href = 'login.html';
}
async function restoreSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw === 'guest') { isGuest = true; currentUser = {id: 0, username: 'Guest'}; return true; }
  const uid = parseInt(raw);
  if (uid) {
    const u = (await dbAll('users')).find(x => x.id === uid);
    if (u) { currentUser = {id: u.id, username: u.username, firstName: u.firstName || ''}; isGuest = false; return true; }
    localStorage.removeItem(SESSION_KEY);
  }
  return false;
}

// ─── STATE ────────────────────────────────────────────────────────────
let jobs = [], expenses = [], customers = [], services = [], usageEvents = [], packages = [], settings = {lang:'th', currency:'THB'};
let currentPeriod = 'month';

// HTML/attr escaping (shared by all list/form renderers)
function htmlEsc(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function attrEsc(s) { return htmlEsc(s).replace(/"/g,'&quot;'); }

const CURRENCY_SYM = {THB:'฿', USD:'$', EUR:'€', GBP:'£', SGD:'S$', MYR:'RM'};
function curSym() { return CURRENCY_SYM[(settings && settings.currency) || 'THB'] || '฿'; }

// ─── BUSINESS TYPES (persona reintroduced per the 2026 redesign handoff) ──
// Reverses the earlier "Persona strip" decision (commit 848c4e8) on explicit
// user instruction — settings.businessType now genuinely drives seed
// services and the unit word, not just which tracker card renders on a
// client (see clientTrackerHtml()). Existing installs migrate to 'trainer'
// in enterApp() (this app's actual base case up to now), so nobody already
// using it sees any behavior change.
const BUSINESS_TYPES = {
  trainer:    { label:'Personal trainer', unitWord:'Session', seedServices:[['1-on-1 session',800,'session'],['Group class',400,'session'],['Nutrition plan',2000,'plan']] },
  realestate: { label:'Real estate agent', unitWord:'Deal',    seedServices:[['Property viewing',0,'viewing'],['Listing consultation',0,'consult']] },
  laundry:    { label:'Laundry service',   unitWord:'Order',   seedServices:[['Wash & fold',150,'kg'],['Dry cleaning',80,'item']] },
  insurance:  { label:'Insurance agent',   unitWord:'Policy',  seedServices:[['Policy review',0,'review'],['Claim assistance',0,'case']] },
  garage:     { label:'Car garage',        unitWord:'Job',     seedServices:[['Oil change',600,'job'],['Full service',2500,'job']] },
  kol:        { label:'KOL / Influencer',  unitWord:'Campaign',seedServices:[['Content posting',3000,'post'],['Live broadcast + affiliate',8000,'session']] },
  custom:     { label:'Other',             unitWord:'Job',     seedServices:[] },
};
function businessType() { return BUSINESS_TYPES[settings && settings.businessType] ? settings.businessType : 'trainer'; }
function unitWord() { return BUSINESS_TYPES[businessType()].unitWord; }

// Sensible per-persona starting point for a package's unit — "50 pieces of
// laundry," "10 training sessions," "5 policy reviews." Kept as a free-text
// setting (packageUnitLabel), not a fixed list, so a future business type
// this registry doesn't know about yet still works with zero code changes —
// the user just types whatever word fits.
const PACKAGE_UNIT_DEFAULTS = {
  trainer: 'Sessions', realestate: 'Deals', laundry: 'Pieces', insurance: 'Policies', garage: 'Jobs', kol: 'Campaigns', custom: 'Units',
};
function packageUnitLabel() {
  return (settings && settings.packageUnitLabel) || PACKAGE_UNIT_DEFAULTS[businessType()] || 'Units';
}

// ─── ENGAGEMENT PIPELINE (user-facing label: "Workflow" — see i18n) ─────
// A session IS an engagement moving through a fixed 6-stage lifecycle. The
// internal stage id stays `pitch` even though its display label is now
// "Inquiry" — same rename convention as Booking→Calendar, only the
// user-facing text changed:
//   inquiry → initial outreach to/from a prospective client
//   quote   → send a price quote for a session/package
//   booked  → client accepted; can carry zero/one/many linked invoices, and
//             whether money actually came in is a job-level flag (job.paid,
//             see jobEarned() below), not a separate stage
//   deliver → deliver the session(s); a renewal is an explicit action
//             (offerRenewalForClient/spawnRenewalQuoteJob) that spawns a NEW
//             job at 'quote', not a stage this job sits in
// All four are mandatory and always present (no optional/toggleable stage,
// no per-persona presets) — this fixed order IS the business process. Still
// reorderable in Settings ▸ Stage order for personal preference, guarded so
// Deliver can't precede Booked.
//
// 2026-07-22 (TSK-014): collapsed from the original 6 stages
// ['pitch','quote','invoice','paid','delivery','extend'] — Invoice+Paid
// folded into Booked, Delivery+Extend folded into Deliver. Existing
// installs' stored job.stage values are remapped once on load — see
// migrateJobStagesToV2IfNeeded().
const STAGES = ['inquiry', 'quote', 'booked', 'deliver'];
// dot: a distinct per-stage color used by the Booking calendar's activity
// legend (bookings.js) to show which stage(s) a day's engagements are in —
// chosen to read clearly at a few px each, separate from the semantically-
// loaded --paid/--due/--overdue vars used elsewhere for invoice status.
// label/action/done/hint hold i18n KEYS, not display text — every consumer
// must resolve them with t() (e.g. t(meta.label)), never read raw. Keeping
// the field names but swapping their values to keys (rather than adding new
// labelKey/actionKey fields) is a deliberate minimal-diff choice: every call
// site already reads `meta.label` etc, so only the read needs a `t()`
// wrapper, not a field rename everywhere.
const STAGE_META = {
  inquiry: {label:'stage_inquiry_label', dot:'#64748B', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;display:inline-block;vertical-align:middle"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>', action:'stage_inquiry_action', done:'stage_inquiry_done', hint:'stage_inquiry_hint'},
  quote:   {label:'stage_quote_label',   dot:'#8B5CF6', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;display:inline-block;vertical-align:middle"><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/></svg>', action:'stage_quote_action', done:'stage_quote_done', skippable:true, hint:'stage_quote_hint'},
  booked:  {label:'stage_booked_label',  dot:'#F59E0B', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;display:inline-block;vertical-align:middle"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h4"/></svg>', action:'stage_booked_action', done:'stage_booked_done', hint:'stage_booked_hint'},
  deliver: {label:'stage_deliver_label', dot:'#22554B', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;display:inline-block;vertical-align:middle"><path d="M14.5 5.5a3.5 3.5 0 0 0-4.6 4.4L4 15.8V20h4.2l5.9-5.9a3.5 3.5 0 0 0 4.4-4.6l-2.3 2.3-2-2z"/></svg>', action:'stage_deliver_action', done:'stage_deliver_done', hint:'stage_deliver_hint'},
};
const DEFAULT_STAGE_ORDER = STAGES.slice();
function getStageOrder() {
  const s = settings && settings.stageOrder;
  if (Array.isArray(s) && s.length === STAGES.length && s.every(x => STAGES.includes(x)) && new Set(s).size === s.length) {
    return s.slice();
  }
  return DEFAULT_STAGE_ORDER.slice();
}
// The stage order snapshotted onto a session at creation, so a later reorder
// in Settings never remaps an already-in-flight engagement out from under it.
function jobOrder(j) {
  const o = j && j.stageOrder;
  if (Array.isArray(o) && o.length && o.every(x => STAGES.includes(x)) && new Set(o).size === o.length) return o.slice();
  return getStageOrder();
}
// Current stage of a session within its own order. Legacy sessions (no stage)
// or ones whose stored stage was toggled out of the order fall back sensibly.
function jobStage(j) {
  const order = jobOrder(j);
  if (j.stage && order.includes(j.stage)) return j.stage;
  if (j.stage && !order.includes(j.stage)) return order[0];   // stage removed from order → restart at first
  return order[order.length - 1];                              // legacy (no stage) → final stage
}
// Legacy sessions (logged before this feature existed, no stage recorded) are
// treated as completed engagements (Done) — they represent already-earned work.
function jobComplete(j) {
  if (j.complete) return true;
  if (j.stage == null) return true;
  return false;
}
// A session "ships" (counts against a package) once it reaches Deliver or
// later in its own stage order, or is otherwise complete — matches the
// business meaning of "delivery" regardless of where a reorder puts it.
// A job's money is EARNED once it has actually been paid — TSK-014: 'paid'
// is no longer a pipeline stage (a job can sit at Booked with any number of
// invoices, paid or not), so this is now a plain job-level flag rather than
// a stage-index comparison. Set by markJobPaid()/the invoice-paid reverse
// hook (onInvoiceMarkedPaid), and by the cash-job path. This is the single
// predicate behind Home's "Earned this month" and the goal card, which used
// to count every job by date alone (pitch-stage AND lost deals inflated the
// headline number — the honesty bug the product re-assessment ranked
// first) — a job merely reaching Booked must NOT count as earned.
function jobEarned(j) {
  return !!j.paid;
}
function jobDelivered(j) {
  // A lost engagement (outcome 'lost') never shipped anything — it only
  // counts as delivered if its stage genuinely reached Deliver before the
  // client walked away (the stage check below), never via the blanket
  // "complete ⇒ delivered" shortcut, which would wrongly burn package
  // sessions (packageUsed()) for a deal that died at Inquiry.
  if (jobComplete(j) && j.outcome !== 'lost') return true;
  const order = jobOrder(j);
  const deliverIdx = order.indexOf('deliver');
  const idx = order.indexOf(jobStage(j));
  return deliverIdx >= 0 && idx >= deliverIdx;
}
// True exactly when the single next stage-advance would cross this job into
// "delivered" for the first time (not already there) — the one moment a
// package-linked job needs its quantity confirmed, since that's when it
// first counts against the package (see jobDelivered() above).
function entersDeliverOnAdvance(j) {
  const order = jobOrder(j);
  const idx = order.indexOf(jobStage(j));
  const deliverIdx = order.indexOf('deliver');
  if (idx < 0 || deliverIdx < 0) return false;
  return idx < deliverIdx && (idx + 1) >= deliverIdx;
}

// ─── PACKAGES (N-unit bundles, e.g. "buy 10 sessions" / "50 pieces of laundry") ──
// Remaining is always computed live from `jobs` rather than decremented and
// stored, so it can never drift out of sync with a session being
// re-opened/un-delivered later. Sums each delivered job's own `count` (how
// many units THAT delivery used — e.g. 12 pieces this drop-off), falling
// back to 1 per job when count isn't set, so existing trainer packages
// (always 1 session per job) behave exactly as before with no migration.
function packageUsed(pkg) {
  return jobs
    .filter(j => j.packageId === pkg.id && jobDelivered(j))
    .reduce((sum, j) => sum + (Number(j.count) > 0 ? Number(j.count) : 1), 0);
}
// TSK-023 (money-field removal): a package-linked job never captures its own
// Fee — the money was already paid once, at package purchase (pkg.price).
// This attributes THIS delivery's share of that purchase (count/totalSessions
// * price) onto the job record itself, so Home/the goal card/CSV export
// (which all just read job.amount/netAmount, unchanged) correctly count
// package-delivered work as revenue instead of the ฿0 every package session
// silently reported before this pass (package.price was write-only until
// now — nothing read it back). Mutates `j` in place; callers still persist
// it themselves alongside whatever else they're saving (j.count, stage...).
function applyPackageRevenue(j, pkg) {
  const total = Number(pkg && pkg.totalSessions) || 0;
  const cnt = Number(j.count) || 0;
  j.amount = total > 0 ? (cnt / total) * (Number(pkg.price) || 0) : 0;
  j.tip = 0;
  j.expense = 0;
  j.netAmount = j.amount;
}
// A single check point for expiry: once expiresAt passes, any unused
// balance is forfeited (not carried over) — this is the only place that
// needs to know about expiry, since activePackageFor()'s own
// `packageRemaining(p) > 0` filter then naturally excludes an expired
// package with no further changes needed there.
function packageIsExpired(pkg) {
  return !!(pkg.expiresAt && pkg.expiresAt < todayISO());
}
function packageRemaining(pkg) {
  if (packageIsExpired(pkg)) return 0;
  return Math.max(0, (Number(pkg.totalSessions) || 0) - packageUsed(pkg));
}
// Remaining ignoring expiry — only used to tell "expired with balance
// forfeited" apart from "genuinely used up," so the status message can say
// which actually happened instead of showing the same generic empty state.
function packageRemainingIgnoringExpiry(pkg) {
  return Math.max(0, (Number(pkg.totalSessions) || 0) - packageUsed(pkg));
}
// The package a new session should offer to apply to: the client's most
// recently purchased package that still has sessions left, or null.
// `serviceId` (optional) scopes the match to packages bought against that
// specific catalog service — a client can hold separate, independently-
// tracked packages for different services (e.g. "1-on-1 training" 9/10 and
// "Nutrition consult" 3/5 at once), and applying a job to the wrong one
// would silently deduct from an unrelated service's balance. Callers that
// only ever care about "does this client have any active package at all"
// (the Clients list badge, Home's expiry/almost-done nudges, the standalone
// package fast-path) omit serviceId and keep the old any-package behavior.
function activePackageFor(clientId, serviceId) {
  const mine = packages.filter(p => p.clientId === clientId && (serviceId == null || p.serviceId === serviceId))
    .sort((a, b) => (b.purchasedDate || '').localeCompare(a.purchasedDate || '') || (b.id || 0) - (a.id || 0));
  return mine.find(p => packageRemaining(p) > 0) || null;
}
function clientPackages(clientId) {
  return packages.filter(p => p.clientId === clientId)
    .sort((a, b) => (b.purchasedDate || '').localeCompare(a.purchasedDate || '') || (b.id || 0) - (a.id || 0));
}

// ─── I18N ─────────────────────────────────────────────────────────────
// t(key) resolves a persona-scoped `key@<workType>` variant first, then the
// base key, then the English fallback, then the raw key. Base (no workType) =
// "Job" wording. Add another locale later by adding I18N.<lang>.
// I18N dictionary + curLang/t/tLang moved verbatim to i18n.js
// (Stage-S1 refactor) - i18n.js loads BEFORE app.js in index.html.
function greetingPeriod() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : (h < 18 ? 'afternoon' : 'evening');
}

// ─── DATES / MONEY ────────────────────────────────────────────────────
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmt(n, dec=0) { return Number(n||0).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}); }
function money(n, dec=0) { return curSym() + fmt(n, dec); }
function netOf(j) { return (Number(j.amount)||0) + (Number(j.tip)||0) - (Number(j.expense)||0); }

// ─── THEME ────────────────────────────────────────────────────────────
// Light by default (reverses the 2026 rebrand's "dark by default" decision
// on explicit user instruction). Stored value is one of 'light' | 'dark' |
// 'auto', in localStorage (not the per-uid `settings` DB object) so the
// pre-paint inline script in index.html/login.html can read it
// synchronously, before IndexedDB is even open, to avoid a flash of the
// wrong theme.
//   'light' -> dataset.theme = 'light'  (forces light, overrides OS)
//   'dark'  -> dataset.theme = 'dark'   (forces dark, overrides OS)
//   'auto'  -> dataset.theme removed    (styles.css's prefers-color-scheme
//              media query decides, tracking the OS live)
const THEME_KEY = 'sidekick_ui_theme';
function applyTheme() {
  const stored = localStorage.getItem(THEME_KEY) || 'light';
  if (stored === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = (stored === 'dark') ? 'dark' : 'light';
}
async function onThemeChange(v) {
  localStorage.setItem(THEME_KEY, (v === 'dark' || v === 'auto') ? v : 'light');
  applyTheme();
  renderThemeSeg();
}
// TSK-002/007: Theme moved from a native <select id="set-theme"> to a
// 3-button segmented control (reusing the already-declared, previously-
// unwired .seg/.seg button.on CSS — see design-handoff README §5 + the
// research assessment's §3). This just toggles which button carries `.on`;
// onThemeChange() above (unchanged signature, still takes 'light'|'dark'|
// 'auto') does the actual persist + apply.
function renderThemeSeg() {
  const cur = localStorage.getItem(THEME_KEY) || 'light';
  ['light', 'dark', 'auto'].forEach(v => {
    const b = document.getElementById('seg-theme-' + v);
    if (b) b.classList.toggle('on', v === cur);
  });
}

// ─── BOOT ─────────────────────────────────────────────────────────────
function showPostLoginToast() {
  const msg = sessionStorage.getItem('sidekick_post_login_toast');
  if (msg) { sessionStorage.removeItem('sidekick_post_login_toast'); toast(msg); }
}
// login.html entry — already-authed devices skip to the app.
async function bootLogin() {
  applyTheme();
  // Captured before anything else — including before the already-logged-in
  // fast-path a few lines down, which would otherwise redirect straight
  // into index.html and never give this a chance to run. Redeemed in
  // finishAppBoot() (app.js) once a real, non-guest, backend-enabled
  // account is actually logged in — see maybeRedeemTeamInvite().
  const teamInviteToken = new URLSearchParams(location.search).get('teamInvite');
  if (teamInviteToken) sessionStorage.setItem('sidekick_team_invite', teamInviteToken);
  await openDB();
  await migrateLegacyStorageIfNeeded();
  // Runs before handleLineLoginRedirect() (not after, as `showPostLoginToast()`
  // below implies) so the s-line-profile screen it can show is already
  // localized — that early-return path never reaches the applyLang() call
  // that used to sit down here.
  applyLang();
  if (await handleLineLoginRedirect()) return;
  if (await restoreSession()) { location.replace('./'); return; }
  showPostLoginToast();
}
// index.html entry — no session → bounce to login.
async function bootApp() {
  applyTheme();
  { const v = document.getElementById('app-version'); if (v) v.textContent = APP_VERSION; }
  await openDB();
  await migrateLegacyStorageIfNeeded();
  if (!(await restoreSession())) { location.replace('login.html'); return; }
  await enterApp();
  showPostLoginToast();
}
function boot() {
  const page = document.body.dataset.page;
  const run = page === 'login' ? bootLogin : bootApp;
  Promise.resolve().then(run).catch(err => {
    console.error('boot failed', err);
    const msg = (err && err.message ? String(err.message) : 'storage error').replace(/[<>]/g, '');
    document.body.insertAdjacentHTML('afterbegin',
      '<div style="padding:24px;max-width:34rem;margin:0 auto;font:15px/1.5 system-ui;color:#1A2421">' +
      '<b>Couldn’t start Sidekick.</b><br>' + msg +
      '<br><br>Close any other Sidekick tabs and reload.</div>');
  });
}

// ─── TSK-014: one-time 6-stage → 4-stage job migration ─────────────────
// Existing installs' stored job.stage values ('pitch'/'invoice'/'paid'/
// 'delivery'/'extend') need remapping to the new STAGES vocabulary
// (['inquiry','quote','booked','deliver']) on load, not a hard break.
// Modeled on migrateLegacyStorageIfNeeded()'s shape (boot-time, whole-store,
// one-shot, idempotent) rather than migrateClientDealsToOptions()'s
// (per-record/lazy/render-triggered) — this must run for EVERY job
// unconditionally, and BEFORE reload() ever populates the in-memory `jobs`
// array or renderPipeline()/renderHome() read a stage value, since a stale
// 6-stage j.stage leaking into jobEarned()/STAGE_META[stage] would break
// the UI (undefined lookups) on first render. Guarded by a per-uid settings
// flag via the existing saveSetting()/settings mechanism (same pattern as
// settings.stageGateOff) rather than a bare localStorage key, so it's
// correctly scoped per-account on a shared device and survives the
// existing settings-mirroring path.
//
// LEGACY_STAGES/LEGACY_STAGE_MAP are intentionally NOT derived from the
// (already-updated) STAGES/getStageOrder() — those now describe the NEW
// 4-stage world, so the pre-migration index math below needs its own fixed
// copy of the old 6-stage vocabulary to correctly answer "was this job's
// OLD stage 'paid' or later" per job (mirroring jobEarned()'s old
// paidIdx-comparison logic exactly, so no already-earned revenue silently
// disappears from Home/goal-card/tax-rollup after the migration runs).
const LEGACY_STAGES = ['pitch', 'quote', 'invoice', 'paid', 'delivery', 'extend'];
const LEGACY_STAGE_MAP = { pitch: 'inquiry', quote: 'quote', invoice: 'booked', paid: 'booked', delivery: 'deliver', extend: 'deliver' };
async function migrateJobStagesToV2IfNeeded() {
  if (settings.jobStagesV2MigratedAt) return;
  const uid = isGuest ? 'guest' : currentUser.id;
  const rows = (await dbAll('jobs')).filter(j => j.uid === uid);
  for (const j of rows) {
    let touched = false;
    if (j.stage == null) {
      // Pre-dates the stage feature entirely (the original "Freelanz Gym"
      // session log) — jobComplete() already treats these as done, and the
      // old jobEarned() counted them as earned too (jobStage() falls back
      // to the final stage when j.stage is null, which was >= the old
      // paidIdx). Carry that forward as job.paid so the revenue they
      // already contributed to Home/tax doesn't disappear.
      if (!j.paid) { j.paid = true; touched = true; }
    } else if (Object.prototype.hasOwnProperty.call(LEGACY_STAGE_MAP, j.stage)) {
      const legacyOrder = (Array.isArray(j.stageOrder) && j.stageOrder.length === LEGACY_STAGES.length
        && j.stageOrder.every(x => LEGACY_STAGES.includes(x)) && new Set(j.stageOrder).size === j.stageOrder.length)
        ? j.stageOrder.slice() : LEGACY_STAGES.slice();
      const legacyPaidIdx = legacyOrder.indexOf('paid');
      const legacyCurIdx = legacyOrder.indexOf(j.stage);
      const wasEarned = legacyPaidIdx >= 0 && legacyCurIdx >= 0 && legacyCurIdx >= legacyPaidIdx;
      j.stage = LEGACY_STAGE_MAP[j.stage];
      // The job's own stageOrder snapshot can't be remapped position-for-
      // position (a 6-element order doesn't map onto a 4-element one) —
      // reset it to the account's current 4-stage order. jobOrder()'s own
      // validation would have safely fallen back to this anyway for a
      // stale 6-length array, so this is a proactive cleanup, not a
      // behavior change.
      j.stageOrder = STAGES.slice();
      if (wasEarned && !j.paid) j.paid = true;
      // A pending gate banner referencing an old stage name would otherwise
      // point at a STAGE_META entry that no longer exists.
      if (j.pendingGateStage && Object.prototype.hasOwnProperty.call(LEGACY_STAGE_MAP, j.pendingGateStage)) {
        j.pendingGateStage = LEGACY_STAGE_MAP[j.pendingGateStage];
      }
      touched = true;
    }
    if (touched) {
      j.updatedAt = nowISO();
      await dbPut('jobs', j);
      mirrorJob(j);
    }
  }
  await saveSetting('jobStagesV2MigratedAt', nowISO());
}

async function enterApp() {
  document.body.classList.add('authed');
  settings = {lang:'th', currency:'THB'};
  const sAll = await dbAll('settings');
  const prefix = isGuest ? 'guest:' : (currentUser.id + ':');
  sAll.forEach(s => { if (s.key.startsWith(prefix)) settings[s.key.slice(prefix.length)] = s.value; });
  // Pipeline view mode (board | timeline | calendar) — persisted like
  // bookings' calViewMode, mirrored in-memory so renderPipeline (sync)
  // never awaits IDB. Must be set before the reload() below, which
  // triggers the first renderPipeline().
  window.__plView = (settings.plViewMode === 'timeline' || settings.plViewMode === 'calendar') ? settings.plViewMode : 'board';

  // One-time per-account remap of any job still holding a pre-TSK-014 stage
  // value — MUST run before reload() populates the in-memory `jobs` array
  // (and before renderPipeline()/renderHome() ever read a stage value), and
  // needs `settings` (just loaded above) to resolve each job's own
  // pre-migration stage order. See migrateJobStagesToV2IfNeeded()'s own
  // comment for the full rationale.
  await migrateJobStagesToV2IfNeeded();

  await reload();
  applyUser();
  applyLang();
  // reflect settings into controls
  // Tax defaults: TH standard WHT 3% / VAT 7% when the user has not set them.
  // In-memory only (persisted on first change) so M2 tax/invoices can read them.
  if (settings.wht == null) settings.wht = 3;
  if (settings.vat == null) settings.vat = 7;
  const set = (id, v) => { const el = document.getElementById(id); if (el != null && v != null) el.value = v; };
  renderThemeSeg();
  set('set-lang', settings.lang || 'th');
  set('set-currency', settings.currency || 'THB');
  set('set-page-size', settings.docPageSize || 'A4');
  set('set-wht', settings.wht != null ? settings.wht : '');
  set('set-vat', settings.vat != null ? settings.vat : '');
  set('set-seller-name', settings.sellerBusinessName || '');
  set('set-seller-taxid', settings.sellerTaxId || '');
  set('set-seller-address', settings.sellerAddress || '');
  const notifCheckbox = document.getElementById('set-notifications');
  if (notifCheckbox) notifCheckbox.checked = !!(settings.notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const gateCheckbox = document.getElementById('set-stage-gate');
  if (gateCheckbox) gateCheckbox.checked = !settings.stageGateOff;   // stored inverted — default (unset) = on

  // One-time migration: the old single "PromptPay ID" field becomes the
  // first entry in the new payment-channels list, if it was ever set.
  if (!Array.isArray(settings.paymentChannels)) {
    const migrated = settings.promptpayId
      ? [{ id: cuid(), type: 'promptpay', label: 'PromptPay', detail: settings.promptpayId }]
      : [];
    await saveSetting('paymentChannels', migrated);
  }
  renderPaymentChannels();

  // One-time migration: My Task Goal replaces the old single daily-income
  // goal with Month/Quarter/Year targets. A daily figure doesn't map to a
  // period target directly, so this seeds reasonable month/quarter/year
  // figures from it (30x/90x/365x) rather than silently losing the old
  // setting; leaves all three at 0 (goal card stays hidden, same as before)
  // if no daily goal was ever set.
  if (!settings.goalTargets) {
    const monthGuess = (Number(settings.dailyGoal) || 0) * 30;
    await saveSetting('goalTargets', { month: monthGuess, quarter: monthGuess * 3, year: monthGuess * 12 });
  }
  if (!settings.goalPeriod) await saveSetting('goalPeriod', 'month');
  set('set-goal-month', settings.goalTargets.month || '');
  set('set-goal-quarter', settings.goalTargets.quarter || '');
  set('set-goal-year', settings.goalTargets.year || '');

  // TSK-021: the owner asked to stop asking a new account "what kind of
  // business do you run?" at signup, and stop auto-seeding a starter
  // Services catalog from that answer. A genuinely new account/device now
  // defaults straight to 'custom' (BUSINESS_TYPES.custom.seedServices is
  // already empty, so this seeds nothing) with zero interruption to boot —
  // businessType()/unitWord()/persona-scoped i18n variants and the
  // per-persona client tracker all stay fully intact, and still switchable
  // later via Settings (onBusinessTypeChange() re-runs seedServicesIfEmpty()
  // for whatever's newly chosen). choosePersonaOnboard() already does
  // exactly what a manual pick would (set businessType/packageUnitLabel,
  // the data-work-type attribute, the Settings selects) and calls
  // finishAppBoot() itself, so reuse it here rather than duplicating that.
  //
  // The picker (#modal-persona-onboard) survives ONLY for "Try a demo"
  // (login.html?demo=1 sets sidekick_start_demo before redirecting in as a
  // guest) — a prospect choosing their persona there both sets businessType
  // AND seeds a realistic, persona-flavored demo dataset (see
  // choosePersonaOnboard() below), which a silent default would defeat the
  // point of.
  if (!settings.businessType) {
    if (sessionStorage.getItem('sidekick_start_demo')) { showPersonaOnboard(); return; }
    await choosePersonaOnboard('custom');
    return;
  }
  document.body.setAttribute('data-work-type', businessType());
  set('set-business-type', businessType());
  if (!settings.packageUnitLabel) await saveSetting('packageUnitLabel', PACKAGE_UNIT_DEFAULTS[businessType()] || 'Units');
  set('set-package-unit', packageUnitLabel());
  await finishAppBoot();
}

// The rest of boot, once businessType is known — split out of enterApp()
// so the first-run persona picker can pause boot after loading settings/
// applying theme+lang, then resume here once a choice is made.
async function finishAppBoot() {
  // One-time migration: the client-facing ID format changes from "M-xxxx"
  // to "SK-xxxx" per the 2026 redesign spec. Rewrites existing records in
  // place (preserving the numeric sequence) rather than leaving old and new
  // clients on two different-looking ID formats forever.
  if (!settings.memberNoSkMigrated) {
    for (const c of customers) {
      if (typeof c.memberNo === 'string' && c.memberNo.indexOf('M-') === 0) {
        c.memberNo = 'SK-' + c.memberNo.slice(2);
        await dbPut('clients', c);
      }
    }
    await saveSetting('memberNoSkMigrated', true);
  }
  await seedServicesIfEmpty();
  switchScreen('home');
  await maybeShowCloudBackupModal();
  await maybeRedeemTeamInvite();
  await maybeOfferGuestAdoption();
  // Fire-and-forget: populates __entitlements for the Phase 1 feature
  // gates (planHasFeature()/planClientCap()) without delaying boot on a
  // network round trip guest/local-only accounts don't even need.
  refreshEntitlements();

  // App-triggered OS notifications: only fire while this tab stays open (no
  // backend to check conditions while fully closed — see the comment above
  // computeNotificationConditions()). reload() (already called above) fires
  // the first check; this just re-checks every minute after that, mainly for
  // the time-sensitive "booking starting soon" condition.
  setInterval(checkAndFireNotifications, 60000);
}

// TSK-021: the persona picker (index.html's #modal-persona-onboard) is now
// demo-mode only (see enterApp()'s call site) — every real account/guest
// defaults straight to 'custom' instead. Kept deliberately not dismissible
// for the demo case it still serves: enterApp() returns early without
// calling finishAppBoot() above, so nothing else runs until a choice is
// made here.
function showPersonaOnboard() {
  const m = document.getElementById('modal-persona-onboard');
  if (m) m.classList.add('open');
}
async function choosePersonaOnboard(v) {
  if (!BUSINESS_TYPES[v]) return;
  const m = document.getElementById('modal-persona-onboard');
  if (m) m.classList.remove('open');
  await saveSetting('businessType', v);
  await saveSetting('packageUnitLabel', PACKAGE_UNIT_DEFAULTS[v] || 'Units');
  document.body.setAttribute('data-work-type', v);
  const btEl = document.getElementById('set-business-type'); if (btEl) btEl.value = v;
  const puEl = document.getElementById('set-package-unit'); if (puEl) puEl.value = packageUnitLabel();
  await finishAppBoot();
  // Set by startDemo() (login.html's "Try a demo" button) before redirecting
  // in as a fresh guest — runs after finishAppBoot() so seedServicesIfEmpty()
  // has already created this persona's base service catalog for
  // seedDemoData() to reference by name.
  if (sessionStorage.getItem('sidekick_start_demo')) {
    sessionStorage.removeItem('sidekick_start_demo');
    await seedDemoData(v);
  }
}

// ─── DEMO DATA (sales-pitch mode) ────────────────────────────────────────
// login.html's "Try a demo" button forces a fresh guest session (see
// startDemo() below) and sets sidekick_start_demo, which
// choosePersonaOnboard() checks after the normal first-run persona picker —
// picking a persona there both sets businessType AND populates a realistic,
// ready-to-show dataset for it, rather than leaving a prospect looking at an
// empty app. Guest-only by design: no server/account dependency, and
// "Start fresh" (already built for guest mode) is the natural reset between
// pitches on a shared device.
function startDemo() {
  (async () => {
    if (await guestDataExists()) {
      if (!confirm(t('demo_wipe_confirm'))) return;
      await wipeGuestData();
    }
    sessionStorage.setItem('sidekick_start_demo', '1');
    await proceedAsGuest();
  })();
}

async function seedDemoData(persona) {
  const data = DEMO_PERSONA_DATA[persona];
  if (!data) return; // 'custom' has no seed services either — nothing to seed
  const uid = isGuest ? 'guest' : currentUser.id;
  const today = new Date();
  const relDate = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const myServices = (await dbAll('services')).filter(s => s.uid === uid);
  const serviceByName = {};
  myServices.forEach(s => { serviceByName[s.name] = s; });

  const clientRefs = []; // index-aligned with data.clients
  let memberSeq = 1;
  for (const c of data.clients) {
    const obj = {
      uid, name: c.name, phone: c.phone || '', email: c.email || '', tags: c.tags || '',
      notes: c.notes || '', taxId: '', billingAddress: c.address || '',
      healthNotes: c.healthNotes || '', allergies: c.allergies || '', goals: c.goals || '',
      cuid: cuid(), memberNo: 'SK-' + String(memberSeq++).padStart(4, '0'), updatedAt: nowISO(),
    };
    // Nested tracker dates are authored as day-offsets from "today" (like
    // jobs/invoices/bookings below), not literal strings — a vehicle's
    // "next service due" or a policy's renewal date needs to stay
    // plausible no matter how much later this demo actually gets run.
    if (c.vehicles) obj.vehicles = c.vehicles.map(x => ({ id: cuid(), ...x, nextServiceDate: relDate(x.nextServiceDate) }));
    if (c.serviceHistory) obj.serviceHistory = c.serviceHistory.map(x => ({ id: cuid(), ...x, date: relDate(x.date) }));
    if (c.orders) obj.orders = c.orders.map(x => ({ id: cuid(), ...x, date: relDate(x.date) }));
    if (c.policies) obj.policies = c.policies.map(x => ({ id: cuid(), ...x, renewalDate: relDate(x.renewalDate) }));
    if (c.deals) obj.deals = c.deals.map(x => ({ ...x, id: cuid(), viewings: (x.viewings || []).map(v => ({ id: cuid(), ...v, date: relDate(v.date) })) }));
    if (c.mealPlan) obj.mealPlan = c.mealPlan.map(text => ({ id: cuid(), text }));
    if (c.birthday) obj.birthday = c.birthday;
    if (c.referredBy) obj.referredBy = c.referredBy;
    if (c.searchBrief) obj.searchBrief = c.searchBrief;
    if (c.monthlyKgPlan) obj.monthlyKgPlan = c.monthlyKgPlan;
    if (c.preferences) obj.preferences = c.preferences;
    const id = await dbAdd('clients', obj);
    clientRefs.push({ id, name: obj.name });
  }

  const stageOrderNow = getStageOrder();
  // Home's hero number only counts jobs whose date falls in the CURRENT
  // calendar month (jobsThisMonth(), monthKey()-based, see renderHome()) --
  // a hard month boundary, not a rolling window. Each persona's paid job
  // daysOffset was hand-picked (-5 to -40) assuming "today" is late enough
  // in the month to absorb that; run the demo on/near the 1st-14th and
  // every offset past -(today's day-of-month) silently lands in the
  // PREVIOUS month and drops out, so the hero can show ฿0 even though
  // real, paid revenue was seeded. Clamp job dates only (not
  // invoices/bookings/packages/progressLogs, which keep their own
  // historical flavor and aren't read by that filter) so every seeded job
  // always lands within the current month, regardless of which day of the
  // month the demo happens to run on.
  const jobDate = (offsetDays) => relDate(Math.max(offsetDays, -(today.getDate() - 1)));
  for (const j of data.jobs) {
    const client = clientRefs[j.clientIndex];
    const svc = serviceByName[j.serviceName];
    const job = {
      uid, date: jobDate(j.daysOffset), client: client.name, clientId: client.id,
      serviceId: svc ? svc.id : null, serviceName: svc ? svc.name : j.serviceName,
      jobType: settings.workType || '', amount: j.amount, tip: j.tip || 0, expense: j.expense || 0,
      count: j.count || 1, notes: j.notes || '', netAmount: j.amount + (j.tip || 0) - (j.expense || 0),
      cuid: cuid(), stageOrder: stageOrderNow.slice(), stage: j.stage, paid: !!j.paid,
      complete: !!j.complete, invoiceId: null, quoteDocId: null, packageId: null, updatedAt: nowISO(),
    };
    if (j.outcome) job.outcome = j.outcome;
    await dbAdd('jobs', job);
  }

  const invoicesSoFar = [];
  for (const inv of data.invoices) {
    const client = clientRefs[inv.clientIndex];
    const subtotal = inv.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
    const tax = computeTax(subtotal, settings.wht != null ? settings.wht : 3, settings.vat != null ? settings.vat : 7);
    const number = nextDocNumber(invoicesSoFar, 'INV');
    const record = {
      uid, number, issueDate: relDate(inv.daysOffset), dueDate: relDate(inv.daysOffset + 7),
      clientId: client.id, clientName: client.name, clientTaxId: '', clientAddress: '',
      lineItems: inv.lineItems, subtotal, whtPct: settings.wht != null ? settings.wht : 3,
      vatPct: settings.vat != null ? settings.vat : 7, vat: tax.vat, wht: tax.wht,
      clientPays: tax.clientPays, youReceive: tax.youReceive, depositPct: 0, status: inv.status,
      paymentChannels: JSON.parse(JSON.stringify(settings.paymentChannels || [])), notes: '',
      cuid: cuid(), updatedAt: nowISO(),
    };
    await dbAdd('invoices', record);
    invoicesSoFar.push(record);
  }

  for (const b of data.bookings) {
    const client = clientRefs[b.clientIndex];
    await dbAdd('bookings', {
      uid, customerId: client.id, title: b.title, date: relDate(b.daysOffset), startTime: b.startTime,
      durationMin: b.durationMin || 60, travelBufferMin: 0, location: b.location || '', notes: '',
      status: 'scheduled', cuid: cuid(), createdAt: nowISO(), updatedAt: nowISO(),
    });
  }

  for (const p of (data.packages || [])) {
    const client = clientRefs[p.clientIndex];
    await dbAdd('packages', {
      uid, clientId: client.id, totalSessions: p.totalSessions, price: p.price,
      purchasedDate: relDate(p.daysOffset), expiresAt: null, notes: '', cuid: cuid(), updatedAt: nowISO(),
    });
  }

  for (const pl of (data.progressLogs || [])) {
    const client = clientRefs[pl.clientIndex];
    await dbAdd('progressLogs', {
      uid, clientId: client.id, date: relDate(pl.daysOffset), weight: pl.weight, notes: pl.notes || '',
      cuid: cuid(), updatedAt: nowISO(),
    });
  }

  await reload();
  switchScreen('home');
  toast(t('demo_seeded_toast'));
}

function displayName() {
  if (isGuest) return t('guest_name');
  return (currentUser && currentUser.firstName) ? currentUser.firstName : (currentUser ? currentUser.username : '');
}
// The name printed on documents (quotes/invoices/receipts/contracts/NDAs) as
// the seller — an optional Settings override, falling back to the casual
// display name so documents work fine even if it's never filled in.
function sellerBusinessName() {
  return (settings.sellerBusinessName || '').trim() || displayName();
}
function applyUser() {
  const name = displayName();
  const initial = (name || '?').charAt(0).toUpperCase();
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('home-avatar', initial);
  setTxt('acct-avatar', initial);
  setTxt('acct-name', name + (isGuest ? ' · guest' : ''));
  setTxt('acct-sub', isGuest ? 'Temporary guest — data on this device only' : t('local_account'));
  const logoutBtn = document.querySelector('.btn-logout');
  if (logoutBtn) logoutBtn.textContent = isGuest ? t('exit_guest') : t('logout');
  // Guest has no stored name to edit (displayName() is a fixed translation,
  // not a users-store field) — hide the affordance rather than open a modal
  // that has nothing real to save.
  const chevron = document.getElementById('acct-edit-chevron');
  if (chevron) chevron.style.display = isGuest ? 'none' : '';
}

function openAccountNameModal() {
  if (isGuest || !currentUser) return;
  document.getElementById('acct-name-input').value = currentUser.firstName || '';
  document.getElementById('modal-account-name').classList.add('open');
}
function closeAccountNameModal() { document.getElementById('modal-account-name').classList.remove('open'); }
async function saveAccountName() {
  const name = document.getElementById('acct-name-input').value.trim();
  if (!name) { markFieldError('acct-name-input', 'err_name_required'); return; }
  // Fetch the full stored row rather than mutating a slim in-memory copy —
  // dbPut() is a keyPath put() that replaces the entire record (see the
  // same fix in completeLineProfile()), so it must carry every field.
  const row = await dbGet('users', currentUser.id);
  if (row) { row.firstName = name; await dbPut('users', row); }
  currentUser.firstName = name;
  closeAccountNameModal();
  applyUser();
  toast(t('saved'));
}

async function reload() {
  const uid = isGuest ? 'guest' : currentUser.id;
  jobs = (await dbAll('jobs')).filter(j => j.uid === uid);
  jobs.sort((a,b) => (b.date||'').localeCompare(a.date||'') || ((b.id||0)-(a.id||0)));
  expenses = (await dbAll('expenses')).filter(x => x.uid === uid);
  customers = (await dbAll('clients')).filter(c => c.uid === uid);
  await backfillMemberNumbers();
  customers.sort((a,b) => (a.name||'').localeCompare(b.name||''));
  services = (await dbAll('services')).filter(s => s.uid === uid);
  services.sort((a,b) => (a.name||'').localeCompare(b.name||''));
  usageEvents = (await dbAll('usageEvents')).filter(e => e.uid === uid);
  packages = (await dbAll('packages')).filter(p => p.uid === uid);
  renderHome();
  renderCustomers();
  renderServices();
  if (typeof renderPipeline === 'function') renderPipeline();
  renderInsights();
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('set-count', jobs.length);
  checkAndFireNotifications();
}
// ─── USAGE INSIGHTS (local-only — never leaves this device) ───────────
// A lightweight event log so the app owner can see which features get reached
// for, to guide what's worth building next. Collection always runs (it's the
// whole point), but the Settings > Insights screen itself is developer-only —
// hidden from the normal Manage list so ordinary end users never see or land
// on it. No network calls, no third-party analytics.
function logEvent(name) {
  if (!db) return;
  const uid = isGuest ? 'guest' : currentUser.id;
  const row = {uid, name, ts: nowISO()};
  dbAdd('usageEvents', row).then(id => { row.id = id; usageEvents.push(row); }).catch(()=>{});
}
// Reveal Insights the same way Android reveals Developer Options: tap the
// version number 7 times. Unlocking is a one-time, permanent, per-device flag.
const INSIGHTS_UNLOCK_TAPS = 7;
let _versionTapCount = 0;
let _versionTapTimer = null;
function tapVersion() {
  if (settings.insightsUnlocked) return;
  _versionTapCount++;
  clearTimeout(_versionTapTimer);
  _versionTapTimer = setTimeout(() => { _versionTapCount = 0; }, 2000);
  if (_versionTapCount >= INSIGHTS_UNLOCK_TAPS) {
    _versionTapCount = 0;
    unlockInsights();
  }
}
async function unlockInsights() {
  await saveSetting('insightsUnlocked', true);
  applyInsightsVisibility();
  toast(t('insights_unlocked'));
}
// TSK-002/007: Insights moved from a "More tools" settings-row to a Tools-
// grid tile (#tool-tile-insights). The design mockup shows it as a
// permanently-visible tile with no gating, but per the research assessment
// (§1.2) this stays hidden-until-unlocked — dropping the tap-version-7x
// easter egg silently would expose a dev/power-user-only screen to everyone,
// a bigger behavior change than this rebuild is meant to make. Decision
// logged in project-changelog-handshake-gym.md.
function applyInsightsVisibility() {
  const tile = document.getElementById('tool-tile-insights');
  if (tile) tile.hidden = !settings.insightsUnlocked;
}
const SCREEN_LABELS = {
  home:'Home', pipeline:'Task flow', customers:'Clients', book:'Calendar', more:'Settings',
  services:'Services', invoices:'Invoices', tax:'Tax', docs:'Documents',
  followups:'Follow-ups', portfolio:'Portfolio', research:'Research', insights:'Insights',
};
function daysAgoISO(days) { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString(); }
function renderInsights() {
  const wrap = document.getElementById('insights-body');
  if (!wrap) return;
  if (!usageEvents.length) {
    wrap.innerHTML = `<div class="empty"><div class="empty-icon">📊</div>
      <p>${htmlEsc(t('no_insights'))}</p><span>${htmlEsc(t('no_insights_sub'))}</span></div>`;
    return;
  }
  const since30 = daysAgoISO(30);
  const last30 = usageEvents.filter(e => e.ts >= since30);
  const sessionsLogged = usageEvents.filter(e => e.name === 'session_logged').length;
  const clientsAdded = usageEvents.filter(e => e.name === 'client_added').length;
  const activeDays30 = new Set(last30.map(e => e.ts.slice(0,10))).size;

  const screenCounts = {};
  usageEvents.forEach(e => {
    if (e.name.startsWith('screen_view:')) {
      const s = e.name.slice('screen_view:'.length);
      screenCounts[s] = (screenCounts[s]||0) + 1;
    }
  });
  const topScreens = Object.entries(screenCounts).sort((a,b) => b[1]-a[1]);

  const stageCounts = {};
  usageEvents.forEach(e => {
    if (e.name.startsWith('pipeline_stage:')) {
      const s = e.name.slice('pipeline_stage:'.length);
      stageCounts[s] = (stageCounts[s]||0) + 1;
    }
  });
  const stageOrderForDisplay = (typeof getStageOrder === 'function') ? getStageOrder().concat(['extended', 'finished', 'done']) : Object.keys(stageCounts);
  const STAGE_DISPLAY_LABELS = { done: t('insights_stage_done'), extended: STAGE_META.deliver && t(STAGE_META.deliver.done), finished: t('mark_finished') };
  const stageRows = stageOrderForDisplay.filter(s => stageCounts[s]).map(s => {
    const label = STAGE_DISPLAY_LABELS[s] || (STAGE_META[s] && t(STAGE_META[s].label)) || s;
    return {label, count: stageCounts[s]};
  });

  wrap.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">${htmlEsc(t('insights_sessions_logged'))}</div><div class="stat-val tnum">${sessionsLogged}</div></div>
      <div class="stat-card"><div class="stat-label">${htmlEsc(t('insights_clients_added'))}</div><div class="stat-val tnum">${clientsAdded}</div></div>
      <div class="stat-card"><div class="stat-label">${htmlEsc(t('insights_active_days_30'))}</div><div class="stat-val tnum">${activeDays30}</div></div>
    </div>
    <div class="section-title">${htmlEsc(t('insights_feature_usage'))}</div>
    <div class="list-card">${topScreens.length ? topScreens.map(([s,n]) => `
      <div class="list-row" style="cursor:default">
        <div class="list-main"><div class="list-title">${htmlEsc(SCREEN_LABELS[s] || s)}</div></div>
        <div class="list-right"><span class="list-amt">${n}</span></div>
      </div>`).join('') : `<div class="list-row" style="cursor:default"><div class="list-main"><div class="list-sub">${htmlEsc(t('no_insights_sub'))}</div></div></div>`}</div>
    <div class="section-title">${htmlEsc(t('insights_pipeline_activity'))}</div>
    <div class="list-card">${stageRows.length ? stageRows.map(r => `
      <div class="list-row" style="cursor:default">
        <div class="list-main"><div class="list-title">${htmlEsc(r.label)}</div></div>
        <div class="list-right"><span class="list-amt">${r.count}</span></div>
      </div>`).join('') : `<div class="list-row" style="cursor:default"><div class="list-main"><div class="list-sub">${htmlEsc(t('insights_no_pipeline_activity'))}</div></div></div>`}</div>
    <button type="button" class="btn-danger" style="width:100%;margin-top:6px" onclick="clearUsageEvents()">${htmlEsc(t('insights_clear'))}</button>
  `;
}
async function clearUsageEvents() {
  if (!confirm(t('insights_clear_confirm'))) return;
  const uid = isGuest ? 'guest' : currentUser.id;
  for (const e of usageEvents) { await dbDel('usageEvents', e.id); }
  usageEvents = usageEvents.filter(e => e.uid !== uid);
  renderInsights();
  toast(t('insights_cleared'));
}

// ─── DASHBOARD (Home) ─────────────────────────────────────────────────
function monthKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function jobsThisMonth() { const m = monthKey(); return jobs.filter(j => (j.date||'').startsWith(m)); }
function jobsToday() { const t0 = todayISO(); return jobs.filter(j => j.date === t0); }
// My Task Goal's Quarter/Year periods — same date-range-filter shape as
// jobsThisMonth(), just a wider window (a plain string-prefix match, like
// jobsThisMonth uses, doesn't work once the window spans more than one
// month, so these compare actual Date objects instead).
function jobsThisQuarter() {
  const d = new Date();
  const qStart = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
  const qEnd = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 1);
  return jobs.filter(j => { const jd = new Date(j.date); return jd >= qStart && jd < qEnd; });
}
function jobsThisYear() { const y = String(new Date().getFullYear()); return jobs.filter(j => (j.date||'').startsWith(y)); }

// ─── Backup reminder (data-loss protection) ────────────────────────────
// Sidekick is local-only storage: clearing browser data or switching
// devices without ever exporting a backup means total, unrecoverable data
// loss. Nudge (not nag): only once there's real data worth losing, only
// after 30 days since the last export (or none ever), and dismissible for
// another 14 days at a time.
const BACKUP_REMIND_DAYS = 30;
const BACKUP_SNOOZE_DAYS = 14;
function addDaysISO(iso, days) {
  const d = new Date((iso || todayISO()) + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysSinceISO(iso) {
  const a = new Date((iso || todayISO()).slice(0,10) + 'T12:00:00'), b = new Date(todayISO() + 'T12:00:00');
  if (isNaN(a)) return Infinity;
  return Math.round((b - a) / 86400000);
}
function backupReminderDue() {
  // services doesn't count: it's always auto-seeded with starter examples
  // per persona on onboarding, so it's never a signal of real user activity.
  const hasData = jobs.length > 0 || customers.length > 0;
  if (!hasData) return false;
  const snoozedUntil = settings.backupReminderSnoozedUntil;
  if (snoozedUntil && snoozedUntil >= todayISO()) return false;
  if (!settings.lastBackupAt) return true;
  return daysSinceISO(settings.lastBackupAt) >= BACKUP_REMIND_DAYS;
}
async function snoozeBackupReminder() {
  await saveSetting('backupReminderSnoozedUntil', addDaysISO(todayISO(), BACKUP_SNOOZE_DAYS));
  renderBackupReminder();
  updateMoreNavBadge();
  toast(t('backup_snoozed'));
}
// Lives in More/Settings (next to the Backup JSON/Restore JSON actions it's
// nudging you toward) rather than on Home — a device-housekeeping reminder,
// not something that competes with pipeline/payment items for attention.
function renderBackupReminder() {
  const el = document.getElementById('backup-reminder-body');
  if (!el) return;
  if (!backupReminderDue()) { el.innerHTML = ''; return; }
  const last = settings.lastBackupAt ? fmtDate(settings.lastBackupAt.slice(0,10)) : t('backup_never');
  el.innerHTML = `<div class="list-card">
      <div class="list-row" style="cursor:default">
        <div class="list-icon">💾</div>
        <div class="list-main">
          <div class="list-title">${htmlEsc(t('backup_reminder_title'))}</div>
          <div class="list-sub">${htmlEsc(t('backup_reminder_sub').replace('{date}', last))}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;padding:0 16px 14px">
        <button type="button" onclick="exportBackup()" style="flex:1;padding:10px;border:none;background:var(--brand);color:#fff;border-radius:var(--radius-sm);font-weight:700;font-family:inherit;font-size:13px;cursor:pointer">${htmlEsc(t('backup_now'))}</button>
        <button type="button" onclick="snoozeBackupReminder()" style="flex:1;padding:10px;border:1px solid var(--border);background:none;color:var(--text3);border-radius:var(--radius-sm);font-weight:700;font-family:inherit;font-size:13px;cursor:pointer">${htmlEsc(t('remind_later'))}</button>
      </div>
    </div>`;
}
// A small dot on the More nav icon so a due backup reminder is still
// discoverable without opening Settings, now that it no longer shows on Home.
function updateMoreNavBadge() {
  const badge = document.getElementById('more-nav-badge');
  if (!badge) return;
  badge.style.display = backupReminderDue() ? 'flex' : 'none';
}

// ─── TSK-002/007 More/Settings rebuild: root status pills + Tools-grid badge
// ─────────────────────────────────────────────────────────────────────────
// "Data & backup" row's accessory: a relative timestamp (design shows "2d
// ago"), reusing daysSinceISO()/settings.lastBackupAt — the exact same field
// backupReminderDue() already reads, not a second tracked value. Also
// updates the info banner at the top of the #s-more-data drill-in itself.
function renderDataBackupStatus() {
  const pill = document.getElementById('pill-data-backup');
  if (pill) {
    pill.textContent = !settings.lastBackupAt ? t('status_never_backed_up')
      : (daysSinceISO(settings.lastBackupAt) <= 0 ? t('status_today')
        : t('status_days_ago').replace('{n}', daysSinceISO(settings.lastBackupAt)));
  }
  const banner = document.getElementById('data-backup-banner');
  if (banner) {
    const last = settings.lastBackupAt ? fmtDate(settings.lastBackupAt.slice(0, 10)) : t('backup_never');
    banner.textContent = t('data_backup_info_banner').replace('{date}', last);
  }
}
// "Payments & shop" row's accessory pill — amber "Set up" / green "Connected"
// reflecting whether any payment channel is actually configured (reuses
// paymentChannels(), the same array renderPaymentChannels() itself reads;
// this is never a separately-tracked flag).
function updatePaymentsPill() {
  const el = document.getElementById('pill-payments');
  if (!el) return;
  const has = paymentChannels().length > 0;
  el.className = 'status-pill ' + (has ? 'green' : 'amber');
  el.textContent = has ? t('status_connected') : t('status_set_up');
}
// "LINE & team" row's accessory pill — driven by the same LINE-channel
// connected/disconnected boolean renderLineChannelSection() already fetches
// from SidekickBackend.lineChannelStatus() (see that function's call sites
// below); never a second network round trip.
function updateLineTeamPill(connected) {
  const el = document.getElementById('pill-line-team');
  if (!el) return;
  el.className = 'status-pill ' + (connected ? 'green' : 'amber');
  el.textContent = connected ? t('status_connected') : t('status_set_up');
}
// Follow-ups Tools-grid tile: marigold count badge + "N due today" sub-line.
// followups.js's queue has no distinct "due today" date field (see that
// module's header) — the whole active queue (overdue invoices, stale drafts,
// stale customers, used-up packages) IS the "needs attention now" set, so
// its length is the real, non-fabricated count. followupsDueCount() (defined
// in followups.js, reuses buildQueue() — never recomputed here) is the
// single source; this just paints it onto the tile.
async function renderFollowupsTile() {
  const badge = document.getElementById('tool-badge-followups');
  const sub = document.getElementById('tool-sub-followups');
  if (!badge || !sub) return;
  let n = 0;
  if (typeof window.followupsDueCount === 'function') {
    try { n = await window.followupsDueCount(); } catch (e) { n = 0; }
  }
  if (n > 0) {
    badge.hidden = false; badge.textContent = String(n);
    sub.textContent = t('followups_due_today').replace('{n}', n);
    sub.classList.add('marigold');
  } else {
    badge.hidden = true;
    sub.textContent = t('followups_tool_sub');
    sub.classList.remove('marigold');
  }
}

// ─── Cloud backup (beta) — Phase 1 of the local-first -> backend migration
// ─────────────────────────────────────────────────────────────────────────
// Deliberately opt-in and additive, not a replacement: enabling this mirrors
// `clients` (only) to the new backend API (window.SidekickBackend, see
// dataClient.js) alongside the existing local IndexedDB save, which stays
// authoritative for reads. Guest mode is out of scope on purpose — it stays
// exactly local-only, zero network calls, matching its whole reason to
// exist (see the project plan for the full reasoning).
function renderCloudBackupSection() {
  const el = document.getElementById('cloud-backup-body');
  if (!el || typeof SidekickBackend === 'undefined') return;
  if (isGuest) { el.innerHTML = ''; return; }
  const enabled = SidekickBackend.isEnabled();
  // A team member (not the org owner) pulling their own account's cloud
  // data would get back... the owner's data anyway (see restoreFromCloud()'s
  // header) — so the button is the same call, just honestly labeled for
  // what it does from a staff member's point of view. __entitlements may
  // still be null/stale on this screen's very first render (renderSubscript
  // ionSection(), which populates it, is called separately and re-renders
  // this section once it resolves) — that's fine, it just means the label
  // briefly shows the generic (still correct) "Restore from cloud" text.
  const u = __entitlements;
  const isTeamMember = !!(u && u.team && !u.team.isOwner);
  const restoreLabel = isTeamMember ? t('team_load_data') : t('restore_cloud_btn');
  el.innerHTML = `<div class="list-card">
      <div class="list-row" style="cursor:default">
        <div class="list-icon">${enabled ? '☁️' : '🔒'}</div>
        <div class="list-main">
          <div class="list-title">${htmlEsc(t('cloud_backup_title'))}</div>
          <div class="list-sub">${htmlEsc(enabled ? t('cloud_backup_enabled_sub') : t('cloud_backup_disabled_sub'))}</div>
        </div>
      </div>
      ${enabled ? `<div style="padding:0 16px 14px">
        <button type="button" onclick="restoreFromCloud()" style="width:100%;padding:10px;border:1px solid var(--border);background:none;color:var(--text2);border-radius:var(--radius-sm);font-weight:700;font-family:inherit;font-size:13px;cursor:pointer">${htmlEsc(restoreLabel)}</button>
      </div>` : `<div style="padding:0 16px 14px">
        <button type="button" onclick="enableCloudBackup()" style="width:100%;padding:10px;border:none;background:var(--brand);color:#fff;border-radius:var(--radius-sm);font-weight:700;font-family:inherit;font-size:13px;cursor:pointer">${htmlEsc(t('cloud_backup_enable_btn'))}</button>
      </div>`}
    </div>`;
}
// Re-hashes nothing: reuses this account's already-computed {salt, hash,
// iters} straight from the local `users` record (the same triple
// hashPassword() produced at local registration/login), so enabling this
// never needs the user to re-enter their password — mirroring exactly how
// the one-time local->server migration upload is meant to work (see
// api/migrate-upload.js's header). LINE-authenticated accounts (no
// password at all — see sql/schema-core.sql's users.line_sub comment)
// branch to registerLine() instead, reusing the signed identity proof
// handleLineLoginRedirect() stored at login time (see api/auth-register-
// line.js's header for the full reasoning).
async function enableCloudBackup() {
  if (isGuest || typeof SidekickBackend === 'undefined') return;
  const localUser = await dbGet('users', currentUser.id);
  if (!localUser) return;

  let result;
  if (localUser.lineAuth) {
    if (!localUser.lineIdentityToken) {
      // Account was created via LINE before this token existed — nothing
      // stored to prove identity with, and no OAuth round trip to launch
      // from here. Re-logging in via LINE is what refreshes it (see the
      // `else if` branch in handleLineLoginRedirect()).
      toast(t('cloud_backup_line_relogin_needed'));
      return;
    }
    result = await SidekickBackend.registerLine(localUser.lineIdentityToken);
  } else {
    result = await SidekickBackend.register({
      username: localUser.username, salt: localUser.salt, hash: localUser.hash,
      iters: localUser.iters, firstName: localUser.firstName,
    });
    if (!result.ok && result.status === 409) {
      // This account already exists server-side (a previous attempt, or
      // already enabled on another device) — the register endpoint never
      // sees a plaintext password, so there's no hash to "log in" with
      // here; ask for it once, this one time, same as any normal login
      // would.
      const password = prompt(t('cloud_backup_reenter_password'));
      if (!password) return;
      result = await SidekickBackend.login({ username: localUser.username, password });
    }
  }
  if (!result.ok) { toast(t('cloud_backup_failed')); return; }

  const uid = currentUser.id;
  const myClients = (await dbAll('clients')).filter(c => c.uid === uid);
  const upload = await SidekickBackend.migrateUpload(myClients);
  if (!upload.ok) { toast(t('cloud_backup_upload_failed')); renderCloudBackupSection(); return; }
  toast(t('cloud_backup_enabled_toast').replace('{n}', upload.data.inserted));
  renderCloudBackupSection();
}
window.enableCloudBackup = enableCloudBackup;

// ─── SUBSCRIPTION (Phase 0) ─────────────────────────────────────────────
// Deliberately reads live from api/auth-session.js rather than trusting a
// long-lived cache — subscription state can change from a Stripe webhook
// at any moment (a payment succeeding/failing). Guest and any account that
// hasn't enabled cloud backup yet has no backend `users` row at all (see
// renderCloudBackupSection() above) — there's nothing to subscribe against
// yet, so this renders nothing beyond a short hint pointing at the Cloud
// backup section right above it.
//
// `__entitlements` is a same-tab, in-memory cache of the last fetch
// (refreshed at boot via finishAppBoot(), and again every time Settings
// renders this section) — the Phase 1 feature gates below
// (planHasFeature()/planClientCap()) read this synchronously rather than
// awaiting a fresh network round trip on every "+ Add client"/booking-save
// tap. A few minutes of staleness on a plan/lock change is an acceptable
// trade for that — same "good enough, not perfectly live" bar this app
// already accepts elsewhere (e.g. the mirror-not-authoritative backend
// writes). `null` means "not tracked" (guest, or a registered account that
// never enabled cloud backup) — every gate below treats that as
// unrestricted, matching Phase 0's own framing: the paywall only applies
// once an account opts into the backend/subscription system at all, never
// to purely local usage.
let __entitlements = null;
async function refreshEntitlements() {
  if (isGuest || typeof SidekickBackend === 'undefined' || !SidekickBackend.isEnabled()) {
    __entitlements = null;
    return null;
  }
  const r = await SidekickBackend.session();
  __entitlements = r.ok ? r.data.user : null;
  return __entitlements;
}
// key is one of lib/entitlements.js's FEATURE_KEYS (cloudSync/lineBooking/
// recurringBookings/researchPremium/docBranding) — see that file for the
// authoritative plan->feature mapping this only ever mirrors, never
// recomputes.
function planHasFeature(key) {
  const e = __entitlements;
  if (!e) return true;
  if (e.locked) return false;
  return !!(e.features && e.features[key]);
}
// null clientCap from the server means unlimited (JSON has no Infinity). A
// locked account's cap is 0 — matches "read-only until you subscribe again"
// rather than letting a locked-but-under-cap account keep adding clients.
function planClientCap() {
  const e = __entitlements;
  if (!e) return Infinity;
  if (e.locked) return 0;
  return e.clientCap == null ? Infinity : e.clientCap;
}
const SUBSCRIPTION_PRICE_THB = { basic: 149, pro: 349, team: 349 };
async function renderSubscriptionSection() {
  const el = document.getElementById('subscription-body');
  if (!el || typeof SidekickBackend === 'undefined') return;
  if (isGuest) { el.innerHTML = ''; return; }
  if (!SidekickBackend.isEnabled()) {
    __entitlements = null;
    el.innerHTML = `<p style="font-size:12px;color:var(--text3);margin:0 16px 14px">${htmlEsc(t('subscription_needs_account_hint'))}</p>`;
    return;
  }
  const u = await refreshEntitlements();
  // cloud-backup-body renders earlier in the same switchScreen('more') chain
  // (before __entitlements is populated) — re-render it now so a team
  // member's Restore button picks up the team_load_data label on this same
  // screen visit, not only on the next one.
  if (typeof renderCloudBackupSection === 'function') renderCloudBackupSection();
  if (!u) { el.innerHTML = ''; return; }
  const statusKey = u.locked ? 'subscription_status_locked'
    : u.subscriptionStatus === 'trialing' ? 'subscription_status_trialing'
    : u.subscriptionStatus === 'past_due' ? 'subscription_status_past_due'
    : u.subscriptionStatus === 'canceled' ? 'subscription_status_canceled'
    : 'subscription_status_active';
  const statusText = (statusKey === 'subscription_status_trialing')
    ? t('subscription_status_trialing').replace('{n}', u.trialDaysLeft)
    : t(statusKey);

  // A team member (admin/staff, not the owner) has nothing of their own to
  // buy or manage here — the subscription belongs to whoever owns the
  // org, api/billing-checkout.js/api/billing-portal.js both reject a
  // non-owner outright. Just show what plan/status they're operating
  // under and, for a member specifically, who that org belongs to.
  const isTeamMember = !!(u.team && u.team.role !== 'owner');

  const upgradeBtns = [];
  if (!isTeamMember) {
    if (u.plan !== 'pro' && u.plan !== 'team') {
      upgradeBtns.push(`<button type="button" class="qc-btn" style="width:100%" onclick="startSubscriptionCheckout('pro')">${htmlEsc(t('subscription_upgrade_pro_btn').replace('{price}', SUBSCRIPTION_PRICE_THB.pro))}</button>`);
    }
    if (u.plan === 'basic' && (u.locked || u.subscriptionStatus !== 'active')) {
      upgradeBtns.push(`<button type="button" class="qc-btn" style="width:100%" onclick="startSubscriptionCheckout('basic')">${htmlEsc(t('subscription_subscribe_basic_btn').replace('{price}', SUBSCRIPTION_PRICE_THB.basic))}</button>`);
    }
    if (u.plan !== 'team') {
      upgradeBtns.push(`<button type="button" class="qc-btn" style="width:100%" onclick="startTeamCheckout()">${htmlEsc(t('subscription_upgrade_team_btn').replace('{price}', SUBSCRIPTION_PRICE_THB.team))}</button>`);
    }
    if (u.hasStripeCustomer) {
      upgradeBtns.push(`<button type="button" class="qc-btn" style="width:100%" onclick="openBillingPortal()">${htmlEsc(t('subscription_manage_billing_btn'))}</button>`);
    }
  }

  el.innerHTML = `<div class="list-card">
      ${u.locked ? `<div style="padding:12px 16px;background:color-mix(in srgb,var(--overdue) 12%,var(--card));color:var(--overdue);font-size:12px;font-weight:700">${htmlEsc(t('subscription_locked_banner'))}</div>` : ''}
      <div class="list-row" style="cursor:default">
        <div class="list-icon">💳</div>
        <div class="list-main">
          <div class="list-title">${htmlEsc(t('subscription_plan_' + u.plan))}</div>
          <div class="list-sub">${htmlEsc(statusText)}${isTeamMember ? ' · ' + htmlEsc(t('subscription_team_member_of').replace('{name}', u.team.orgOwnerName || '')) : ''}</div>
        </div>
      </div>
      ${upgradeBtns.length ? `<div style="padding:0 16px 14px;display:flex;flex-direction:column;gap:8px">${upgradeBtns.join('')}</div>` : ''}
    </div>`;
}
// M4 Pass P1 — card-checkout waitlist: pure demand instrumentation (a
// local settings flag + a usage event), no payment code at all. Rendered
// right after the Billing/subscription card so it reads as part of the
// same "money in" area, but deliberately independent of SidekickBackend/
// plan/guest status — unlike the subscription card itself, anyone (guest
// or not, cloud-backend on or off) can register interest.
function renderCardWaitlistSection() {
  const el = document.getElementById('card-waitlist-body');
  if (!el) return;
  const on = !!settings.cardWaitlist;
  el.innerHTML = `<div class="list-card">
      <div class="settings-row" style="cursor:pointer" onclick="toggleCardWaitlist()">
        <div style="flex:1">
          <div class="settings-label">💳 ${htmlEsc(t('card_waitlist_label'))}</div>
          <div class="list-sub">${htmlEsc(on ? t('card_waitlist_thanks') : t('card_waitlist_sub'))}</div>
        </div>
        <button type="button" id="card-waitlist-toggle" aria-pressed="${on ? 'true' : 'false'}"
          onclick="event.stopPropagation();toggleCardWaitlist()"
          style="flex:none;width:36px;height:36px;border-radius:50%;font-size:16px;cursor:pointer;font-family:inherit;${on
            ? 'border:1.5px solid var(--brand);background:var(--brand-tint);color:var(--brand)'
            : 'border:1.5px solid var(--border);background:none;color:var(--text3)'}">${on ? '✓' : '🔔'}</button>
      </div>
    </div>`;
}
window.renderCardWaitlistSection = renderCardWaitlistSection;
// Flips settings.cardWaitlist — undoable (tap again to take yourself back
// off the list), same as any other Settings toggle.
async function toggleCardWaitlist() {
  const on = !settings.cardWaitlist;
  await saveSetting('cardWaitlist', on);
  logEvent('card_waitlist:' + (on ? 'on' : 'off'));
  renderCardWaitlistSection();
}
window.toggleCardWaitlist = toggleCardWaitlist;
async function startTeamCheckout() {
  const input = prompt(t('team_seats_prompt'), '2');
  if (input == null) return;
  const seats = parseInt(input, 10);
  if (!Number.isInteger(seats) || seats < 2) { toast(t('team_seats_invalid')); return; }
  const r = await SidekickBackend.teamCheckout(seats);
  if (!r.ok || !r.data.url) { toast((r.data && r.data.error) || t('subscription_checkout_failed')); return; }
  window.location.href = r.data.url;
}

// ─── TEAM MANAGEMENT (Phase 2) ───────────────────────────────────────────
// Settings > Team. Reads __entitlements (already refreshed by
// renderSubscriptionSection() just before this in the same switchScreen
// chain) purely to decide whether to show anything at all; the actual
// roster/invite state comes live from api/team-members.js on every render,
// same "always fetch fresh, membership can change from another device at
// any moment" reasoning as the Subscription screen itself.
async function renderTeamSection() {
  const el = document.getElementById('team-body');
  if (!el) return;
  if (isGuest || typeof SidekickBackend === 'undefined' || !SidekickBackend.isEnabled()) { el.innerHTML = ''; return; }
  const u = __entitlements;
  if (!u) { el.innerHTML = ''; return; }
  if (u.plan !== 'team' && !u.team) {
    el.innerHTML = `<p style="font-size:12px;color:var(--text3);margin:0 16px 14px">${htmlEsc(t('team_needs_plan_hint'))}</p>`;
    return;
  }

  const r = await SidekickBackend.teamMembersList();
  if (!r.ok) { el.innerHTML = ''; return; }
  const { owner, myRole, members } = r.data;
  const canManage = myRole === 'owner' || myRole === 'admin';
  const canInvite = canManage; // seat capacity is enforced server-side (api/team-invite.js), not gated here

  const memberRowsHtml = members.length ? members.map(m => `
      <div class="list-row" style="cursor:default">
        <div class="list-main">
          <div class="list-title">${htmlEsc(m.name)}</div>
          <div class="list-sub">${htmlEsc(t('team_role_' + m.role))}</div>
        </div>
        ${(myRole === 'owner' || (myRole === 'admin' && m.role === 'staff')) ? `<div class="list-right"><button type="button" class="qc-btn" aria-label="Remove" onclick="removeTeamMember('${m.cuid}')">✕</button></div>` : ''}
      </div>`).join('') : `<div class="pkg-status"><span>${htmlEsc(t('no_team_members'))}</span></div>`;

  el.innerHTML = `
    <div class="list-card" style="margin:0 16px 14px">
      <div class="list-row" style="cursor:default">
        <div class="list-icon">👥</div>
        <div class="list-main">
          <div class="list-title">${owner ? htmlEsc(owner.name) : htmlEsc(t('team_you_title'))}</div>
          <div class="list-sub">${myRole === 'owner' ? htmlEsc(t('team_seats_used').replace('{used}', members.length + 1).replace('{total}', u.team && u.team.seats ? u.team.seats : '—')) : htmlEsc(t('team_role_' + myRole))}</div>
        </div>
      </div>
    </div>
    <div class="section-title" style="font-size:12px;margin:14px 16px 8px">${htmlEsc(t('team_members_title'))}</div>
    <div class="list-card" style="margin:0 16px 14px">${memberRowsHtml}</div>
    ${canInvite ? `<div style="padding:0 16px 14px;display:flex;flex-direction:column;gap:8px">
        <button type="button" class="qc-btn" style="width:100%" onclick="inviteTeamMember('staff')">${htmlEsc(t('team_invite_staff_btn'))}</button>
        ${myRole === 'owner' ? `<button type="button" class="qc-btn" style="width:100%" onclick="inviteTeamMember('admin')">${htmlEsc(t('team_invite_admin_btn'))}</button>` : ''}
      </div>` : ''}
    <div id="team-invite-link-body"></div>
  `;
}
async function inviteTeamMember(role) {
  const r = await SidekickBackend.teamInvite(role);
  const linkEl = document.getElementById('team-invite-link-body');
  if (!r.ok || !r.data.inviteUrl) {
    toast((r.data && r.data.error) || t('team_invite_failed'));
    return;
  }
  if (linkEl) {
    linkEl.innerHTML = `<div class="field" style="margin:0 16px 14px;padding:0;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <label style="display:block;font-size:11px;font-weight:700;color:var(--text3);padding:8px 12px 0;text-transform:uppercase;letter-spacing:.3px">${htmlEsc(t('team_invite_link_label'))}</label>
        <p style="font-size:11px;color:var(--text4);padding:0 12px;margin:2px 0 6px">${htmlEsc(t('team_invite_link_sub'))}</p>
        <div style="display:flex;align-items:center;gap:6px;padding:2px 12px 10px">
          <input readonly value="${attrEsc(r.data.inviteUrl)}" onclick="this.select()" style="flex:1;min-width:0;border:none;background:none;font-family:'Spline Sans Mono',monospace;font-size:11px;color:var(--text2)">
          <button type="button" class="qc-btn" style="width:auto;padding:0 12px;flex:none" onclick="copyLineUrl('${attrEsc(r.data.inviteUrl)}')">${htmlEsc(t('copy_btn'))}</button>
        </div>
      </div>`;
  }
}
async function removeTeamMember(memberCuid) {
  if (!confirm(t('team_remove_confirm'))) return;
  const r = await SidekickBackend.teamMemberRemove(memberCuid);
  if (!r.ok) { toast((r.data && r.data.error) || t('team_remove_failed')); return; }
  renderTeamSection();
}
// Set by bootLogin() when the URL carried ?teamInvite=<token> — checked
// here, in finishAppBoot(), so it fires regardless of which auth path got
// the invitee here (log in, register, or LINE). Team membership requires a
// real backend `users` row (team_members references it) — guest mode has
// no persistent identity to grant one to, and a brand-new local-only
// account needs the exact same register-or-login-against-the-backend step
// enableCloudBackup() already does, reused here rather than duplicated.
async function maybeRedeemTeamInvite() {
  const token = sessionStorage.getItem('sidekick_team_invite');
  if (!token) return;
  sessionStorage.removeItem('sidekick_team_invite');
  if (isGuest || typeof SidekickBackend === 'undefined') { toast(t('team_invite_needs_account')); return; }
  if (!SidekickBackend.isEnabled()) {
    await enableCloudBackup();
    if (!SidekickBackend.isEnabled()) { toast(t('team_invite_needs_account')); return; }
  }
  const r = await SidekickBackend.teamJoin(token);
  if (!r.ok) { toast((r.data && r.data.error) || t('team_invite_failed')); return; }
  toast(t('team_joined_toast'));
}

// ─── GUEST → ACCOUNT DATA ADOPTION ──────────────────────────────────────
// The only path off a guest workspace used to be export-then-restore — a
// silent trap for anyone who tried the app as a guest, then registered a
// real account on the SAME device: the fresh account boots empty and the
// guest data just sits there under uid 'guest', invisible unless you already
// know to dig through Settings > Restore. This offers the obvious move.
//
// Cheap because it's a same-device uid swap, not a cross-device restore:
// BACKUP_STORES rows keep their existing autoincrement id — dbPut() with
// that same id just re-labels which account owns the row in place — so
// every id-based cross-reference (job.clientId -> client.id, etc.) survives
// untouched. None of importDataset()'s oldId->newId remap machinery
// (needed there because a cloud pull/file restore can land on a device that
// already owns those same ids under another account) applies here.
async function maybeOfferGuestAdoption() {
  if (isGuest) return;
  if (!(await guestDataExists())) return;
  const seenKey = 'sidekick_guest_adopt_seen_' + currentUser.id;
  if (localStorage.getItem(seenKey)) return;
  localStorage.setItem(seenKey, '1');   // one offer per account, ever — same posture as maybeShowCloudBackupModal()
  const allByStore = await Promise.all(BACKUP_STORES.map(s => dbAll(s)));
  const n = allByStore.reduce((sum, rows) => sum + rows.filter(r => r.uid === 'guest').length, 0);
  if (n === 0) return;   // guestDataExists() already true above, but stay defensive rather than show "0 records"
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'guest-adopt-modal';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${attrEsc(t('guest_adopt_title'))}">
      <div class="modal-handle"></div>
      <div class="modal-title">${htmlEsc(t('guest_adopt_title'))}</div>
      <div class="form-body" style="padding:0 20px 4px">
        <p style="color:var(--text2);font-size:14px;line-height:1.5;margin:0 0 16px">${htmlEsc(t('guest_adopt_body').replace('{n}', n))}</p>
      </div>
      <button type="button" class="btn-submit" id="guest-adopt-modal-adopt">${htmlEsc(t('guest_adopt_btn'))}</button>
      <button type="button" class="btn-danger" id="guest-adopt-modal-later" style="border-color:var(--border-mid);color:var(--text3)">${htmlEsc(t('guest_adopt_later'))}</button>
    </div>`;
  document.body.appendChild(overlay);
  // Not-now just closes — the data isn't touched, it stays reachable by
  // signing back into guest mode on this same device (loginGuest()'s
  // resume/start-fresh choice already handles "which guest" if more than
  // one guest session ever piles up here).
  document.getElementById('guest-adopt-modal-later').addEventListener('click', () => overlay.remove());
  document.getElementById('guest-adopt-modal-adopt').addEventListener('click', async () => {
    overlay.remove();
    await adoptGuestData();
  });
}
// Moves every guest-uid row across BACKUP_STORES onto the current account
// (in place — see the header comment above), then copies over any
// guest-prefixed setting the account doesn't already have one for.
// Current-account keys always win: a fresh account may have just chosen its
// own businessType (and packageUnitLabel/goalTargets/etc that come with it)
// during onboarding, and that choice is deliberately not overwritten by
// whatever the guest session happened to have — a residual persona mismatch
// between the adopted data and the already-chosen businessType is accepted
// here, since the user picked both.
//
// Guest-prefixed settings rows themselves are left behind under their
// 'guest:' keys rather than deleted — harmless, since guestDataExists()
// (and this offer's own re-trigger check) only ever looks at BACKUP_STORES,
// never at settings.
async function adoptGuestData() {
  const uid = currentUser.id;
  let n = 0;
  const adoptedClients = [];
  for (const s of BACKUP_STORES) {
    const rows = (await dbAll(s)).filter(r => r.uid === 'guest');
    for (const row of rows) {
      row.uid = uid;
      await dbPut(s, row);   // same id -> in-place ownership transfer, zero remap
      n++;
      if (s === 'clients') adoptedClients.push(row);
    }
  }
  const guestSettings = (await dbAll('settings')).filter(r => r.key.startsWith('guest:'));
  for (const row of guestSettings) {
    const key = row.key.slice('guest:'.length);
    if (settings[key] === undefined) await saveSetting(key, row.value);
  }
  // Clients reach the server right away via the same idempotent bulk-upload
  // path enableCloudBackup() uses; every other adopted store mirrors on its
  // own next individual save, same as any other locally-made edit — no
  // separate "adopted" upload path needed for those.
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled() && adoptedClients.length) {
    SidekickBackend.migrateUpload(adoptedClients).catch(() => {});
  }
  await reload();
  toast(t('guest_adopt_done').replace('{n}', n));
}

// ─── DOCUMENT BRANDING (Phase 1, Pro+) ──────────────────────────────────
// Same FileReader/dataURL-into-a-setting pattern portfolio.js already uses
// for item images (see saveItem()/onImagePick() there), just persisted via
// saveSetting() as `settings.sellerLogoDataUrl` instead of a per-item
// IndexedDB field — one logo per account, not one per document. Reads
// planHasFeature('docBranding') the same synchronous, cached way every
// other Phase 1 gate does (see planHasFeature() above); the upload UI
// itself is only shown once entitled, but sellerLogoDataUrl() (used by
// docgen.js/invoices.js at render time) re-checks the same gate rather
// than trusting whatever was true when the logo was uploaded — a downgrade
// stops the logo from appearing on new documents without deleting the
// stored image, so re-upgrading brings it straight back.
let __pickedLogo = undefined; // undefined = "use settings.sellerLogoDataUrl as-is", null = "explicitly removed this render"
function sellerLogoDataUrl() {
  if (typeof planHasFeature === 'function' && !planHasFeature('docBranding')) return '';
  return (settings && settings.sellerLogoDataUrl) || '';
}
function renderSellerLogoSection() {
  const el = document.getElementById('seller-logo-body');
  if (!el) return;
  const entitled = typeof planHasFeature !== 'function' || planHasFeature('docBranding');
  if (!entitled) {
    el.innerHTML = `<div class="settings-row" style="cursor:default">
        <span class="settings-label">${htmlEsc(t('business_logo'))}</span>
        <span style="font-size:12px;color:var(--text3)">${htmlEsc(t('doc_branding_locked'))}</span>
      </div>`;
    return;
  }
  __pickedLogo = settings.sellerLogoDataUrl || null;
  el.innerHTML = `
    <div class="field" style="padding:0 16px">
      <label for="seller-logo-input" style="display:block;font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px">${htmlEsc(t('business_logo'))}</label>
      <input type="file" id="seller-logo-input" accept="image/*" style="padding:8px 0;font-size:13px">
    </div>
    <div id="seller-logo-preview-wrap" style="padding:0 16px 14px"></div>`;
  document.getElementById('seller-logo-input').addEventListener('change', onSellerLogoPick);
  renderSellerLogoPreview();
}
function renderSellerLogoPreview() {
  const wrap = document.getElementById('seller-logo-preview-wrap');
  if (!wrap) return;
  if (!__pickedLogo) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `<div style="display:flex;align-items:center;gap:12px">
      <img src="${attrEsc(__pickedLogo)}" alt="" style="width:64px;height:64px;border-radius:var(--radius-sm);object-fit:contain;background:var(--card);border:0.5px solid var(--border)">
      <button type="button" id="seller-logo-remove" class="qc-btn" style="width:auto;padding:0 14px">${htmlEsc(t('remove_logo_btn'))}</button>
    </div>`;
  document.getElementById('seller-logo-remove').addEventListener('click', async () => {
    __pickedLogo = null;
    const input = document.getElementById('seller-logo-input');
    if (input) input.value = '';
    await saveSetting('sellerLogoDataUrl', '');
    renderSellerLogoPreview();
  });
}
function onSellerLogoPick(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    toast(t('image_too_large'));
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    __pickedLogo = reader.result;
    await saveSetting('sellerLogoDataUrl', __pickedLogo);
    renderSellerLogoPreview();
  };
  reader.onerror = () => toast(t('image_read_failed'));
  reader.readAsDataURL(file);
}
// ─── LINE BUSINESS CONNECTION (generic multi-tenant booking, Pro+) ──────
// Settings > LINE booking: connect this account's own LINE Official
// Account (a Messaging API channel — separate from "Continue with LINE"
// sign-in) for self-service booking. Same gated-when-not-Pro / hidden-
// when-no-backend-account pattern as renderSellerLogoSection() above.
// Genuinely needs the backend regardless of plan (line_channels/
// availability_slots only exist server-side) — unlike docBranding, there's
// no local-only fallback to speak of here.
async function renderLineChannelSection() {
  const el = document.getElementById('line-channel-body');
  const slotsEl = document.getElementById('booking-slots-body');
  if (!el) return;
  const entitled = typeof planHasFeature !== 'function' || planHasFeature('lineBooking');
  if (!entitled) {
    el.innerHTML = `<div class="settings-row" style="cursor:default">
        <span class="settings-label">${htmlEsc(t('line_booking_connect_title'))}</span>
        <span style="font-size:12px;color:var(--text3)">${htmlEsc(t('line_booking_locked'))}</span>
      </div>`;
    if (slotsEl) slotsEl.innerHTML = '';
    updateLineTeamPill(false);
    return;
  }
  if (isGuest || typeof SidekickBackend === 'undefined' || !SidekickBackend.isEnabled()) {
    el.innerHTML = `<p style="font-size:12px;color:var(--text3);margin:0 16px 14px">${htmlEsc(t('line_booking_needs_account_hint'))}</p>`;
    if (slotsEl) slotsEl.innerHTML = '';
    updateLineTeamPill(false);
    return;
  }
  const r = await SidekickBackend.lineChannelStatus();
  if (!r.ok) { el.innerHTML = ''; if (slotsEl) slotsEl.innerHTML = ''; updateLineTeamPill(false); return; }
  const s = r.data;
  updateLineTeamPill(!!s.connected);
  if (!s.connected) {
    el.innerHTML = `
      <div class="field" style="padding:0 16px">
        <label for="line-ch-id" style="display:block;font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px">${htmlEsc(t('line_channel_id_label'))}</label>
        <input class="settings-input" id="line-ch-id" type="text" style="width:100%">
      </div>
      <div class="field" style="padding:12px 16px 0">
        <label for="line-ch-secret" style="display:block;font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px">${htmlEsc(t('line_channel_secret_label'))}</label>
        <input class="settings-input" id="line-ch-secret" type="password" style="width:100%">
      </div>
      <div class="field" style="padding:12px 16px 0">
        <label for="line-ch-alert-uid" style="display:block;font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px">${htmlEsc(t('line_alert_uid_label'))}</label>
        <input class="settings-input" id="line-ch-alert-uid" type="text" style="width:100%" placeholder="${attrEsc(t('line_alert_uid_ph'))}">
        <p style="font-size:11px;color:var(--text4);margin-top:6px">${htmlEsc(t('line_alert_uid_sub'))}</p>
      </div>
      <button type="button" class="btn-submit" style="margin:14px 16px 4px;width:calc(100% - 32px)" onclick="connectLineChannel()">${htmlEsc(t('line_connect_btn'))}</button>
    `;
    if (slotsEl) slotsEl.innerHTML = '';
    return;
  }
  const urlRow = (label, url) => `
    <div class="field" style="padding:0;border:1px solid var(--border);border-radius:var(--radius-sm)">
      <label style="display:block;font-size:11px;font-weight:700;color:var(--text3);padding:8px 12px 0;text-transform:uppercase;letter-spacing:.3px">${htmlEsc(label)}</label>
      <div style="display:flex;align-items:center;gap:6px;padding:2px 12px 8px">
        <input readonly value="${attrEsc(url)}" onclick="this.select()" style="flex:1;min-width:0;border:none;background:none;font-family:'Spline Sans Mono',monospace;font-size:11px;color:var(--text2)">
        <button type="button" class="qc-btn" style="width:auto;padding:0 12px;flex:none" onclick="copyLineUrl('${attrEsc(url)}')">${htmlEsc(t('copy_btn'))}</button>
      </div>
    </div>`;
  el.innerHTML = `<div class="list-card" style="margin:0 16px 14px">
      <div class="list-row" style="cursor:default">
        <div class="list-icon">💬</div>
        <div class="list-main">
          <div class="list-title">${htmlEsc(t('line_connected_title'))}</div>
          <div class="list-sub">${htmlEsc(t('line_channel_id_label'))}: ${htmlEsc(s.channelId)}</div>
        </div>
      </div>
      <div style="padding:0 16px 14px;display:flex;flex-direction:column;gap:8px">
        ${urlRow(t('line_webhook_url_label'), s.webhookUrl)}
        ${urlRow(t('line_booking_page_url_label'), s.bookingPageUrl)}
        <button type="button" class="btn-danger" style="border-color:var(--border-mid);color:var(--text3)" onclick="disconnectLineChannel()">${htmlEsc(t('line_disconnect_btn'))}</button>
      </div>
    </div>`;
  renderBookingSlotsSection();
}
async function connectLineChannel() {
  const channelId = (document.getElementById('line-ch-id').value || '').trim();
  const channelSecret = (document.getElementById('line-ch-secret').value || '').trim();
  const freelancerLineUserId = (document.getElementById('line-ch-alert-uid').value || '').trim();
  if (!channelId || !channelSecret) { toast(t('line_connect_missing_fields')); return; }
  const r = await SidekickBackend.lineChannelConnect({ channelId, channelSecret, freelancerLineUserId });
  if (!r.ok) { toast((r.data && r.data.error) || t('line_connect_failed')); return; }
  toast(t('line_connected_toast'));
  renderLineChannelSection();
}
async function disconnectLineChannel() {
  if (!confirm(t('line_disconnect_confirm'))) return;
  await SidekickBackend.lineChannelDisconnect();
  renderLineChannelSection();
}
function copyLineUrl(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast(t('copied_toast'))).catch(() => toast(t('copy_failed')));
  } else {
    toast(t('copy_failed'));
  }
}
// The slot list itself — only ever rendered once a channel is connected
// (see renderLineChannelSection() above), but genuinely independent of it:
// a client can book against open slots regardless of whether the LINE
// channel is the referral path (a shared link works too), so this stays
// its own render pass rather than being folded into the connect card.
async function renderBookingSlotsSection() {
  const el = document.getElementById('booking-slots-body');
  if (!el) return;
  const r = await SidekickBackend.bookingSlotsList();
  if (!r.ok) { el.innerHTML = ''; return; }
  const rows = (r.data.rows || []).filter(s => s.status !== 'booked');
  const fmtRange = (startsAt, endsAt) => {
    const d = new Date(startsAt), e = new Date(endsAt);
    const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const startTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const endTime = e.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${startTime}–${endTime}`;
  };
  const rowsHtml = rows.length ? rows.map(s => `
      <div class="list-row" style="cursor:default">
        <div class="list-main">
          <div class="list-title">${htmlEsc(fmtRange(s.starts_at, s.ends_at))}</div>
          <div class="list-sub">${htmlEsc(t('slot_status_' + s.status))}</div>
        </div>
        <div class="list-right"><button type="button" class="qc-btn" aria-label="Delete" onclick="deleteBookingSlot(${s.id})">✕</button></div>
      </div>`).join('') : `<div class="pkg-status"><span>${htmlEsc(t('no_booking_slots'))}</span></div>`;
  el.innerHTML = `
    <div class="section-title" style="font-size:12px;margin:14px 16px 8px">${htmlEsc(t('booking_slots_title'))}</div>
    <div class="list-card" style="margin:0 16px 14px">${rowsHtml}</div>
    <div class="form-row" style="padding:0 16px;gap:8px">
      <input type="datetime-local" id="slot-start-input" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);font-family:inherit;font-size:13px">
      <input type="datetime-local" id="slot-end-input" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);font-family:inherit;font-size:13px">
    </div>
    <button type="button" class="btn-submit" style="margin:10px 16px 4px;width:calc(100% - 32px)" onclick="addBookingSlot()">${htmlEsc(t('add_slot_btn'))}</button>
    <div id="booking-requests-body"></div>
  `;
  renderBookingRequestsSection();
}
// Pending public booking requests — the freelancer's confirm/decline UI for
// api/booking-requests.js. Until this existed, every request from the
// public booking page silently died when its 15-minute slot hold lapsed
// ('confirmed'/'booked' were unreachable states — the launch blocker the
// product re-assessment ranked #5). Rendered inside the LINE booking
// section because that's where the requests come from and where the slots
// they claim are managed.
async function renderBookingRequestsSection() {
  const el = document.getElementById('booking-requests-body');
  if (!el) return;
  const r = await SidekickBackend.bookingRequestsList();
  if (!r.ok) { el.innerHTML = ''; return; }
  const rows = r.data.rows || [];
  // resolveBookingRequest() needs clientName/serviceName/startsAt/endsAt to
  // materialize a local calendar booking on confirm, but those are freeform
  // strings from the public booking page — putting them straight into an
  // onclick="" attribute would mean hand-escaping into JS-string-inside-
  // HTML-attribute context (easy to get wrong, easy to reintroduce an XSS
  // hole later). Instead the full row is kept here, keyed by id, and the
  // button only ever carries the numeric id + action through onclick.
  window.__pendingBookingRows = {};
  rows.forEach(b => { window.__pendingBookingRows[b.id] = b; });
  const fmtStart = (iso) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };
  const rowsHtml = rows.length ? rows.map(b => `
      <div class="list-row" style="cursor:default;flex-wrap:wrap;gap:6px">
        <div class="list-main">
          <div class="list-title">${htmlEsc(b.clientName || '')}${b.serviceName ? ' · ' + htmlEsc(b.serviceName) : ''}</div>
          <div class="list-sub">${htmlEsc(fmtStart(b.startsAt))}${b.holdExpired ? ` · <span style="color:var(--overdue)">` + htmlEsc(t('booking_hold_expired_hint')) + '</span>' : ''}</div>
        </div>
        <button type="button" class="qc-btn" style="width:auto;padding:0 12px;color:var(--brand)" onclick="resolveBookingRequest(${b.id},'confirm')">${htmlEsc(t('booking_confirm_btn'))}</button>
        <button type="button" class="qc-btn" style="width:auto;padding:0 12px;color:var(--text3)" onclick="resolveBookingRequest(${b.id},'decline')">${htmlEsc(t('booking_decline_btn'))}</button>
      </div>`).join('') : `<div class="pkg-status"><span>${htmlEsc(t('no_booking_requests'))}</span></div>`;
  el.innerHTML = `
    <div class="section-title" style="font-size:12px;margin:14px 16px 8px">${htmlEsc(t('booking_requests_title'))}</div>
    <div class="list-card" style="margin:0 16px 14px">${rowsHtml}</div>`;
}
// Local-time date/HH:MM extraction for a booking's startsAt (an ISO instant
// off the wire, e.g. '2026-08-01T20:00:00Z') — Date's plain getters
// (getFullYear/getMonth/getDate/getHours/getMinutes) are already local-time,
// same convention todayISO() (above) relies on; toISOString()/getUTC* would
// silently shift the calendar date whenever local time and UTC disagree on
// which day it is (very much the common case for Bangkok evenings/nights).
function localDateTimeParts(iso) {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date, startTime };
}
// Materialize a freelancer-confirmed LINE booking request as a local
// calendar booking — closes the P2 gap where a confirmed public booking
// only ever lived server-side (availability_slots/bookings) and never
// appeared on the freelancer's own calendar (bookings.js's 'bookings'
// store), i.e. nothing stopped them from double-booking that same slot
// against their own pipeline work. v1 scope is one-directional (a LINE
// confirm creates a local booking); the reverse — a local calendar entry
// auto-blocking an open public slot — needs a two-way sync design and is a
// deliberate residual, along with slot-vs-booking conflict warnings.
async function createLocalBookingFromLineRequest(b) {
  // Idempotence guard: a double-tap on Confirm, or resolveBookingRequest
  // running twice against the same id across a re-render (see
  // window.__pendingBookingRows below), must never create two calendar
  // entries for one LINE request.
  const already = (await dbAll('bookings')).some(x => x.lineBookingId === b.id);
  if (already) return;
  const { date, startTime } = localDateTimeParts(b.startsAt);
  const startMs = new Date(b.startsAt).getTime();
  const endMs = new Date(b.endsAt).getTime();
  const durationMin = (isFinite(startMs) && isFinite(endMs) && endMs > startMs) ? Math.round((endMs - startMs) / 60000) : 60;
  const row = {
    uid: currentUser.id, cuid: cuid(), customerId: null,
    title: (b.clientName || '') + (b.serviceName ? ' — ' + b.serviceName : ''),
    date, startTime, durationMin, travelBufferMin: 0,
    location: '', notes: t('booking_from_line_note'), status: 'scheduled',
    jobCuid: null, createdAt: nowISO(), updatedAt: nowISO(),
    // Local-only marker (this LINE booking request's server-side `id`),
    // used by the idempotence check above. Deliberately NOT included in
    // bookingsMirror's toPayload (dataClient.js) — the server drops
    // unknown fields on write, so leaving it out of that FIELDS list is
    // harmless, and the server already tracks this link on its own side
    // (bookings.slot_id/status in sql/schema-core.sql).
    lineBookingId: b.id,
  };
  const key = await dbAdd('bookings', row); row.id = key;
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled())
    SidekickBackend.mirrorBookingSave(row).catch(() => {});
}
async function resolveBookingRequest(bookingId, action) {
  const r = await SidekickBackend.bookingRequestResolve(bookingId, action);
  if (!r.ok) {
    toast(r.data && r.data.code === 'slot_taken' ? t('booking_slot_taken_toast') : t('slot_add_failed'));
    renderBookingRequestsSection();   // list is stale either way — refresh
    return;
  }
  if (action === 'confirm') {
    // window.__pendingBookingRows (renderBookingRequestsSection above) carries
    // the full row — clientName/serviceName/startsAt/endsAt — keyed by id, so
    // this never has to stuff those freeform strings into the onclick markup.
    const row = window.__pendingBookingRows && window.__pendingBookingRows[bookingId];
    if (row) await createLocalBookingFromLineRequest(row);
    toast(t('booking_confirmed_calendar_toast'));
  } else {
    toast(t('booking_declined_toast'));
  }
  renderBookingSlotsSection();   // re-renders slots AND the requests list
}
window.resolveBookingRequest = resolveBookingRequest;

// ─── SHOP / STOREFRONT (Pass M3-L3) ──────────────────────────────────────
// Settings ▸ Shop: this account's public storefront link (app/shop.html,
// served by api/shop-public.js) plus the freelancer's confirm/decline UI
// for the order requests it writes (api/order-requests.js). Same
// backend-gated pattern as renderLineChannelSection() — genuinely needs
// the backend regardless of plan (order_requests only exists server-side),
// and a guest has no server-side catalog for a stranger's browser to read
// in the first place. Reads __entitlements synchronously rather than
// awaiting a fresh session() call, same as renderTeamSection() — by the
// time the 'more' screen can be visited at all, finishAppBoot() has
// already populated it once (see __entitlements' own comment).
async function renderShopSection() {
  const linkEl = document.getElementById('shop-link-body');
  const ordersEl = document.getElementById('shop-orders-body');
  if (!linkEl || !ordersEl) return;
  if (isGuest || typeof SidekickBackend === 'undefined' || !SidekickBackend.isEnabled()) {
    linkEl.innerHTML = '';
    ordersEl.innerHTML = '';
    return;
  }
  const u = __entitlements;
  if (!u || !u.cuid) {
    linkEl.innerHTML = '';
    ordersEl.innerHTML = '';
    return;
  }
  // Same account-scoped-URL convention team-invite links and the LINE
  // booking page URL already use — the account's own cuid (from
  // api/auth-session.js) IS the capability token api/shop-public.js reads
  // via ?u=.
  const shopUrl = new URL('shop.html?u=' + encodeURIComponent(u.cuid), location.href).href;
  linkEl.innerHTML = `
    <div class="field" style="margin:0 16px 14px;padding:0;border:1px solid var(--border);border-radius:var(--radius-sm)">
      <label style="display:block;font-size:11px;font-weight:700;color:var(--text3);padding:8px 12px 0;text-transform:uppercase;letter-spacing:.3px">${htmlEsc(t('shop_link_label'))}</label>
      <div style="display:flex;align-items:center;gap:6px;padding:2px 12px 10px">
        <input readonly value="${attrEsc(shopUrl)}" onclick="this.select()" style="flex:1;min-width:0;border:none;background:none;font-family:'Spline Sans Mono',monospace;font-size:11px;color:var(--text2)">
        <button type="button" class="qc-btn" style="width:auto;padding:0 12px;flex:none" onclick="copyShopLink('${attrEsc(shopUrl)}')">${htmlEsc(t('copy_btn'))}</button>
      </div>
    </div>`;
  await renderShopOrdersSection();
}
// Clipboard write with the followups.js textarea fallback (some in-app
// WebViews — the LINE in-app browser in particular — don't expose
// navigator.clipboard at all).
function copyShopLink(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast(t('shop_link_copied'))).catch(() => fallbackCopyShopLink(text));
  } else {
    fallbackCopyShopLink(text);
  }
}
function fallbackCopyShopLink(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  try {
    textarea.select();
    document.execCommand('copy');
    toast(t('shop_link_copied'));
  } catch (e) {
    toast(t('copy_failed'));
  }
  document.body.removeChild(textarea);
}
window.copyShopLink = copyShopLink;
async function renderShopOrdersSection() {
  const el = document.getElementById('shop-orders-body');
  if (!el) return;
  const r = await SidekickBackend.orderRequestsList();
  if (!r.ok) { el.innerHTML = ''; return; }
  const rows = r.data.rows || [];
  // Same keyed-by-id side-table convention as window.__pendingBookingRows
  // (renderBookingRequestsSection above) — resolveOrderRequest() needs the
  // full row (items/contact/total) to materialize a local job on confirm,
  // and freeform client strings don't belong stuffed into onclick="" markup.
  window.__pendingOrderRows = {};
  rows.forEach(o => { window.__pendingOrderRows[o.id] = o; });
  const summarize = (items) => (items || []).map(it => `${it.qty}× ${it.name}`).join(', ');
  const rowsHtml = rows.length ? rows.map(o => `
      <div class="list-row" style="cursor:default;flex-wrap:wrap;gap:6px">
        <div class="list-main">
          <div class="list-title">${htmlEsc(o.clientName || '')}${o.contact ? ' · ' + htmlEsc(o.contact) : ''}</div>
          <div class="list-sub">${htmlEsc(summarize(o.items))} — ${htmlEsc(money(o.total))}</div>
        </div>
        <button type="button" class="qc-btn" style="width:auto;padding:0 12px;color:var(--brand)" onclick="resolveOrderRequest(${o.id},'confirm')">${htmlEsc(t('shop_order_confirm'))}</button>
        <button type="button" class="qc-btn" style="width:auto;padding:0 12px;color:var(--text3)" onclick="resolveOrderRequest(${o.id},'decline')">${htmlEsc(t('shop_order_decline'))}</button>
      </div>`).join('') : `<div class="pkg-status"><span>${htmlEsc(t('shop_orders_none'))}</span></div>`;
  el.innerHTML = `
    <div class="section-title" style="font-size:12px;margin:14px 16px 8px">${htmlEsc(t('shop_orders_pending'))}</div>
    <div class="list-card" style="margin:0 16px 14px">${rowsHtml}</div>`;
}
// Materialize a freelancer-confirmed shop order request as a local pipeline
// engagement — this IS the M3-L2 payoff: items[] pre-attached means
// openQuoteForJob/openInvoiceForm (M3-L2, already shipped) pick these up
// automatically, so quote → invoice → paid → stock decrement all just work
// without the freelancer retyping anything. Structure follows
// createLocalBookingFromLineRequest above: idempotence guard first (a
// double-tap on Confirm, or resolveOrderRequest running twice against the
// same id across a re-render, must never create two jobs for one order),
// then the local record, then the mirror.
async function createLocalJobFromOrderRequest(o) {
  const already = (await dbAll('jobs')).some(x => x.shopOrderId === o.id);
  if (already) return;
  const uid = isGuest ? 'guest' : currentUser.id;
  // Resolves each snapshot line's service_cuid to THIS device's local
  // numeric services id (services is already loaded by reload()) — null
  // when the product isn't known locally (e.g. a different device created
  // it), same "resolve by cuid, null if not found" fallback dataClient.js's
  // refCuid()/fromJobRow() already use elsewhere. name/qty/unitPrice
  // snapshots carry over regardless of whether the resolution succeeds.
  const mappedItems = (o.items || []).map(it => {
    const localSvc = services.find(s => s.cuid === it.service_cuid);
    return { id: cuid(), serviceId: localSvc ? localSvc.id : null, name: it.name, qty: it.qty, unitPrice: it.unit_price };
  });
  const job = {
    uid, date: todayISO(), client: o.clientName || '', clientId: null,
    serviceId: null, serviceName: t('shop_order_service'),
    jobType: settings.workType || '',
    amount: Number(o.total) || 0, tip: 0, expense: 0, count: 1,
    notes: 'Shop order · ' + (o.contact || ''),
    netAmount: Number(o.total) || 0,
    cuid: cuid(), stageOrder: getStageOrder().slice(), stage: getStageOrder()[0], complete: false,
    invoiceId: null, quoteDocId: null, packageId: null,
    items: mappedItems,
    // Local-only marker (this order request's server-side `id`), used by
    // the idempotence guard above — deliberately NOT included in
    // jobsMirror's toPayload (dataClient.js), same convention as
    // createLocalBookingFromLineRequest's lineBookingId.
    shopOrderId: o.id,
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  const key = await dbAdd('jobs', job); job.id = key;
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled())
    SidekickBackend.mirrorJobSave(job).catch(() => {});
}
async function resolveOrderRequest(id, action) {
  const r = await SidekickBackend.orderRequestResolve(id, action);
  if (!r.ok) {
    toast((r.data && r.data.error) || t('shop_orders_none'));
    renderShopOrdersSection();   // list is stale either way — refresh
    return;
  }
  if (action === 'confirm') {
    // window.__pendingOrderRows (renderShopOrdersSection above) carries the
    // full row keyed by id — see that function's comment.
    const row = window.__pendingOrderRows && window.__pendingOrderRows[id];
    if (row) await createLocalJobFromOrderRequest(row);
    await reload();   // re-fetches jobs + calls renderPipeline() if defined
    toast(t('shop_order_confirmed_toast'));
  } else {
    toast(t('shop_order_declined_toast'));
  }
  renderShopOrdersSection();
}
window.resolveOrderRequest = resolveOrderRequest;

// ─── SLIP VERIFICATION (M4 Pass P2) ──────────────────────────────────────
// Settings ▸ Shop ▸ Slip verification: provider-pluggable auto-check of
// client-uploaded payment slips against the bank record (lib/slipVerify.js
// + api/slip-verify.js). Provider credentials are a per-account secret,
// same convention as the LINE channel secret (renderLineChannelSection) —
// saved via saveSetting() into this account's own settings store, and never
// sent anywhere except fresh on each verify call itself (the server never
// persists them, see api/slip-verify.js's header). Same backend-gated
// pattern as renderShopSection() — verification only exists server-side.
const SLIP_VERIFY_PROVIDERS = ['slipok'];
async function renderSlipVerifySection() {
  const el = document.getElementById('slip-verify-body');
  if (!el) return;
  if (isGuest || typeof SidekickBackend === 'undefined' || !SidekickBackend.isEnabled()) {
    el.innerHTML = '';
    return;
  }
  const provider = SLIP_VERIFY_PROVIDERS.includes(settings.slipVerifyProvider) ? settings.slipVerifyProvider : '';
  el.innerHTML = `
    <div class="section-title" style="font-size:12px;margin:14px 16px 4px">${htmlEsc(t('slipverify_title'))}</div>
    <p style="font-size:12px;color:var(--text3);margin:0 16px 10px">${htmlEsc(t('slipverify_hint'))}</p>
    <div class="field" style="margin:0 16px 10px;padding:0;border:1px solid var(--border);border-radius:var(--radius-sm)">
      <label for="slipverify-provider" style="display:block;font-size:11px;font-weight:700;color:var(--text3);padding:8px 12px 0;text-transform:uppercase;letter-spacing:.3px">${htmlEsc(t('slipverify_title'))}</label>
      <select id="slipverify-provider" style="width:100%;border:none;background:none;padding:2px 12px 10px;font-family:inherit;font-size:14px;color:var(--text)" onchange="onSlipVerifyProviderChange(this.value)">
        <option value=""${provider ? '' : ' selected'}>${htmlEsc(t('slipverify_none'))}</option>
        <option value="slipok"${provider === 'slipok' ? ' selected' : ''}>SlipOK</option>
      </select>
    </div>
    ${provider ? `
    <div class="field" style="margin:0 16px 10px;padding:0;border:1px solid var(--border);border-radius:var(--radius-sm)">
      <label for="slipverify-key" style="display:block;font-size:11px;font-weight:700;color:var(--text3);padding:8px 12px 0;text-transform:uppercase;letter-spacing:.3px">${htmlEsc(t('slipverify_key_label'))}</label>
      <input class="settings-input" id="slipverify-key" type="password" value="${attrEsc(settings.slipVerifyKey || '')}" style="width:100%;border:none;background:none;padding:2px 12px 10px" onchange="onSlipVerifyKeyChange(this.value)">
    </div>
    <div class="field" style="margin:0 16px 14px;padding:0;border:1px solid var(--border);border-radius:var(--radius-sm)">
      <label for="slipverify-branch" style="display:block;font-size:11px;font-weight:700;color:var(--text3);padding:8px 12px 0;text-transform:uppercase;letter-spacing:.3px">${htmlEsc(t('slipverify_branch_label'))}</label>
      <input class="settings-input" id="slipverify-branch" type="text" value="${attrEsc(settings.slipVerifyBranch || '')}" style="width:100%;border:none;background:none;padding:2px 12px 10px" onchange="onSlipVerifyBranchChange(this.value)">
    </div>` : ''}
  `;
}
async function onSlipVerifyProviderChange(v) {
  await saveSetting('slipVerifyProvider', SLIP_VERIFY_PROVIDERS.includes(v) ? v : '');
  renderSlipVerifySection();
}
async function onSlipVerifyKeyChange(v) { await saveSetting('slipVerifyKey', (v || '').trim()); }
async function onSlipVerifyBranchChange(v) { await saveSetting('slipVerifyBranch', (v || '').trim()); }

async function addBookingSlot() {
  const startEl = document.getElementById('slot-start-input');
  const endEl = document.getElementById('slot-end-input');
  const startsAtLocal = startEl && startEl.value;
  const endsAtLocal = endEl && endEl.value;
  if (!startsAtLocal || !endsAtLocal) { toast(t('slot_missing_fields')); return; }
  if (endsAtLocal <= startsAtLocal) { toast(t('slot_end_before_start')); return; }
  const r = await SidekickBackend.bookingSlotCreate({
    startsAt: new Date(startsAtLocal).toISOString(),
    endsAt: new Date(endsAtLocal).toISOString(),
  });
  if (!r.ok) { toast(t('slot_add_failed')); return; }
  renderBookingSlotsSection();
}
async function deleteBookingSlot(id) {
  await SidekickBackend.bookingSlotDelete(id);
  renderBookingSlotsSection();
}

// Content for seedDemoData() above. Every date is a day-offset from "today"
// (negative = past, positive = future, 0 = today), never a literal string —
// see seedDemoData()'s relDate() — so a demo run months from now still looks
// current, not stale. `serviceName` values match BUSINESS_TYPES' own seeded
// service names (app.js, ~line 461) so demo jobs/invoices reference real,
// already-seeded services rather than inventing new ones. 'custom' has no
// entry — there's no generic "custom" business content to fabricate, same
// reasoning BUSINESS_TYPES.custom has an empty seedServices list.
const DEMO_PERSONA_DATA = {
  trainer: {
    clients: [
      { name: 'Nok Srisawat', phone: '081-234-5671', email: 'nok.s@example.com', tags: 'weight loss',
        goals: 'Lose 5kg before Songkran, build core strength', healthNotes: 'Mild knee sensitivity — avoid high-impact jumps',
        mealPlan: ['Breakfast: eggs + oats', 'Lunch: grilled chicken salad', 'Dinner: steamed fish + vegetables'] },
      { name: 'Beam Charoensuk', phone: '081-234-5672', email: 'beam.c@example.com', tags: 'muscle building',
        goals: 'Add 3kg lean muscle, bench press 80kg', mealPlan: ['High-protein breakfast shake', 'Post-workout: whey + banana'] },
      { name: 'Ploy Nakornthep', phone: '081-234-5673', tags: 'postnatal',
        goals: 'Rebuild core strength after pregnancy, low-impact only', healthNotes: 'Cleared by doctor for light exercise as of last month' },
      { name: 'Golf Ratanakosin', phone: '081-234-5674', tags: 'marathon',
        goals: 'Sub-4:30 marathon in November', mealPlan: ['Carb-load 2 days before long runs'] },
      { name: 'Fah Wongsakul', phone: '081-234-5675', tags: 'senior fitness',
        goals: 'Improve balance and mobility', healthNotes: 'Mild hypertension — keep heart rate moderate' },
    ],
    jobs: [
      { clientIndex: 3, stage: 'inquiry', daysOffset: -1, amount: 800, serviceName: '1-on-1 session', notes: 'Interested in a marathon prep package' },
      { clientIndex: 4, stage: 'quote', daysOffset: -2, amount: 1600, count: 2, serviceName: '1-on-1 session', notes: 'Sent quote for 2x/week sessions' },
      { clientIndex: 2, stage: 'booked', daysOffset: -3, amount: 2400, count: 3, serviceName: '1-on-1 session', notes: '3 sessions this week' },
      { clientIndex: 1, stage: 'booked', paid: true, daysOffset: -5, amount: 800, serviceName: '1-on-1 session' },
      { clientIndex: 0, stage: 'deliver', paid: true, daysOffset: -7, amount: 800, serviceName: '1-on-1 session' },
      { clientIndex: 0, stage: 'deliver', paid: true, daysOffset: -14, amount: 4000, serviceName: 'Nutrition plan', complete: true, outcome: 'extended', notes: 'Renewed for another month' },
    ],
    invoices: [
      { clientIndex: 2, daysOffset: -3, status: 'draft', lineItems: [{ description: '1-on-1 session x3', qty: 3, unitPrice: 800 }] },
      { clientIndex: 4, daysOffset: -6, status: 'sent', lineItems: [{ description: '1-on-1 session x2', qty: 2, unitPrice: 800 }] },
      { clientIndex: 1, daysOffset: -20, status: 'paid', lineItems: [{ description: 'Nutrition plan', qty: 1, unitPrice: 2000 }, { description: '1-on-1 session x2', qty: 2, unitPrice: 800 }] },
    ],
    bookings: [
      { clientIndex: 0, title: '1-on-1 session', daysOffset: 1, startTime: '07:00', durationMin: 60 },
      { clientIndex: 1, title: '1-on-1 session', daysOffset: 2, startTime: '18:00', durationMin: 60 },
      { clientIndex: 3, title: 'Group class', daysOffset: 3, startTime: '06:30', durationMin: 45 },
    ],
    packages: [
      { clientIndex: 0, totalSessions: 10, price: 7200, daysOffset: -14 },
      { clientIndex: 3, totalSessions: 5, price: 3600, daysOffset: -1 },
    ],
    progressLogs: [
      { clientIndex: 0, daysOffset: -30, weight: 68, notes: 'Starting weight' },
      { clientIndex: 0, daysOffset: -14, weight: 66.5, notes: 'Good progress' },
      { clientIndex: 0, daysOffset: -2, weight: 65, notes: 'Down 3kg total' },
    ],
  },
  realestate: {
    clients: [
      { name: 'Ann Thongchai', phone: '081-345-6781', email: 'ann.t@example.com', tags: 'buyer', searchBrief: '2BR condo near BTS, budget 5-7M',
        deals: [{ property: 'The Base Sukhumvit 77, 35sqm', stage: 'viewing', commission: 90000, notes: 'Very interested, comparing 2 units',
          viewings: [{ date: -6, verdict: 'interested' }, { date: -2, verdict: 'interested' }] }] },
      { name: 'Mai Suriyan', phone: '081-345-6782', tags: 'seller',
        deals: [{ property: 'Townhouse, Ramkhamhaeng, 3BR', stage: 'negotiating', commission: 150000, notes: 'Buyer offered 8% below asking',
          viewings: [{ date: -10, verdict: 'interested' }] }] },
      { name: 'Boss Pattaranan', phone: '081-345-6783', tags: 'buyer',
        deals: [{ property: 'Land plot, Bang Na, 400sqm', stage: 'offer', commission: 120000, notes: 'Offer submitted, awaiting response',
          viewings: [{ date: -8, verdict: 'interested' }] }] },
      { name: 'Kob Iamsuwan', phone: '081-345-6784', tags: 'closed deal',
        deals: [{ property: 'Noble Around Ari, 1BR', stage: 'closed', commission: 75000, notes: 'Deal closed, commission collected',
          viewings: [{ date: -40, verdict: 'interested' }] }] },
      { name: 'Tar Wattana', phone: '081-345-6785', tags: 'searching',
        deals: [{ property: '', stage: 'searching', commission: 0, notes: 'Still narrowing down neighborhoods', viewings: [] }] },
    ],
    jobs: [
      { clientIndex: 4, stage: 'inquiry', daysOffset: -1, amount: 0, serviceName: 'Listing consultation', notes: 'Initial consultation call' },
      { clientIndex: 2, stage: 'quote', daysOffset: -3, amount: 120000, serviceName: 'Property viewing', notes: 'Quoted commission structure for land deal' },
      { clientIndex: 1, stage: 'booked', daysOffset: -4, amount: 150000, serviceName: 'Property viewing', notes: 'Invoice sent for closed negotiation' },
      { clientIndex: 0, stage: 'booked', paid: true, daysOffset: -6, amount: 90000, serviceName: 'Property viewing' },
      { clientIndex: 3, stage: 'deliver', paid: true, daysOffset: -10, amount: 75000, serviceName: 'Property viewing', notes: 'Finalizing paperwork' },
      { clientIndex: 3, stage: 'deliver', paid: true, daysOffset: -40, amount: 75000, serviceName: 'Property viewing', complete: true, outcome: 'finished', notes: 'Deal fully closed' },
    ],
    invoices: [
      { clientIndex: 2, daysOffset: -3, status: 'draft', lineItems: [{ description: 'Commission — Land plot Bang Na', qty: 1, unitPrice: 120000 }] },
      { clientIndex: 1, daysOffset: -4, status: 'sent', lineItems: [{ description: 'Commission — Townhouse Ramkhamhaeng', qty: 1, unitPrice: 150000 }] },
      { clientIndex: 3, daysOffset: -40, status: 'paid', lineItems: [{ description: 'Commission — Noble Around Ari', qty: 1, unitPrice: 75000 }] },
    ],
    bookings: [
      { clientIndex: 0, title: 'Property viewing', daysOffset: 1, startTime: '10:00', durationMin: 60, location: 'The Base Sukhumvit 77' },
      { clientIndex: 2, title: 'Site visit', daysOffset: 2, startTime: '14:00', durationMin: 90, location: 'Bang Na land plot' },
      { clientIndex: 4, title: 'Consultation call', daysOffset: 0, startTime: '16:00', durationMin: 30 },
    ],
  },
  laundry: {
    clients: [
      { name: 'Nid Phromma', phone: '081-456-7891', tags: 'regular', preferences: 'No fabric softener', monthlyKgPlan: '20kg/month',
        orders: [{ date: -1, kg: 5, status: 'washing', notes: '2 bedsheets + towels' }] },
      { name: 'Aom Kittisak', phone: '081-456-7892', tags: 'weekly', orders: [{ date: -2, kg: 3, status: 'ready', notes: 'Office shirts' }] },
      { name: 'Bank Suwanphan', phone: '081-456-7893', tags: 'dry clean', orders: [{ date: -5, kg: 2, status: 'completed', notes: 'Suit + 2 dresses, dry clean' }] },
      { name: 'Ice Ruangrit', phone: '081-456-7894', tags: 'new', orders: [{ date: 0, kg: 4, status: 'received', notes: 'First order, mixed laundry' }] },
      { name: 'Milk Chaowarat', phone: '081-456-7895', tags: 'regular', orders: [{ date: -3, kg: 6, status: 'completed', notes: 'Weekly household laundry' }] },
    ],
    jobs: [
      { clientIndex: 3, stage: 'inquiry', daysOffset: 0, amount: 600, serviceName: 'Wash & fold', notes: 'New customer inquiry' },
      { clientIndex: 0, stage: 'quote', daysOffset: -1, amount: 750, count: 5, serviceName: 'Wash & fold', notes: 'Quoted for 5kg wash & fold' },
      { clientIndex: 1, stage: 'booked', daysOffset: -2, amount: 450, count: 3, serviceName: 'Wash & fold' },
      { clientIndex: 2, stage: 'booked', paid: true, daysOffset: -5, amount: 160, count: 2, serviceName: 'Dry cleaning' },
      { clientIndex: 4, stage: 'deliver', paid: true, daysOffset: -3, amount: 900, count: 6, serviceName: 'Wash & fold' },
      { clientIndex: 4, stage: 'deliver', paid: true, daysOffset: -10, amount: 900, serviceName: 'Wash & fold', complete: true, outcome: 'extended', notes: 'Signed up for weekly plan' },
    ],
    invoices: [
      { clientIndex: 0, daysOffset: -1, status: 'draft', lineItems: [{ description: 'Wash & fold 5kg', qty: 5, unitPrice: 150 }] },
      { clientIndex: 1, daysOffset: -2, status: 'sent', lineItems: [{ description: 'Wash & fold 3kg', qty: 3, unitPrice: 150 }] },
      { clientIndex: 2, daysOffset: -5, status: 'paid', lineItems: [{ description: 'Dry cleaning x2', qty: 2, unitPrice: 80 }] },
    ],
    bookings: [
      { clientIndex: 3, title: 'Pickup', daysOffset: 0, startTime: '09:00', durationMin: 15 },
      { clientIndex: 0, title: 'Delivery', daysOffset: 1, startTime: '17:00', durationMin: 15 },
      { clientIndex: 4, title: 'Pickup', daysOffset: 4, startTime: '09:30', durationMin: 15 },
    ],
  },
  insurance: {
    clients: [
      { name: 'Somchai Boonmee', phone: '081-567-8901', tags: 'health', birthday: '1985-03-12', referredBy: 'Friend referral',
        policies: [{ name: 'Health Plus Premium', renewalDate: 20 }] },
      { name: 'Kanya Srisombat', phone: '081-567-8902', tags: 'motor',
        policies: [{ name: 'Motor Comprehensive', renewalDate: 5 }, { name: 'Home Insurance', renewalDate: 90 }] },
      { name: 'Preecha Wattanasin', phone: '081-567-8903', tags: 'life', policies: [{ name: 'Life Assurance 20-Pay', renewalDate: 180 }] },
      { name: 'Siriporn Chaiyasit', phone: '081-567-8904', tags: 'claim', policies: [{ name: 'Health Plus Premium', renewalDate: 60 }] },
      { name: 'Anurak Thepsuwan', phone: '081-567-8905', tags: 'new lead', policies: [] },
    ],
    jobs: [
      { clientIndex: 4, stage: 'inquiry', daysOffset: 0, amount: 0, serviceName: 'Policy review', notes: 'Requested a quote for health coverage' },
      { clientIndex: 1, stage: 'quote', daysOffset: -1, amount: 18000, serviceName: 'Policy review', notes: 'Quoted motor renewal + home bundle' },
      { clientIndex: 0, stage: 'booked', daysOffset: -3, amount: 24000, serviceName: 'Policy review', notes: 'Health Plus Premium renewal' },
      { clientIndex: 2, stage: 'booked', paid: true, daysOffset: -7, amount: 45000, serviceName: 'Policy review' },
      { clientIndex: 3, stage: 'deliver', paid: true, daysOffset: -2, amount: 0, serviceName: 'Claim assistance', notes: 'Processing hospital claim' },
      { clientIndex: 3, stage: 'deliver', paid: true, daysOffset: -30, amount: 0, serviceName: 'Claim assistance', complete: true, outcome: 'finished', notes: 'Claim settled successfully' },
    ],
    invoices: [
      { clientIndex: 1, daysOffset: -1, status: 'draft', lineItems: [{ description: 'Motor Comprehensive renewal', qty: 1, unitPrice: 12000 }, { description: 'Home Insurance renewal', qty: 1, unitPrice: 6000 }] },
      { clientIndex: 0, daysOffset: -3, status: 'sent', lineItems: [{ description: 'Health Plus Premium renewal', qty: 1, unitPrice: 24000 }] },
      { clientIndex: 2, daysOffset: -7, status: 'paid', lineItems: [{ description: 'Life Assurance 20-Pay annual premium', qty: 1, unitPrice: 45000 }] },
    ],
    bookings: [
      { clientIndex: 4, title: 'Policy consultation', daysOffset: 1, startTime: '11:00', durationMin: 45 },
      { clientIndex: 1, title: 'Renewal review', daysOffset: 3, startTime: '15:00', durationMin: 30 },
      { clientIndex: 3, title: 'Claim follow-up call', daysOffset: 0, startTime: '13:00', durationMin: 20 },
    ],
  },
  garage: {
    clients: [
      { name: 'Sombat Charoenkul', phone: '081-678-9011', tags: 'regular', vehicles: [{ plate: 'กข 1234 กรุงเทพ', mileage: 45000, nextServiceDate: 14 }],
        serviceHistory: [{ date: -30, note: 'Oil change + filter' }, { date: -90, note: 'Brake pad replacement' }] },
      { name: 'Waree Suksri', phone: '081-678-9012', tags: 'new', vehicles: [{ plate: '1กค 5678 นนทบุรี', mileage: 12000, nextServiceDate: 45 }],
        serviceHistory: [{ date: -5, note: 'First visit — general inspection' }] },
      { name: 'Decha Phongsathorn', phone: '081-678-9013', tags: 'fleet',
        vehicles: [{ plate: 'ทข 9012 กรุงเทพ', mileage: 88000, nextServiceDate: 3 }, { plate: 'ทข 9013 กรุงเทพ', mileage: 76000, nextServiceDate: 20 }],
        serviceHistory: [{ date: -14, note: 'Full service — both vehicles' }] },
      { name: 'Ratree Munkong', phone: '081-678-9014', tags: 'regular', vehicles: [{ plate: '2กง 3456 ปทุมธานี', mileage: 60000, nextServiceDate: 60 }],
        serviceHistory: [{ date: -20, note: 'Tire rotation + alignment' }] },
      { name: 'Somsak Intharaphan', phone: '081-678-9015', tags: 'urgent', vehicles: [{ plate: '3กจ 7890 กรุงเทพ', mileage: 95000, nextServiceDate: 0 }], serviceHistory: [] },
    ],
    jobs: [
      { clientIndex: 4, stage: 'inquiry', daysOffset: 0, amount: 0, serviceName: 'Oil change', notes: 'Called about strange engine noise' },
      { clientIndex: 2, stage: 'quote', daysOffset: -1, amount: 5000, count: 2, serviceName: 'Full service', notes: 'Quoted fleet service for both vehicles' },
      { clientIndex: 3, stage: 'booked', daysOffset: -3, amount: 2500, serviceName: 'Full service' },
      { clientIndex: 1, stage: 'booked', paid: true, daysOffset: -5, amount: 600, serviceName: 'Oil change' },
      { clientIndex: 0, stage: 'deliver', paid: true, daysOffset: -1, amount: 2500, serviceName: 'Full service', notes: 'In the shop now' },
      { clientIndex: 0, stage: 'deliver', paid: true, daysOffset: -90, amount: 1800, serviceName: 'Full service', complete: true, outcome: 'extended', notes: 'Rebooked for next service' },
    ],
    invoices: [
      { clientIndex: 3, daysOffset: -3, status: 'draft', lineItems: [{ description: 'Full service', qty: 1, unitPrice: 2500 }] },
      { clientIndex: 2, daysOffset: -1, status: 'sent', lineItems: [{ description: 'Full service x2 vehicles', qty: 2, unitPrice: 2500 }] },
      { clientIndex: 1, daysOffset: -5, status: 'paid', lineItems: [{ description: 'Oil change', qty: 1, unitPrice: 600 }] },
    ],
    bookings: [
      { clientIndex: 4, title: 'Diagnostic check', daysOffset: 0, startTime: '09:00', durationMin: 60 },
      { clientIndex: 0, title: 'Full service pickup', daysOffset: 1, startTime: '16:00', durationMin: 30 },
      { clientIndex: 2, title: 'Fleet service', daysOffset: 2, startTime: '08:00', durationMin: 180 },
    ],
  },
  kol: {
    clients: [
      { name: 'Mai Suksawat', phone: '081-789-0121', email: 'mai.s@example.com', tags: 'beauty brand' },
      { name: 'Ken Charoenphol', phone: '081-789-0122', tags: 'tech/gadget brand' },
      { name: 'Fon Rattanasiri', phone: '081-789-0123', tags: 'food & lifestyle brand' },
      { name: 'Boss Wiriyaporn', phone: '081-789-0124', tags: 'fashion brand' },
      { name: 'Ice Thanawat', phone: '081-789-0125', tags: 'general/affiliate brand' },
    ],
    jobs: [
      { clientIndex: 4, stage: 'inquiry', daysOffset: 0, amount: 0, serviceName: 'Content posting', notes: 'Brand reached out about a product review post' },
      { clientIndex: 3, stage: 'quote', daysOffset: -1, amount: 8000, serviceName: 'Live broadcast + affiliate', notes: 'Quoted a live selling session with affiliate commission tie-in' },
      { clientIndex: 2, stage: 'booked', daysOffset: -3, amount: 3000, serviceName: 'Content posting' },
      { clientIndex: 1, stage: 'booked', paid: true, daysOffset: -5, amount: 3000, serviceName: 'Content posting' },
      { clientIndex: 0, stage: 'deliver', paid: true, daysOffset: -1, amount: 8000, serviceName: 'Live broadcast + affiliate', notes: 'Live airs tonight' },
      { clientIndex: 0, stage: 'deliver', paid: true, daysOffset: -30, amount: 3000, serviceName: 'Content posting', complete: true, outcome: 'extended', notes: 'Rebooked for next month’s campaign' },
    ],
    invoices: [
      { clientIndex: 2, daysOffset: -3, status: 'draft', lineItems: [{ description: 'Content posting x1', qty: 1, unitPrice: 3000 }] },
      { clientIndex: 3, daysOffset: -1, status: 'sent', lineItems: [{ description: 'Live broadcast + affiliate', qty: 1, unitPrice: 8000 }] },
      { clientIndex: 1, daysOffset: -5, status: 'paid', lineItems: [{ description: 'Content posting x1', qty: 1, unitPrice: 3000 }] },
    ],
    bookings: [
      { clientIndex: 0, title: 'Live broadcast', daysOffset: 1, startTime: '20:00', durationMin: 90 },
      { clientIndex: 2, title: 'Content shoot', daysOffset: 2, startTime: '10:00', durationMin: 120 },
      { clientIndex: 3, title: 'Brand kickoff call', daysOffset: 0, startTime: '14:00', durationMin: 30 },
    ],
  },
};

async function startSubscriptionCheckout(plan) {
  const r = await SidekickBackend.billingCheckout(plan);
  if (!r.ok || !r.data.url) { toast(t('subscription_checkout_failed')); return; }
  window.location.href = r.data.url;
}
window.startSubscriptionCheckout = startSubscriptionCheckout;
async function openBillingPortal() {
  const r = await SidekickBackend.billingPortal();
  if (!r.ok || !r.data.url) { toast(t('subscription_portal_failed')); return; }
  window.location.href = r.data.url;
}
window.openBillingPortal = openBillingPortal;

// The migration plan's actual "back up your existing data" first-login
// prompt — surfaced proactively instead of requiring a user to notice the
// Settings row above on their own. Shown at most once per local account
// (localStorage flag, not the server's users.migrated_at — this account may
// not even exist server-side yet), and never blocks app use either way:
// "Not now" and "Enable" both dismiss it for good, Settings still has the
// same row for anyone who changes their mind later.
async function maybeShowCloudBackupModal() {
  if (isGuest || typeof SidekickBackend === 'undefined' || SidekickBackend.isEnabled()) return;
  const seenKey = 'sidekick_backup_modal_seen_' + currentUser.id;
  if (localStorage.getItem(seenKey)) return;
  localStorage.setItem(seenKey, '1');
  const localUser = await dbGet('users', currentUser.id);
  // A password account always has a hash to register with (api/auth-
  // register.js). A LINE account (no password at all) instead needs its
  // stored signed identity proof (api/auth-register-line.js,
  // 2026-07-16) — only missing for a LINE account that signed in before
  // that token existed, where an "Enable" button really would be
  // guaranteed to fail (see enableCloudBackup()'s own matching check).
  if (!localUser || !(localUser.hash || (localUser.lineAuth && localUser.lineIdentityToken))) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'cloud-backup-modal';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${attrEsc(t('cloud_backup_title'))}">
      <div class="modal-handle"></div>
      <div class="modal-title">${htmlEsc(t('cloud_backup_title'))}</div>
      <div class="form-body" style="padding:0 20px 4px">
        <p style="color:var(--text2);font-size:14px;line-height:1.5;margin:0 0 16px">${htmlEsc(t('cloud_backup_modal_body'))}</p>
      </div>
      <button type="button" class="btn-submit" id="cloud-backup-modal-enable">${htmlEsc(t('cloud_backup_enable_btn'))}</button>
      <button type="button" class="btn-danger" id="cloud-backup-modal-later" style="border-color:var(--border-mid);color:var(--text3)">${htmlEsc(t('cloud_backup_later_btn'))}</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('cloud-backup-modal-later').addEventListener('click', () => overlay.remove());
  document.getElementById('cloud-backup-modal-enable').addEventListener('click', async () => {
    overlay.remove();
    await enableCloudBackup();
  });
}

// ─── Notifications (in-app Action Queue + OS-level, app-triggered) ─────
// App-triggered, not server-triggered: everything here only fires while
// this tab is open (or freshly backgrounded) — there's no backend, so
// nothing can wake the app up to check conditions while it's fully
// closed. A real server-triggered version (synced data + a scheduled job,
// so e.g. an overdue invoice notifies you even days after you last opened
// the app) is a deliberate next milestone, not attempted here.
const NOTIFY_STALE_DAYS = 3;         // engagement sitting in one stage this long -> nudge
const NOTIFY_BOOKING_LEAD_MIN = 60;  // booking starting within this many minutes -> nudge
function hhmmToMin(hhmm) {
  if (!hhmm) return 0;
  const p = String(hhmm).split(':');
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
}
// Single source of truth for "what needs attention right now" — used by
// both the in-app Action Queue (renderHome) and the OS-notification check
// (checkAndFireNotifications), so the two can never disagree.
async function computeNotificationConditions() {
  const uid = isGuest ? 'guest' : currentUser.id;
  const todayStr = todayISO();
  const [allInvoices, allBookings] = await Promise.all([dbAll('invoices'), dbAll('bookings')]);

  const overdueInvoices = allInvoices.filter(i => i.uid === uid && i.status !== 'paid' && i.dueDate && i.dueDate < todayStr);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const upcomingBookings = allBookings
    .filter(b => b.uid === uid && b.status === 'scheduled' && b.date === todayStr)
    .filter(b => { const start = hhmmToMin(b.startTime); return start >= nowMin && start - nowMin <= NOTIFY_BOOKING_LEAD_MIN; });

  const staleJobs = jobs.filter(j => !jobComplete(j) && daysSinceISO((j.updatedAt || '').slice(0, 10)) >= NOTIFY_STALE_DAYS);

  return { overdueInvoices, upcomingBookings, staleJobs };
}
function notifyConditionKey(kind, id, extra) {
  return kind + ':' + id + (extra ? ':' + extra : '');
}
async function showOsNotification(title, body, tag) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!navigator.serviceWorker) return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, tag, icon: 'icons/icon.svg' });
  } catch (e) { console.error('showNotification failed', e); }
}
// Fires an OS notification for each condition that's newly true since the
// last check, and — just as importantly — forgets conditions that have
// since resolved (invoice paid, booking passed, stage advanced), so the
// SAME kind of event can notify again the next time it happens.
async function checkAndFireNotifications() {
  if (!settings.notificationsEnabled) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  let cond;
  try { cond = await computeNotificationConditions(); } catch (e) { console.error(e); return; }
  const notified = settings.notifiedIds || {};
  const nextNotified = {};
  const toFire = [];

  cond.overdueInvoices.forEach(i => {
    const k = notifyConditionKey('inv', i.id);
    nextNotified[k] = true;
    if (!notified[k]) toFire.push({ title: 'Invoice overdue', body: `${i.number || 'Invoice'} · ${i.clientName || 'Client'} — ${money(i.clientPays)}`, tag: k });
  });
  cond.upcomingBookings.forEach(b => {
    const k = notifyConditionKey('bk', b.id);
    nextNotified[k] = true;
    if (!notified[k]) toFire.push({ title: 'Upcoming booking', body: `${b.title || 'Booking'} at ${b.startTime}`, tag: k });
  });
  cond.staleJobs.forEach(j => {
    const st = (typeof jobStage === 'function') ? jobStage(j) : '';
    const k = notifyConditionKey('job', j.id, st);
    nextNotified[k] = true;
    if (!notified[k]) toFire.push({ title: 'Engagement needs attention', body: `${j.client || 'Client'} has been in ${t((STAGE_META[st] || {}).label) || st} for a few days`, tag: k });
  });

  for (const n of toFire) await showOsNotification(n.title, n.body, n.tag);
  if (JSON.stringify(nextNotified) !== JSON.stringify(notified)) await saveSetting('notifiedIds', nextNotified);
}
async function onNotificationsToggle(checked) {
  if (checked) {
    if (typeof Notification === 'undefined') { toast('Notifications are not supported on this device'); document.getElementById('set-notifications').checked = false; return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Notification permission was not granted'); document.getElementById('set-notifications').checked = false; return; }
  }
  await saveSetting('notificationsEnabled', checked);
  if (checked) checkAndFireNotifications();
}
// Stage-gate prompt on/off (see gateAfterForwardMove). Stored inverted
// (stageGateOff) so the absent/legacy value means ON — no migration pass.
async function onStageGateToggle(checked) {
  await saveSetting('stageGateOff', !checked);
}
window.onStageGateToggle = onStageGateToggle;

async function renderHome() {
  // greeting
  const greetEl = document.getElementById('home-greeting');
  if (greetEl) greetEl.textContent = `${t('greeting_' + greetingPeriod())}, ${displayName()}`;

  // Only jobs whose stage actually reached Paid count as earned — see
  // jobEarned(). Home's headline number must agree with the Invoices
  // screen, not with the inquiry pipeline.
  const mj = jobsThisMonth().filter(jobEarned);
  const gross = mj.reduce((s,j)=> s + (Number(j.amount)||0) + (Number(j.tip)||0), 0);
  const exp = mj.reduce((s,j)=> s + (Number(j.expense)||0), 0);
  const net = gross - exp;
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('hero-label', t('earned_this_month'));
  setTxt('hero-amt', money(net));
  setTxt('stat-jobs-val', mj.length);
  setTxt('stat-avg-val', money(mj.length ? net / mj.length : 0));
  setTxt('stat-exp-val', money(exp));

  renderGoal();
  updateMoreNavBadge();
  renderHomeToday();
}
// ─── HOME "TODAY" CARD (TSK-009 — merges the old home-alert-card,
// attn-card "Needs attention" and incoming-pipeline "Up next" into one
// prioritized list-card) ────────────────────────────────────────────────
//
// orderRequestsList() is a real network fetch, and renderHome() can run on
// every screen switch/save — caching it here for ATTN_ORDERS_CACHE_MS keeps
// that from turning into a fetch storm; a stale order count for up to a
// minute is an acceptable trade. The new-slip count is a pure local
// IndexedDB read (dbAll('invoices')) so it's always recomputed fresh —
// that's also what makes it drop immediately once stampSlipsSeen()
// (app/invoices.js's openInvoiceDetail) marks an invoice's slips seen.
let __attnOrdersCache = { at: 0, count: 0 };
const ATTN_ORDERS_CACHE_MS = 60_000;
async function attnOrdersCount() {
  const now = Date.now();
  if (now - __attnOrdersCache.at < ATTN_ORDERS_CACHE_MS) return __attnOrdersCache.count;
  const r = await SidekickBackend.orderRequestsList();
  const count = r.ok && Array.isArray(r.data.rows) ? r.data.rows.length : __attnOrdersCache.count;
  __attnOrdersCache = { at: now, count };
  return count;
}
// A slip counts as "new" for this invoice when it's client-sourced (came in
// through the public invoice page, api/invoice-public.js — a slip the
// freelancer attached herself was never unseen to begin with) AND is newer
// than the last time she opened this invoice's detail modal.
async function attnNewSlipInvoiceCount() {
  const uid = isGuest ? 'guest' : currentUser.id;
  const rows = await dbAll('invoices');
  return rows.filter(inv => inv.uid === uid && Array.isArray(inv.slips) &&
    inv.slips.some(s => s && s.source === 'client' && String(s.at || '') > String(inv.slipsSeenAt || ''))
  ).length;
}
// Today's next not-yet-started booking (TSK-009: new capability — the design
// mockup's "16:00 — Session with Mek / Next up · Booked" row has no equivalent
// pre-merge source; a `booked`-stage pipeline job is a different concept (no
// time-of-day, no "next" selection) so this reads the real bookings store
// instead of re-purposing pipeline data. Same store computeNotificationConditions()
// already reads for the "upcoming booking" OS notification, so Home and the
// notification never disagree about what "today's next booking" means.
async function nextBookingToday() {
  const uid = isGuest ? 'guest' : currentUser.id;
  const todayStr = todayISO();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const rows = (await dbAll('bookings'))
    .filter(b => b.uid === uid && b.status === 'scheduled' && b.date === todayStr && hhmmToMin(b.startTime) >= nowMin)
    .sort((a, b) => hhmmToMin(a.startTime) - hhmmToMin(b.startTime));
  return rows[0] || null;
}
// Icon-tile SVGs for the Today card's row types — 24x24 viewBox, stroke-width
// 1.8, stroke=currentColor, matching the design handoff's icon convention
// (loop/design-handoff/README.md §1) and STAGE_META's existing icon style.
const TODAY_ICON_INVOICE = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>';
const TODAY_ICON_SLIP = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/>';
const TODAY_ICON_RENEW = '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>';
const TODAY_ICON_ORDERS = '<path d="M20.5 7.3 12 12l-8.5-4.7M12 12v9M3.5 7.3v9.4a1 1 0 0 0 .5.87l7.5 4.15a1 1 0 0 0 1 0l7.5-4.15a1 1 0 0 0 .5-.87V7.3a1 1 0 0 0-.5-.87l-7.5-4.15a1 1 0 0 0-1 0l-7.5 4.15a1 1 0 0 0-.5.87Z"/>';
const TODAY_ICON_CLOCK = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
function todayIconHtml(bg, stroke, inner) {
  return `<div class="list-icon" style="background:${bg};color:${stroke}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg></div>`;
}
function todayRowHtml(iconHtml, onclick, title, sub, rightHtml) {
  return `<div class="list-row" onclick="${onclick}">
      ${iconHtml}
      <div class="list-main">
        <div class="list-title">${title}</div>
        <div class="list-sub">${sub}</div>
      </div>
      <div class="list-right">${rightHtml}</div>
    </div>`;
}
// Attention rows (overdue invoice / package expiring / package almost done) —
// tapping the row runs the item's own action directly (remind / offer
// renewal), matching the single-tap-per-row pattern every other Today row
// (and the design mockup) uses, rather than the old home-alert-card's split
// of "tap card body to jump to Clients, tap the button to act".
function attentionRowHtml(item, idx) {
  const title = htmlEsc(item.client.name);
  const sub = htmlEsc(item.todaySub || item.reason);
  if (item.kind === 'overdue') {
    return todayRowHtml(
      todayIconHtml('var(--brand-tint)', 'var(--brand)', TODAY_ICON_INVOICE),
      `window.__todayAttentionActions[${idx}]()`, title, sub,
      `<span class="list-amt tnum" style="color:var(--overdue)">${htmlEsc(money(item.amount))}</span>`);
  }
  return todayRowHtml(
    todayIconHtml('var(--marigold-tint)', 'var(--marigold-ink)', TODAY_ICON_RENEW),
    `window.__todayAttentionActions[${idx}]()`, title, sub,
    `<span class="list-pill list-pill-marigold">${htmlEsc(t('today_pill_renew'))}</span>`);
}
function incomingPipelineRowHtml(j) {
  const stage = jobStage(j);
  const meta = STAGE_META[stage] || {};
  const pkg = j.packageId != null ? packages.find(p => p.id === j.packageId) : null;
  const subParts = [htmlEsc((meta.label && t(meta.label)) || stage || '')];
  if (pkg) subParts.push(`${packageUsed(pkg)} ${t('goal_of')} ${htmlEsc(pkg.totalSessions)}`);
  else if (j.serviceName) subParts.push(htmlEsc(j.serviceName));
  return todayRowHtml(
    `<div class="list-icon" style="background:${meta.dot}22;color:${meta.dot}">${meta.icon || ''}</div>`,
    `openPipelineAt('${stage}')`, htmlEsc(j.client || 'Client'), subParts.join(' · '),
    `<div class="list-amt tnum">${htmlEsc(money(j.amount))}</div>`);
}
// Row-type inventory (TSK-009 merge — every row type the pre-merge surfaces
// could produce is still representable here; see loop/backlog-inbox.md
// TSK-009 and the merge research map for the full audit):
//   1. Overdue invoice reminder       — was home-alert-card
//   2. Package expiring soon          — was home-alert-card
//   3. Package almost done            — was home-alert-card
//   4. Shop order requests waiting    — was attn-card (backend-only)
//   5. Invoices with new client slips — was attn-card (backend-only)
//   6. Next booking today             — NEW capability (see nextBookingToday())
//   7. Active pipeline job preview    — was incoming-pipeline "Up next"
//
// Priority order (most urgent/actionable first): overdue invoices ->
// package-expiring -> package-almost-done -> backend order requests ->
// backend new-slip invoices -> today's next booking -> general pipeline
// preview. The pipeline preview goes LAST because — per the merge research —
// it's the one row type that ISN'T itself an urgency signal (every active
// job shows up there, urgent or not); everything above it is a real
// "needs your attention" or "happening soon" item.
//
// Row-count caps: attention rows (overdue/expiring/almost combined) are
// capped at TODAY_ATTENTION_LIMIT with a "+N more" jump to Clients — the old
// home-alert-card only ever showed its single highest-priority item (+"(+N
// more)" text); the merged card has room for a few more before folding, so
// the cap is raised from 1 to 4. attn-card's two backend rows are unchanged
// (0-2, gated on backend+guest state). The next-booking row is naturally
// 0-1. The pipeline preview keeps its pre-existing INCOMING_PIPELINE_LIMIT
// (6) + "+N more in Pipeline" link, unchanged from before the merge.
const TODAY_ATTENTION_LIMIT = 4;
const INCOMING_PIPELINE_LIMIT = 6;
async function renderHomeToday() {
  const el = document.getElementById('today-body');
  if (!el) return;
  const uid = isGuest ? 'guest' : currentUser.id;
  const backendReady = !isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled();

  const [attentionAll, ordersN, slipsN, booking] = await Promise.all([
    computeClientsNeedingAttention(),
    backendReady ? attnOrdersCount() : Promise.resolve(0),
    backendReady ? attnNewSlipInvoiceCount() : Promise.resolve(0),
    nextBookingToday(),
  ]);

  // TSK-019: 'depleted' (a package already at zero) ranks ahead of 'almost'
  // (still has a little runway left) — the client with nothing left needs
  // the renewal conversation more urgently than one who's merely running low.
  const kindRank = { overdue: 0, expiring: 1, depleted: 2, almost: 3 };
  const attention = attentionAll.slice().sort((a, b) => {
    const kr = kindRank[a.kind] - kindRank[b.kind];
    return kr !== 0 ? kr : (a.sortKey - b.sortKey);
  });
  const attentionShown = attention.slice(0, TODAY_ATTENTION_LIMIT);
  window.__todayAttentionActions = attentionShown.map(item => item.action);

  const order = getStageOrder();
  // Earliest stage first (newest leads read as most "incoming"), then oldest
  // updatedAt within the same stage (surfaces stalled engagements first —
  // keeps the one thing the old stale-engagement nudge was good for).
  const activePipeline = jobs.filter(j => j.uid === uid && !jobComplete(j)).sort((a, b) => {
    const ai = order.indexOf(jobStage(a)), bi = order.indexOf(jobStage(b));
    if (ai !== bi) return ai - bi;
    return (a.updatedAt || '').localeCompare(b.updatedAt || '');
  });
  const pipelineShown = activePipeline.slice(0, INCOMING_PIPELINE_LIMIT);

  const rows = [];
  attentionShown.forEach((item, idx) => rows.push(attentionRowHtml(item, idx)));
  if (ordersN) rows.push(todayRowHtml(
    todayIconHtml('var(--brand-tint)', 'var(--brand)', TODAY_ICON_ORDERS),
    "switchScreen('more')", htmlEsc(t('attn_orders').replace('{n}', ordersN)), '', ''));
  if (slipsN) rows.push(todayRowHtml(
    todayIconHtml('var(--brand-tint)', 'var(--brand)', TODAY_ICON_SLIP),
    "switchScreen('invoices')", htmlEsc(t('attn_slips').replace('{n}', slipsN)), '', ''));
  if (booking) {
    const cust = customers.find(c => c.id === booking.customerId);
    const title = `${htmlEsc(booking.startTime || '')} — ${htmlEsc(booking.title || (cust && cust.name) || t('field_client'))}`;
    const sub = [t('today_next_up'), booking.location].filter(Boolean).map(htmlEsc).join(' · ');
    rows.push(todayRowHtml(
      todayIconHtml('var(--brand-tint)', 'var(--brand)', TODAY_ICON_CLOCK),
      "switchScreen('book')", title, sub,
      `<span class="list-pill list-pill-paid">${htmlEsc(t('today_pill_booked'))}</span>`));
  }
  pipelineShown.forEach(j => rows.push(incomingPipelineRowHtml(j)));

  if (!rows.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">✅</div>
        <p data-i18n="today_empty">${t('today_empty')}</p>
        <span data-i18n="today_empty_sub">${t('today_empty_sub')}</span></div>`;
    return;
  }

  let html = '<div class="list-card">' + rows.join('') + '</div>';
  const extraAttention = attention.length - attentionShown.length;
  if (extraAttention > 0) {
    html += `<div style="text-align:center;padding:12px;color:var(--marigold-ink);font-weight:700;font-size:13px;cursor:pointer" onclick="switchScreen('customers')">+${extraAttention} more need attention →</div>`;
  }
  const extraPipeline = activePipeline.length - pipelineShown.length;
  if (extraPipeline > 0) {
    html += `<div style="text-align:center;padding:12px;color:var(--brand);font-weight:700;font-size:13px;cursor:pointer" onclick="switchScreen('pipeline')">+${extraPipeline} more in Pipeline →</div>`;
  }
  el.innerHTML = html;
}
window.renderHomeToday = renderHomeToday;
// My Task Goal — replaces the old single daily-goal card with a Month /
// Quarter / Year switch, each period tracking its own target and net-income
// progress. settings.goalTargets = {month, quarter, year} (migrated once
// from the old single dailyGoal in enterApp()); settings.goalPeriod is the
// persisted switch selection.
const GOAL_PERIODS = ['month', 'quarter', 'year'];
function goalPeriodJobs(period) {
  // Same earned-only filter as Home's hero number (jobEarned) — the goal
  // card and "Earned this month" must never disagree about the same month.
  const inPeriod = period === 'quarter' ? jobsThisQuarter() : period === 'year' ? jobsThisYear() : jobsThisMonth();
  return inPeriod.filter(jobEarned);
}
function renderGoal() {
  const card = document.getElementById('goal-card');
  if (!card) return;
  const period = GOAL_PERIODS.includes(settings.goalPeriod) ? settings.goalPeriod : 'month';
  const targets = settings.goalTargets || {};
  const goal = Number(targets[period]) || 0;

  const switchEl = document.getElementById('goal-period-switch');
  if (switchEl) {
    switchEl.querySelectorAll('.goal-period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === period));
  }
  if (!goal) { card.style.display = 'none'; return; }
  card.style.display = 'block';

  const net = goalPeriodJobs(period).reduce((s, j) => s + netOf(j), 0);
  const pct = Math.max(0, Math.min(100, Math.round((net / goal) * 100)));
  const reached = net >= goal;
  const fill = document.getElementById('goal-fill');
  fill.style.width = pct + '%';
  fill.classList.toggle('reached', reached);
  document.getElementById('goal-pct').textContent = pct + '%';
  document.getElementById('goal-amt-of').textContent = `${money(net)} ${t('goal_of')} ${money(goal)}`;
  document.getElementById('goal-sub').textContent = reached ? t('goal_reached')
    : `${t('goal_pace_on')}${money(goal - net)}${t('goal_to_go_' + period)}`;
}
async function onGoalPeriodChange(period) {
  if (!GOAL_PERIODS.includes(period)) return;
  await saveSetting('goalPeriod', period);
  renderGoal();
}
async function onGoalTargetChange(period, v) {
  if (!GOAL_PERIODS.includes(period)) return;
  const n = parseFloat(v);
  const targets = { ...(settings.goalTargets || {}) };
  targets[period] = isNaN(n) ? 0 : n;
  await saveSetting('goalTargets', targets);
  renderGoal();
}

// ─── JOBS LIST ────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
}
// ─── JOB FORM (modal) ─────────────────────────────────────────────────
// Populate the job form's customer + service dropdowns (per-uid lists) and set
// the current selection.
function populateJobSelects(selCustomerId, selServiceId) {
  const cs = document.getElementById('j-customer');
  if (cs) {
    cs.innerHTML = `<option value="">${htmlEsc(t('none_option'))}</option>` +
      customers.map(c => `<option value="${c.id}">${htmlEsc(c.name)}</option>`).join('') +
      `<option value="__new__">${htmlEsc(t('add_new_client_option'))}</option>`;
    cs.value = selCustomerId != null ? String(selCustomerId) : '';
  }
  const ss = document.getElementById('j-service');
  if (ss) {
    ss.innerHTML = `<option value="">${htmlEsc(t('none_option'))}</option>` +
      services.map(s => `<option value="${s.id}">${htmlEsc(s.name)} · ${htmlEsc(money(s.rate))}</option>`).join('') +
      `<option value="__new__">${htmlEsc(t('add_new_service_option'))}</option>`;
    ss.value = selServiceId != null ? String(selServiceId) : '';
  }
}
// Picking "+ Add a new client" opens the Customer modal stacked on top of the
// job form (never closed underneath); saveCustomer() links the new record back
// into this form once it's created — see __pendingJobCustomerLink below.
function onJobCustomerChange(v) {
  const cs = document.getElementById('j-customer');
  if (v === '__new__') {
    if (cs) cs.value = '';
    window.__pendingJobCustomerLink = true;
    openAddCustomer();
    return;
  }
  refreshJobPackageRow(null);
}
// Shows/hides the job form's "Apply to package" row, scoped to the
// currently-selected client AND service — a client can hold separate
// packages for different services (see activePackageFor()'s own doc
// comment), so this must never offer/apply a package bought for a
// different service than the one actually being booked. `existingPackageId`
// (a job's own stored packageId, on edit) takes precedence over whatever's
// currently active for that pair, so editing a session already linked to a
// now-exhausted package still shows that same package rather than silently
// switching it. If the selected service is itself a package-type catalog
// item (usageQty > 1, TSK-024) but this client has no active package for it
// yet, the row still shows — checked by default — offering to start one:
// saveJob() creates it from the service's own usageQty/rate at save time,
// so selling a package is just "create the service once, then book it."
function refreshJobPackageRow(existingPackageId) {
  const row = document.getElementById('j-package-row');
  const checkbox = document.getElementById('j-apply-package');
  const label = document.getElementById('j-package-label');
  const hidden = document.getElementById('j-package-id');
  if (!row || !checkbox || !label || !hidden) return;
  const cidVal = document.getElementById('j-customer').value;
  const svcVal = document.getElementById('j-service').value;
  const cid = (cidVal && cidVal !== '__new__') ? parseInt(cidVal) : null;
  const serviceId = (svcVal && svcVal !== '__new__') ? parseInt(svcVal) : null;
  const svc = serviceId != null ? services.find(s => s.id === serviceId) : null;
  let pkg = null;
  if (cid != null && serviceId != null) {
    if (existingPackageId != null) {
      const existing = packages.find(p => p.id === existingPackageId);
      if (existing && existing.clientId === cid && existing.serviceId === serviceId) pkg = existing;
    }
    if (!pkg) pkg = activePackageFor(cid, serviceId);
  }
  const isPackageService = !!(svc && !svcIsProduct(svc) && Number(svc.usageQty) > 1);
  if (!pkg && !isPackageService) {
    row.style.display = 'none';
    hidden.value = '';
    checkbox.checked = false;
    return;
  }
  row.style.display = 'flex';
  if (pkg) {
    hidden.value = pkg.id;
    label.textContent = `${t('apply_to_package')} (${packageRemaining(pkg)} ${t('of_label')} ${pkg.totalSessions} ${t('left_label')})`;
    checkbox.checked = existingPackageId != null ? existingPackageId === pkg.id : true;
  } else {
    // No package exists yet for this exact (client, service) pair — offer to
    // start one; saveJob() does the actual creation once this is confirmed.
    hidden.value = '';
    label.textContent = t('apply_to_package_new').replace('{n}', svc.usageQty).replace('{unit}', packageUnitLabel());
    checkbox.checked = true;
  }
  refreshPackageFastPathButton(cid);
}
// "Ship remaining service" fast path — for a client who already has an
// active package, redeeming today's visit shouldn't require re-entering a
// service/fee that isn't relevant (it was paid for up front). Add-mode
// only: editing an existing job already has its own path into Delivery via
// Task flow's confirm card, and jumping an in-flight job's stage here too
// would let two different mechanisms disagree about where it is. Kept
// deliberately unscoped by service (activePackageFor(cid), no serviceId) —
// it fires the moment a client is picked, before any service is chosen, and
// exists for the common single-active-package case; a client juggling
// multiple concurrent service packages should use the full form instead so
// the right one gets picked explicitly via j-service.
function refreshPackageFastPathButton(cid) {
  const wrap = document.getElementById('j-package-fastpath');
  if (!wrap) return;
  const isAddMode = !document.getElementById('j-edit-id').value;
  const pkg = isAddMode && cid != null ? activePackageFor(cid) : null;
  if (!pkg) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  const remaining = packageRemaining(pkg);
  const btn = document.getElementById('j-fastpath-btn');
  if (btn) btn.textContent = t('log_delivery_btn').replace('{n}', remaining).replace('{total}', pkg.totalSessions).replace('{unit}', packageUnitLabel());
}
function resetPackageFastPath() {
  const standard = document.getElementById('j-standard-fields');
  const btnWrap = document.getElementById('j-package-fastpath');
  const confirmWrap = document.getElementById('j-fastpath-confirm');
  if (standard) standard.style.display = '';
  if (btnWrap) btnWrap.style.display = 'none';
  if (confirmWrap) { confirmWrap.style.display = 'none'; confirmWrap.innerHTML = ''; }
}
function startPackageFastPath() {
  const cid = parseInt(document.getElementById('j-customer').value);
  const pkg = activePackageFor(cid);
  if (!pkg) return;
  const remaining = packageRemaining(pkg);
  const unit = packageUnitLabel();
  document.getElementById('j-standard-fields').style.display = 'none';
  document.getElementById('j-package-fastpath').style.display = 'none';
  const confirmWrap = document.getElementById('j-fastpath-confirm');
  confirmWrap.style.display = 'block';
  confirmWrap.innerHTML = `
    <div class="confirm-card">
      <div class="confirm-title">${htmlEsc(t('confirm_delivered_title').replace('{unit}', unit))}</div>
      <div class="confirm-context tnum">${htmlEsc(t('confirm_delivered_context').replace('{n}', remaining).replace('{total}', pkg.totalSessions).replace('{unit}', unit))}</div>
      <div class="confirm-input-row">
        <input type="number" class="confirm-input tnum" id="jfp-qty" min="1" oninput="validateFastPathQty(${remaining})">
        <span class="confirm-unit">${htmlEsc(unit)}</span>
      </div>
      <div class="confirm-error" id="jfp-error" style="display:none"></div>
      <div class="confirm-btns">
        <button type="button" class="confirm-btn-cancel" onclick="cancelPackageFastPath()">${htmlEsc(t('confirm_cancel'))}</button>
        <button type="button" class="confirm-btn-save disabled" id="jfp-save" onclick="saveFastPathDelivery()">${htmlEsc(t('confirm_and_advance'))}</button>
      </div>
    </div>
  `;
}
window.startPackageFastPath = startPackageFastPath;
function cancelPackageFastPath() {
  resetPackageFastPath();
  refreshPackageFastPathButton(parseInt(document.getElementById('j-customer').value) || null);
}
window.cancelPackageFastPath = cancelPackageFastPath;
function validateFastPathQty(remaining) {
  const input = document.getElementById('jfp-qty');
  const errEl = document.getElementById('jfp-error');
  const saveBtn = document.getElementById('jfp-save');
  if (!input) return;
  const val = parseInt(input.value, 10);
  const over = isFinite(val) && val > remaining;
  const invalid = !(val > 0) || over;
  input.classList.toggle('blocked', over);
  if (errEl) {
    errEl.style.display = over ? 'flex' : 'none';
    if (over) errEl.textContent = t('confirm_overdraft_error').replace(/\{n\}/g, remaining);
  }
  if (saveBtn) saveBtn.classList.toggle('disabled', invalid);
}
window.validateFastPathQty = validateFastPathQty;
async function saveFastPathDelivery() {
  const cid = parseInt(document.getElementById('j-customer').value);
  const pkg = activePackageFor(cid);
  if (!pkg) return;
  const remaining = packageRemaining(pkg);
  const input = document.getElementById('jfp-qty');
  const val = input ? parseInt(input.value, 10) : NaN;
  if (!(val > 0) || val > remaining) { validateFastPathQty(remaining); return; }
  const uid = isGuest ? 'guest' : currentUser.id;
  const custRec = customers.find(c => c.id === cid);
  const client = (custRec && custRec.name) || '';
  const date = document.getElementById('j-date').value || todayISO();
  const unit = packageUnitLabel();
  const obj = {
    uid, date, client, clientId: cid, serviceId: null, serviceName: '',
    jobType: settings.workType || '',
    amount: 0, tip: 0, expense: 0, count: val, notes: '', netAmount: 0,
    cuid: cuid(), stageOrder: getStageOrder().slice(), stage: 'deliver', complete: false,
    // Package sessions are pre-paid via the package purchase itself — this
    // job earns its share the moment it's logged delivered, same as the old
    // 6-stage model (a job landing directly on Delivery/Extend was already
    // >= the old paidIdx, so jobEarned() counted it automatically).
    // applyPackageRevenue() below attributes that share onto amount/netAmount.
    paid: true,
    invoiceId: null, quoteDocId: null, packageId: pkg.id, updatedAt: nowISO(),
  };
  applyPackageRevenue(obj, pkg);
  await dbPut('jobs', obj);
  mirrorJob(obj);
  logEvent('session_logged');
  closeJobModal();
  await reload();
  toast(t('delivery_logged').replace('{n}', val).replace('{unit}', unit));
}
window.saveFastPathDelivery = saveFastPathDelivery;
// Picking "+ Add a new service" opens the Service modal stacked on top of
// the job form (never closed underneath); saveService() links the new
// record back into this form once it's created — see
// __pendingJobServiceLink below, mirroring onJobCustomerChange() above.
function onJobServiceChange(v) {
  const ss = document.getElementById('j-service');
  if (v === '__new__') {
    if (ss) ss.value = '';
    window.__pendingJobServiceLink = true;
    openAddService();
    return;
  }
  if (!v) return;
  refreshJobPackageRow(null);
}
// TSK-023: the Quick log/Full details toggle (TSK-008) is removed per the
// owner — every field/section is always shown now. j-package-row keeps its
// own show/hide business logic (refreshJobPackageRow(), gated on whether
// the selected client has a linked/active package). job-tracking-section
// keeps its own edit-mode gate below (add-mode has nothing to show yet —
// options/milestones both need a saved job id).
function openAddJob(dateISO) {
  document.getElementById('modal-title').textContent = t('add_job');
  document.getElementById('j-edit-id').value = '';
  document.getElementById('j-date').value = dateISO || todayISO();
  const notesEl = document.getElementById('j-notes');
  if (notesEl) notesEl.value = '';
  populateJobSelects('', '');
  resetPackageFastPath();
  // Options/milestones both need a saved job id to attach to — add-mode
  // has nothing to show yet.
  const tracking = document.getElementById('job-tracking-section');
  if (tracking) tracking.style.display = 'none';
  refreshJobPackageRow(null);
  document.getElementById('j-delete').style.display = 'none';
  clearFieldErrors();
  openJobModal();
}
function openEditJob(id) {
  const j = jobs.find(x => x.id === id);
  if (!j) return;
  document.getElementById('modal-title').textContent = t('edit_job');
  document.getElementById('j-edit-id').value = String(id);
  resetPackageFastPath();
  const set = (i,v)=>{ const el=document.getElementById(i); if(el) el.value = (v==null?'':v); };
  set('j-date', j.date);
  set('j-notes', j.notes);
  populateJobSelects(j.clientId != null ? j.clientId : '', j.serviceId != null ? j.serviceId : '');
  const tracking = document.getElementById('job-tracking-section');
  if (tracking) tracking.style.display = 'block';
  refreshJobPackageRow(j.packageId != null ? j.packageId : null);
  document.getElementById('j-delete').style.display = 'block';
  window.__milestoneFormOpen = false;
  renderJobTracking(id);
  clearFieldErrors();
  openJobModal();
}
function openJobModal() { document.getElementById('modal-job').classList.add('open'); }
function closeJobModal() {
  document.getElementById('modal-job').classList.remove('open');
}

function clearFieldErrors() {
  document.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
  document.querySelectorAll('.field-err').forEach(el => el.remove());
}
function markFieldError(inputId, msgKey) {
  const input = document.getElementById(inputId);
  if (!input) { toast(t(msgKey)); return; }
  const wrap = input.closest('.field, .field-half') || input.parentElement;
  wrap.classList.add('field-invalid');
  if (!wrap.querySelector('.field-err')) {
    const m = document.createElement('div');
    m.className = 'field-err'; m.textContent = t(msgKey);
    wrap.appendChild(m);
  }
  input.addEventListener('input', function clr() {
    wrap.classList.remove('field-invalid');
    const e = wrap.querySelector('.field-err'); if (e) e.remove();
    input.removeEventListener('input', clr);
  });
  try { input.focus({preventScroll:false}); } catch(e) { input.focus(); }
}
async function saveJob() {
  const date = document.getElementById('j-date').value;
  const notes = (document.getElementById('j-notes').value || '').trim();
  clearFieldErrors();
  if (!date) { markFieldError('j-date', 'err_enter_date'); return; }
  const custVal = document.getElementById('j-customer').value;
  if (!custVal || custVal === '__new__') { markFieldError('j-customer', 'err_select_client'); return; }
  const uid = isGuest ? 'guest' : currentUser.id;
  // The Client dropdown is the only "who" input now (Member Tags merged into
  // Client) — client is always derived from the selected Customer record.
  const clientId = parseInt(custVal);
  const custRec = customers.find(c => c.id === clientId);
  const client = (custRec && custRec.name) || '';
  const svcVal = document.getElementById('j-service').value;
  const serviceId = svcVal ? parseInt(svcVal) : null;
  const svc = serviceId != null ? services.find(s => s.id === serviceId) : null;
  const serviceName = svc ? svc.name : '';
  const obj = {uid, date, client, clientId, serviceId, serviceName,
    jobType: settings.workType || '', notes};
  const editId = document.getElementById('j-edit-id').value;
  if (editId) {
    const id = parseInt(editId);
    const prev = jobs.find(j => j.id === id);
    if (!prev) return;
    obj.id = id; obj.cuid = prev.cuid || cuid();
    obj.jobType = prev.jobType || settings.workType || '';   // preserve the job's original work type on edit
    // Preserve the engagement's own stage progress on edit — editing details
    // (fee, notes, date) shouldn't reset or advance where it is in the pipeline.
    obj.stageOrder = prev.stageOrder != null ? prev.stageOrder : getStageOrder().slice();
    obj.stage = prev.stage != null ? prev.stage : obj.stageOrder[0];
    obj.complete = prev.complete || false;
    obj.invoiceId = prev.invoiceId != null ? prev.invoiceId : null;
    obj.quoteDocId = prev.quoteDocId != null ? prev.quoteDocId : null;
    obj.pendingGateStage = prev.pendingGateStage ?? null;   // a detail re-save must never silently drop an unresolved stage gate
    // TSK-011/012/013: same "must be explicitly preserved or dbPut silently
    // wipes it" bug class the comment below already flags — due/note/attempt
    // are new job fields (task-flow deadline chip, incident note, redo
    // counter) that live entirely outside this form and must survive an
    // ordinary detail edit exactly like subTasks/milestones/outcome do.
    obj.due = prev.due ?? null;
    obj.note = prev.note ?? null;
    obj.attempt = Number(prev.attempt) > 0 ? Number(prev.attempt) : 1;
    obj.paid = prev.paid || false;
    // TSK-016: the inline gate's linked Calendar booking cuid, same
    // preserve-on-edit requirement as due/note/attempt above.
    obj.dueBookingCuid = prev.dueBookingCuid ?? null;
    // Tracking state lives on the record, never on this form — and dbPut()
    // REPLACES the stored object, so anything not carried forward here is
    // silently destroyed by an ordinary detail edit (including the pipeline
    // card's own "Reschedule" button). This block was missing for years:
    // editing a job's fee wiped its sub-tasks, milestones, logged time, a
    // running timer, and a completed engagement's extended/finished outcome.
    obj.subTasks = prev.subTasks || [];
    obj.milestones = prev.milestones || [];
    obj.timeEntries = prev.timeEntries || [];
    obj.timerStartedAt = prev.timerStartedAt ?? null;
    obj.outcome = prev.outcome ?? null;
    obj.lostReason = prev.lostReason ?? null;
    obj.options = prev.options || [];
    // TSK-023 removed the UI that could ever add to this (Items on this
    // engagement) — preserved here purely so an existing job's historical
    // items survive an unrelated edit instead of being wiped.
    obj.items = prev.items || [];
    // TSK-023 (money-field removal, the previously-held half): Fee/Tip/
    // Expense/Sessions no longer have inputs on this form at all — an
    // ordinary detail edit (date, service, notes) must preserve whatever
    // revenue is already attributed to this job (via markJobPaid(),
    // applyPackageRevenue(), or the Cash job gate's resolveGateCash()),
    // exactly like subTasks/milestones above, not silently zero it out.
    obj.amount = prev.amount || 0;
    obj.tip = prev.tip || 0;
    obj.expense = prev.expense || 0;
    obj.count = prev.count || 0;
    obj.netAmount = prev.netAmount || 0;
  } else {
    obj.cuid = cuid();
    // New engagements snapshot the active stage order and start at its first stage.
    obj.stageOrder = getStageOrder().slice();
    obj.stage = obj.stageOrder[0];
    obj.complete = false;
    obj.invoiceId = null;
    obj.quoteDocId = null;
    obj.due = null; obj.note = null; obj.attempt = 1; obj.dueBookingCuid = null;
    // A brand-new job hasn't earned anything yet — revenue gets attributed
    // later, at whichever moment actually applies (invoice marked paid,
    // package session delivered, or the Cash job gate's amount prompt).
    obj.amount = 0; obj.tip = 0; obj.expense = 0; obj.count = 0; obj.netAmount = 0;
  }
  const applyPkgEl = document.getElementById('j-apply-package');
  const pkgIdEl = document.getElementById('j-package-id');
  obj.packageId = null;
  if (applyPkgEl && applyPkgEl.checked) {
    if (pkgIdEl && pkgIdEl.value) {
      obj.packageId = parseInt(pkgIdEl.value);
    } else if (svc && !svcIsProduct(svc) && Number(svc.usageQty) > 1) {
      // TSK-024: refreshJobPackageRow() found no active package yet for this
      // (client, service) pair and offered to start one instead — create it
      // now from the service's own usageQty/rate. Selling a package this way
      // needs zero manual "+Add package" step beyond creating the Service
      // once; the client's detail page still shows the resulting package
      // (tagged with this service's name) for renewals/expiry edits later.
      const newPkg = { uid, clientId, serviceId, totalSessions: svc.usageQty, price: svc.rate,
        purchasedDate: date, expiresAt: null, notes: '', cuid: cuid(), updatedAt: nowISO() };
      const pkgKey = await dbAdd('packages', newPkg);
      newPkg.id = pkgKey;
      if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
        SidekickBackend.mirrorPackageSave(newPkg).catch(() => {});
      }
      obj.packageId = newPkg.id;
    }
  }
  obj.updatedAt = nowISO();
  const isNew = !editId;
  const key = await dbPut('jobs', obj);
  if (obj.id == null) obj.id = key;
  if (isNew) logEvent('session_logged');
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorJobSave(obj).catch(() => {});
  }
  closeJobModal();
  await reload();
  toast(t('job_saved'));
}
async function deleteJob() {
  const editId = document.getElementById('j-edit-id').value;
  if (!editId) return;
  if (!confirm(t('delete_job_confirm'))) return;
  const id = parseInt(editId);
  const prev = jobs.find(j => j.id === id);
  await dbDel('jobs', id);
  if (!isGuest && prev && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorJobDelete(prev.cuid).catch(() => {});
  }
  closeJobModal();
  await reload();
  toast(t('job_deleted'));
}

// ─── PIPELINE BOARD (primary engagement view) ──────────────────────────
// A left-hand rail lists all 6 stages (icon + label + count); the main area
// renders only the currently-selected ("active") stage's cards — never all
// six at once — so there's no horizontal board to scroll through.

// Fire-and-forget best-effort mirror of job writes that don't go through
// saveJob(). Ensures cloud-backed accounts' server copy stays in sync even
// for stage moves, gate resolution, and sub-task/milestone/timer/option edits.
function mirrorJob(j) {
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled())
    SidekickBackend.mirrorJobSave(j).catch(() => {});
}

let _pipelineActiveStage = null;
function selectPipelineStage(stage) {
  _pipelineActiveStage = stage;
  renderPipeline();
}
window.selectPipelineStage = selectPipelineStage;
// Jump straight into Pipeline pre-focused on a given stage (used by Home's
// Pipeline-at-a-glance pills).
function openPipelineAt(stage) {
  _pipelineActiveStage = stage;
  switchScreen('pipeline');
}
window.openPipelineAt = openPipelineAt;
function renderPipeline() {
  const el = document.getElementById('pipeline-body');
  if (!el) return;
  // Two persisted views share this entry point: the stage board (below) and
  // the read-only timeline. Branching here (rather than in switchScreen) means
  // every existing renderPipeline() call site refreshes whichever view is on.
  if (window.__plView === 'timeline') return renderPipelineTimeline();
  if (window.__plView === 'calendar') return renderPipelineCalendarView();
  const order = getStageOrder();
  const groups = {}; order.forEach(s => groups[s] = []);
  // Group each session under its own stage NAME. A session whose stage isn't
  // a current stage (e.g. after a Settings reorder) lands under the first.
  jobs.forEach(j => { let s = jobStage(j); if (!groups[s]) s = order[0]; groups[s].push(j); });

  if (!_pipelineActiveStage || !order.includes(_pipelineActiveStage)) _pipelineActiveStage = order[0];
  const activeStage = _pipelineActiveStage;
  const activeMeta = STAGE_META[activeStage] || {};
  const activeItems = groups[activeStage] || [];
  const activeIdx = order.indexOf(activeStage);
  const totalActive = order.reduce((s, stg) => s + (groups[stg] || []).length, 0);
  const countEl = document.getElementById('pl-active-count');
  if (countEl) countEl.textContent = `${totalActive} ${t('active_count')}`;

  // Horizontal chip rail (was a left-hand vertical rail — see the redesign
  // handoff's "replaces vertical pipeline") — one stage's cards render at a
  // time, same as before, just picked from a scrollable row of pill chips.
  // TSK-011: the separate .pl-minimap strip is retired — each chip now
  // carries its OWN 4px progress-underline segment (green = stages before
  // the selected one, marigold = selected, border-gray = after), folding the
  // old minimap's past/active coloring directly into the chip it belongs to.
  const chips = order.map((stage, i) => {
    const meta = STAGE_META[stage] || {};
    const isActive = stage === activeStage;
    const underlineCls = i === activeIdx ? 'active' : i < activeIdx ? 'past' : '';
    return `<button type="button" class="pl-chip${isActive ? ' active' : ''}" onclick="selectPipelineStage('${stage}')" aria-current="${isActive ? 'true' : 'false'}">
      <span class="pl-chip-row"><span>${htmlEsc((meta.label && t(meta.label)) || stage)}</span>
      <span class="pl-chip-count">${(groups[stage] || []).length}</span></span>
      <span class="pl-chip-underline ${underlineCls}"></span>
    </button>`;
  }).join('');

  const list = activeItems.length
    ? activeItems.map(j => pipelineCard(j, activeStage)).join('')
    : `<div class="kb-empty">${htmlEsc(t('pl_nothing_here'))}</div>`;

  // TSK-011: the always-on hint sentence drops to first-run only (a settings
  // flag, so it never nags again after the first dismissal/first view).
  const showHint = !settings.plHintSeen;
  const hint = showHint
    ? `<p class="pl-stage-hint">${htmlEsc((activeMeta.hint && t(activeMeta.hint)) || (activeMeta.label && t(activeMeta.label)) || activeStage)}
        <button type="button" class="pl-hint-dismiss" onclick="dismissPipelineHint()">${htmlEsc(t('pl_hint_dismiss'))}</button></p>`
    : '';

  el.innerHTML = `
    ${plViewToggleHtml()}
    <div class="pl-chip-rail" role="tablist" aria-label="Task flow stages">${chips}</div>
    ${hint}
    <div class="pl-main-body">${list}</div>
  `;
  if (window.__kbMoved != null) setTimeout(() => { window.__kbMoved = null; }, 500);
}
// First-run-only hint sentence (TSK-011): dismissing persists so it never
// shows again on this account, but re-appears fresh for a brand-new install.
function dismissPipelineHint() {
  saveSetting('plHintSeen', true).catch(() => {});
  renderPipeline();
}
window.dismissPipelineHint = dismissPipelineHint;
window.renderPipeline = renderPipeline;

// ─── PIPELINE TIMELINE (read-only Gantt view) ───────────────────────────
// The board answers "what stage is each job in"; the timeline answers "when
// is everything happening". Marks are plain absolutely-positioned divs on a
// 28px-per-day ruler — no canvas/SVG/library — because at phone width the
// whole thing is just a horizontal scroller with dots and bars.
window.__plView = 'board';   // in-memory mirror of the plViewMode setting; enterApp loads the persisted value

function setPipelineView(mode) {
  mode = (mode === 'timeline' || mode === 'calendar') ? mode : 'board';
  if (window.__plView === mode) return;
  window.__plView = mode;
  // Fire-and-forget persist (same setting store as calViewMode) — the render
  // below must not wait on IDB, and a failed write only loses the preference.
  saveSetting('plViewMode', mode).catch(() => {});
  renderPipeline();
}
window.setPipelineView = setPipelineView;

// Board/Timeline/Calendar segmented toggle shared by all three views
// (reuses the appointment modal's .ap-seg pill styling rather than
// inventing a fourth segmented-control look). Task flow + Calendar merge:
// Calendar reuses book_title's existing 'Calendar'/'ปฏิทิน' string rather
// than a new key, since it's the same screen's old <h1>.
function plViewToggleHtml() {
  const mode = window.__plView;
  const seg = (val, key) => `<button type="button" role="tab" aria-selected="${mode === val}" class="${mode === val ? 'seg-active' : ''}" onclick="setPipelineView('${val}')">${htmlEsc(t(key))}</button>`;
  return `<div class="ap-seg pl-view-seg" role="tablist" aria-label="${attrEsc([t('pl_view_board'), t('pl_view_timeline'), t('book_title')].join(' / '))}">
    ${seg('board', 'pl_view_board')}${seg('timeline', 'pl_view_timeline')}${seg('calendar', 'book_title')}
  </div>`;
}

// Noon-anchored day math (bookings.js addDays convention, private to its
// IIFE so restated here): anchoring at 12:00 means a ±1h DST shift can't
// flip the calendar day, so day arithmetic is safe in any timezone.
function tlAddDays(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function tlDaysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
}

function renderPipelineTimeline() {
  const el = document.getElementById('pipeline-body');
  if (!el) return;
  const today = todayISO();
  const DAY_W = 28;
  // Active (non-complete) jobs only, and only their dated steps — undated
  // legacy sub-tasks have no place on a calendar ruler. A job with zero
  // dated steps is omitted entirely rather than shown as an empty row.
  //
  // TSK-018 (part 1): dated steps now come from TWO independent sources,
  // not just job.subTasks. Since TSK-011/012/013 the inline stage-gate
  // writes job.due directly instead of ever touching subTasks (see the
  // STAGE-GATE INLINE CARD comment) — most jobs' "next date" lives there
  // now, so a job with only a job.due reminder used to be invisible here
  // even though it has a real upcoming date. A job.due backed by a real
  // linked booking (job.dueBookingCuid, TSK-016) renders exactly like an
  // 'exact' dated sub-task (a dot); one with no linked booking renders
  // like a 'by' deadline (the hatched runway bar) — same two visual marks
  // this ruler already had, no new mark type. A job can carry both a
  // job.due point AND real subTask points at once; both show, unmerged.
  const rows = [];
  jobs.forEach(j => {
    if (jobComplete(j)) return;
    const subPts = (j.subTasks || []).filter(st => st.dateType && st.date);
    const duePts = [];
    if (j.due) {
      const meta = STAGE_META[jobStage(j)] || {};
      duePts.push({
        dateType: j.dueBookingCuid ? 'exact' : 'by',
        date: j.due,
        startTime: null,
        done: false,
        text: (meta.label && t(meta.label)) || t('field_client'),
      });
    }
    const pts = subPts.concat(duePts);
    if (!pts.length) return;
    // Sort key: the job's most urgent open date; all-done jobs fall back to
    // their earliest date so they sink naturally relative to live work.
    const open = pts.filter(st => !st.done).map(st => st.date).sort();
    const all = pts.map(st => st.date).sort();
    rows.push({ j, pts, sortKey: open[0] || all[0] });
  });
  const countEl = document.getElementById('pl-active-count');
  if (countEl) countEl.textContent = `${jobs.length} ${t('active_count')}`;
  if (!rows.length) {
    el.innerHTML = `${plViewToggleHtml()}<div class="kb-empty">${htmlEsc(t('tl_empty'))}</div>`;
    return;
  }
  rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Ruler bounds: 3 days of breathing room on each side of the data, then
  // clamped to always include today — so the today-rule (and the initial
  // scroll anchor) can never fall off the edge of the ruler.
  const dates = [];
  rows.forEach(r => r.pts.forEach(st => dates.push(st.date)));
  dates.sort();
  let min = tlAddDays(dates[0], -3), max = tlAddDays(dates[dates.length - 1], 3);
  if (today < min) min = today;
  if (today > max) max = today;
  const nDays = tlDaysBetween(min, max) + 1;
  const x = d => tlDaysBetween(min, d) * DAY_W;

  // Day-number header row; weekends tinted so a week's rhythm is readable
  // without month labels.
  let dayCells = '';
  for (let i = 0; i < nDays; i++) {
    const iso = tlAddDays(min, i);
    const dow = new Date(iso + 'T12:00:00').getDay();
    dayCells += `<span class="tl-day${(dow === 0 || dow === 6) ? ' wk' : ''}${iso === today ? ' is-today' : ''}">${parseInt(iso.slice(8), 10)}</span>`;
  }

  const rowsHtml = rows.map(({ j, pts }) => {
    const marks = pts.map(st => {
      const overdue = !st.done && st.date < today;
      const stateCls = (st.done ? ' done' : '') + (overdue ? ' late' : '');
      const tip = attrEsc(`${st.text} · ${fmtDate(st.date)}${st.dateType === 'exact' && st.startTime ? ' ' + st.startTime : ''}`);
      if (st.dateType === 'exact') {
        // 10px dot centered in its 28px day cell → left offset +9.
        return `<div class="tl-pt${stateCls}" style="left:${x(st.date) + 9}px" title="${tip}"></div>`;
      }
      // 'by' deadline: the bar is the remaining runway (today → deadline);
      // its hard right border IS the deadline. min/max are clamped to
      // include today, so max(today, min) is always just `today`.
      const barStart = today;
      if (barStart > st.date) {
        // Deadline already behind us — no runway left to draw, so the bar
        // collapses to a single flag pinned at the missed date (danger when
        // still open, dimmed like every other done mark when done).
        return `<div class="tl-flag${stateCls}" style="left:${x(st.date) + 5}px" title="${tip}">⚑</div>`;
      }
      return `<div class="tl-bar${stateCls}" style="left:${x(barStart)}px;width:${x(st.date) - x(barStart) + DAY_W}px" title="${tip}"></div>`;
    }).join('');
    const label = `${j.client || t('field_client')} · ${j.serviceName || unitWord()}`;
    // The label is position:sticky so it stays readable while the marks
    // scroll underneath; tapping it opens the job editor (the timeline
    // itself is read-only — no drag-to-reschedule).
    return `<div class="tl-row">
      <button type="button" class="tl-label" onclick="openEditJob(${j.id})" aria-label="${attrEsc(label)}">${htmlEsc(label)}</button>
      ${marks}
    </div>`;
  }).join('');

  // Keep the user's scroll position across re-renders (e.g. after editing a
  // job from a row label); only the first paint auto-centers around today.
  // "First paint" is tracked via data-init rather than mere element existence
  // because boot renders this while the pipeline screen is still display:none,
  // where scrollLeft assignment silently no-ops — that hidden render must not
  // count as initialized or the first visible render would "preserve" 0.
  const prevScroll = el.querySelector('.tl-scroll');
  const keepX = (prevScroll && prevScroll.dataset.init === '1') ? prevScroll.scrollLeft : null;
  el.innerHTML = `
    ${plViewToggleHtml()}
    <div class="tl-scroll">
      <div class="tl-inner" style="width:${nDays * DAY_W}px">
        <div class="tl-days" style="grid-template-columns:repeat(${nDays},${DAY_W}px)">${dayCells}</div>
        <div class="tl-today" style="left:${x(today) + 14}px" aria-label="${attrEsc(t('tl_today'))}"><span class="tl-today-label">${htmlEsc(t('tl_today'))}</span></div>
        ${rowsHtml}
      </div>
    </div>`;
  const sc = el.querySelector('.tl-scroll');
  // First visible render: put today at the 1/3 point so most of the ruler
  // shows the upcoming days (the actionable part), not the past. A hidden
  // render (clientWidth 0) sets nothing and stays uninitialized.
  if (sc) {
    if (keepX != null) { sc.scrollLeft = keepX; sc.dataset.init = '1'; }
    else if (sc.clientWidth > 0) { sc.scrollLeft = Math.max(0, x(today) - sc.clientWidth / 3); sc.dataset.init = '1'; }
  }
}
window.renderPipelineTimeline = renderPipelineTimeline;

// ─── PIPELINE CALENDAR (third view mode: task-flow + calendar merge) ────
// The Calendar nav screen (#s-book) is retired — its content is now a
// third view on this same screen, alongside Board/Timeline, reachable via
// the same segmented toggle. bookings.js's renderBookings() only ever
// targets #book-body by id (see that file's header) and owns everything
// inside it, so it doesn't matter that this div is torn down and rebuilt
// fresh on every switch into this view rather than living in static
// index.html markup — same "each view owns #pipeline-body wholesale"
// pattern renderPipelineTimeline() above already uses.
function renderPipelineCalendarView() {
  const el = document.getElementById('pipeline-body');
  if (!el) return;
  el.innerHTML = `${plViewToggleHtml()}<div id="book-body"></div>`;
  if (typeof renderBookings === 'function') renderBookings();
}
window.renderPipelineCalendarView = renderPipelineCalendarView;

// TSK-011/012 card badges: an italic quoted note (Redo/Postpone/Cancel's
// free-text reason), and a small "Attempt N" pill once Redo has run at
// least once — see the STATE MANAGEMENT additions (job.note/job.attempt).
function noteLineHtml(j) {
  if (!j.note) return '';
  return `<div class="pl-note-line">${htmlEsc(t('pl_note_prefix').replace('{note}', j.note))}</div>`;
}
function attemptBadgeHtml(j) {
  const n = Number(j.attempt) || 1;
  if (n <= 1) return '';
  return `<span class="pl-attempt-badge">${htmlEsc(t('pl_attempt_badge').replace('{n}', n))}</span>`;
}
// Deadline chip: amber "Follow up by …", flips to a red-tinted "Overdue —
// …" once job.due is in the past. Tapping it opens the Postpone gate.
function deadlineChipHtml(j) {
  if (!j.due) return '';
  const overdue = j.due < todayISO();
  const label = overdue
    ? t('pl_deadline_overdue').replace('{date}', fmtDate(j.due))
    : t('pl_deadline_followup').replace('{date}', fmtDate(j.due));
  return `<button type="button" class="pl-deadline-chip${overdue ? ' overdue' : ''}" onclick="event.stopPropagation();openGateCard(${j.id},'postpone')">${htmlEsc(label)}</button>`;
}
// Package progress bar (package-linked cards only) — used = packageUsed(pkg)
// (summed job.count across every delivered job on this package, see the
// PACKAGES section), never a separately stored counter, so it can't drift.
function packageProgressHtml(j) {
  if (j.packageId == null) return '';
  const pkg = packages.find(p => p.id === j.packageId);
  if (!pkg) return '';
  const used = Math.min(packageUsed(pkg), pkg.totalSessions || 0);
  const total = Number(pkg.totalSessions) || 0;
  const pct = total > 0 ? Math.max(0, Math.min(100, (used / total) * 100)) : 0;
  return `<div class="pl-pkg-progress">
    <div class="pl-pkg-label">${htmlEsc(t('pl_package_sessions_label').replace('{used}', used).replace('{total}', total))}</div>
    <div class="pl-pkg-track"><div class="pl-pkg-fill" style="width:${pct}%"></div></div>
  </div>`;
}
// Deliver-stage package cards: "Log session N of M →" / "Log final session
// ✓" replaces the generic per-stage advance label — see logPackageSession().
function packageSessionAdvanceLabel(pkg) {
  const usedNow = packageUsed(pkg);
  const nextN = Math.min(usedNow + 1, pkg.totalSessions || 0);
  const isFinal = nextN >= (Number(pkg.totalSessions) || 0);
  return isFinal ? t('pl_log_final_session_btn')
    : t('pl_log_session_btn').replace('{n}', nextN).replace('{m}', pkg.totalSessions);
}

function pipelineCard(j, stage) {
  const meta = STAGE_META[stage] || {};
  const complete = jobComplete(j);
  const who = j.client || t('field_client');
  const svc = j.serviceName || unitWord();
  const amt = money(Number(j.amount) || 0);
  const order = jobOrder(j);
  const canBack = complete || order.indexOf(jobStage(j)) > 0;
  const enter = (window.__kbMoved === j.id) ? ' kb-enter' : '';
  const lost = j.outcome === 'lost';
  const lostReasonSuffix = (lost && LOST_REASONS.includes(j.lostReason)) ? ' · ' + t('lost_reason_' + j.lostReason) : '';
  const doneLabel = lost ? t('lost_badge') + lostReasonSuffix : j.outcome === 'finished' ? t('mark_finished') : (t(meta.done) || 'Done');
  const pkgHere = (!complete && stage === 'deliver' && j.packageId != null) ? packages.find(p => p.id === j.packageId) : null;
  const primaryLabel = pkgHere ? packageSessionAdvanceLabel(pkgHere) : ((t(meta.action) || 'Advance') + ' →');
  const foot = complete
    ? `<span class="pl-done${lost ? ' pl-lost' : ''}">${lost ? '✗' : '✓'} ${htmlEsc(doneLabel)}</span>`
    : `<button type="button" class="pl-action" onclick="event.stopPropagation();pipelineAction(${j.id})">${htmlEsc(primaryLabel)}</button>`;
  // TSK-012: the action row is now exactly 3 buttons — Cancel (solid red) ·
  // Redo (outline) · primary advance (flex:1) — replacing the old up-to-9-
  // button row. Cancel opens the free-text-note gate that supersedes the old
  // markJobLost() reason-picker modal at the card level (that function/modal
  // stays defined and still used directly by a couple of existing tests —
  // see check-options-lost.js/check-ux-flow.js — it's just no longer wired
  // to a card button). Redo opens the redo gate (increments job.attempt).
  const cancelBtn = !complete
    ? `<button type="button" class="pl-cancel-btn" onclick="event.stopPropagation();openGateCard(${j.id},'cancel')">${htmlEsc(t('pl_cancel_btn'))}</button>`
    : '';
  const redoBtn = !complete
    ? `<button type="button" class="pl-redo-btn" onclick="event.stopPropagation();openGateCard(${j.id},'redo')">${htmlEsc(t('pl_redo_btn'))}</button>`
    : '';
  const actionRow = !complete ? `<div class="kb-card-foot">${cancelBtn}${redoBtn}${foot}</div>` : `<div class="kb-card-foot">${foot}</div>`;
  // Secondary (overflow) row — every affordance the old up-to-9-button row
  // carried that isn't one of the new 3 primary buttons stays reachable here
  // (quiet outline pills) so nothing built for TSK-014 goes dead: paperwork
  // revise, Booked's invoice/paid pair, the quote-stage Skip, the cash-job
  // shortcut, and Deliver's no-renewal "Finished" alt-completion.
  const skip = (!complete && meta.skippable)
    ? `<button type="button" class="pl-skip" onclick="event.stopPropagation();skipJobStage(${j.id})">${htmlEsc(t('skip_stage'))}</button>`
    : '';
  const finish = (!complete && stage === 'deliver')
    ? `<button type="button" class="pl-skip" onclick="event.stopPropagation();finishJobStage(${j.id})">${htmlEsc(t('mark_finished'))}</button>`
    : '';
  const cashJob = (!complete && stage === 'inquiry')
    ? `<button type="button" class="pl-skip" onclick="event.stopPropagation();cashJobPath(${j.id})">${htmlEsc(t('cash_job'))}</button>`
    : '';
  const reviseQuote = (!complete && j.quoteDocId != null)
    ? `<button type="button" class="pl-skip" onclick="event.stopPropagation();reviseQuoteForJob(${j.id})">${htmlEsc(t('revise_quote_btn'))}</button>`
    : '';
  const reviseInvoice = (!complete && j.invoiceId != null)
    ? `<button type="button" class="pl-skip" onclick="event.stopPropagation();reviseInvoiceForJob(${j.id})">${htmlEsc(t('revise_invoice_btn'))}</button>`
    : '';
  const sendInvoice = (!complete && stage === 'booked' && j.invoiceId == null)
    ? `<button type="button" class="pl-skip" onclick="event.stopPropagation();typeof openInvoiceForm==='function'&&openInvoiceForm(${j.id})">${htmlEsc(t('send_invoice_btn'))}</button>`
    : '';
  // TSK-023 (money-field removal): an invoiced job's revenue comes straight
  // from the invoice (markJobPaid() reads inv.youReceive), no amount prompt
  // needed — but a job marked paid with no invoice attached has nowhere
  // else money could have come from, so that path routes through the same
  // one-field Cash gate cashJobPath() uses (markPaidNoInvoice()).
  const markPaidBtn = (!complete && stage === 'booked' && !j.paid)
    ? `<button type="button" class="pl-skip" onclick="event.stopPropagation();${j.invoiceId != null ? 'markJobPaid' : 'markPaidNoInvoice'}(${j.id})">${htmlEsc(t('mark_paid_btn'))}</button>`
    : '';
  const secondaryRow = (skip || finish || cashJob || reviseQuote || reviseInvoice || sendInvoice || markPaidBtn)
    ? `<div class="kb-card-foot pl-secondary-row">${skip}${finish}${cashJob}${reviseQuote}${reviseInvoice}${sendInvoice}${markPaidBtn}</div>`
    : '';
  const back = canBack
    ? `<button type="button" class="kb-back" aria-label="Move back a stage" title="Move back" onclick="event.stopPropagation();moveJobStageBack(${j.id})">←</button>`
    : '';
  // Mid-confirm: swap the whole foot row for the quantity-confirm card (the
  // one-time "how many units did this delivery use" ask on Booked→Deliver)
  // or, once that's resolved and a stage-gate is open, the new inline gate
  // card — Cancel/Skip/Book&move are the only ways back to normal state.
  const confirming = window.__packageConfirmJobId === j.id;
  const gating = !confirming && window.__gateOpen && window.__gateOpen.jobId === j.id;
  const footRow = confirming ? packageConfirmCardHtml(j)
    : gating ? gateCardHtml(j)
    : `${actionRow}${secondaryRow}`;
  // Pending banner: no due date booked yet for the current stage — full-
  // width amber button at the TOP of the card, tapping it opens the gate.
  // Suppressed while the gate for THIS job is already open (no point asking
  // twice at once), and suppressed entirely when the account has turned off
  // stage gating (settings.stageGateOff — a high-volume persona's opt-out,
  // see gateAfterForwardMove()) since due dates are never expected there.
  const pendingBanner = (!complete && !j.due && !gating && !settings.stageGateOff)
    ? `<button type="button" class="pl-pending" onclick="event.stopPropagation();openGateCard(${j.id})">${htmlEsc(t('pl_pending_banner'))}</button>`
    : '';
  const badgesRow = (!complete && (attemptBadgeHtml(j) || deadlineChipHtml(j)))
    ? `<div class="pl-badges-row">${attemptBadgeHtml(j)}${deadlineChipHtml(j)}</div>` : '';
  return `<div class="kb-card${enter}" onclick="openEditJob(${j.id})">
    ${pendingBanner}
    <div class="kb-card-top">
      <div class="kb-card-main">
        <div class="kb-card-title">${htmlEsc(who)}</div>
        <div class="kb-card-sub">${htmlEsc(svc)} · ${htmlEsc(amt)}${fmtDate(j.date) ? ' · ' + htmlEsc(fmtDate(j.date)) : ''}</div>
        ${(j.options || []).length ? `<div class="kb-card-sub">${htmlEsc(t(businessType() === 'realestate' ? 'options_chip_re' : 'options_chip')
          .replace('{n}', (j.options || []).length)
          .replace('{m}', (j.options || []).filter(o => o.status === 'interested' || o.status === 'chosen').length))}</div>` : ''}
        ${(j.items || []).length ? `<div class="kb-card-sub">🛒 ${htmlEsc(t('job_items_chip')
          .replace('{n}', (j.items || []).length)
          .replace('{amt}', money((j.items || []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0))))}</div>` : ''}
        ${noteLineHtml(j)}
      </div>
      ${back}
      <button type="button" class="pl-edit" aria-label="Edit engagement" onclick="event.stopPropagation();openEditJob(${j.id})">✎</button>
    </div>
    ${badgesRow}
    ${!complete ? packageProgressHtml(j) : ''}
    ${footRow}
  </div>`;
}

// ─── STAGE-GATE INLINE CARD (TSK-011/012/013) ───────────────────────────
// Replaces the old openApptModal({mode:'gate',...}) full-screen sheet for
// every CARD-LEVEL stage transition with a card embedded directly in the
// pipeline card — modeled on the existing packageConfirmCardHtml() pattern
// (brand-bordered, radius-sm, Cancel/Skip + primary), per the design
// handoff's "inline confirm card" spec. The modal itself is UNCHANGED and
// stays exactly as it was for its other three modes (add/repeat/edit —
// job-detail's own "+ Step with date" / ↻ / ✎ dated sub-tasks), which this
// task does not touch.
//
// Documented engineering decision: the OLD gate's persistence shape (a
// dated sub-task + a linked calendar booking, via createBookingForStep) is
// NOT reused for this inline gate. The design's State Management section
// asks for a single scalar `due` (ISO|null) per job, not a calendar event —
// its own gate table only ever says "pick a date", never "book an
// appointment" — so every resolver below writes job.due directly and never
// touches subTasks/bookings. job-detail's "+ Step with date" flow (the
// modal's `add` mode) remains the one real path to an actual calendar
// booking, completely unaffected by this change. j.pendingGateStage is KEPT
// as the existing bookkeeping flag (still written by the unchanged
// gateAfterForwardMove()) for "does this card still need a date" — it's
// cleared exactly when a real date gets saved, so it stays in lockstep with
// `due` being non-null, same invariant the pending banner reads off `!due`.
window.__gateOpen = null;   // { jobId, kind } while an inline gate is open
function gateCopyPrefixForStage(stage) {
  return stage === 'quote' ? 'gate_inquiry_quote' : stage === 'booked' ? 'gate_quote_booked'
    : stage === 'deliver' ? 'gate_booked_deliver' : 'gate_pending';
}
// kind is optional — omitted, it's derived from the job's own pendingGateStage
// (the "reopen from the pending banner" path), falling back to the generic
// 'pending' copy for anything that doesn't map to one of the 3 basic moves.
function openGateCard(jobId, kind) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  let k = kind;
  if (!k) k = ['quote', 'booked', 'deliver'].includes(j.pendingGateStage) ? j.pendingGateStage : 'pending';
  window.__packageConfirmJobId = null;   // the two inline cards never overlap
  window.__gateOpen = { jobId, kind: k };
  renderPipeline();
}
window.openGateCard = openGateCard;
function closeGateCard() { window.__gateOpen = null; renderPipeline(); }
window.closeGateCard = closeGateCard;

function gateCardHtml(j) {
  const g = window.__gateOpen;
  if (!g || g.jobId !== j.id) return '';
  const kind = g.kind;
  const defDate = addDaysISO(todayISO(), 7);
  const dateInput = `<input type="date" id="gate-date-${j.id}" class="gate-date tnum" value="${attrEsc(defDate)}" onclick="event.stopPropagation()">`;
  const noteInput = (ph) => `<textarea class="gate-note" id="gate-note-${j.id}" placeholder="${attrEsc(ph)}" rows="2" onclick="event.stopPropagation()"></textarea>`;
  if (kind === 'cancel') {
    // TSK-017: optional single-select reason chips, additive to the free-text
    // note below — not a replacement (see LOST_REASONS/markJobLost, whose
    // fixed-reason modal this layers onto the live Cancel gate instead of
    // reviving as a separate standalone flow).
    const reasonChips = LOST_REASONS.map(r =>
      `<button type="button" class="gate-reason-chip" data-reason="${r}" onclick="event.stopPropagation();toggleGateReason(this)">${htmlEsc(t('lost_reason_' + r))}</button>`
    ).join('');
    return `<div class="gate-card" onclick="event.stopPropagation()">
      <div class="gate-title">${htmlEsc(t('gate_cancel_title'))}</div>
      <div class="gate-context">${htmlEsc(t('gate_cancel_context'))}</div>
      <div class="gate-reason-label">${htmlEsc(t('lost_reason_label'))}</div>
      <div class="gate-reason-row" id="gate-reasons-${j.id}">${reasonChips}</div>
      ${noteInput(t('gate_note_ph'))}
      <div class="gate-btns">
        <button type="button" class="gate-btn-secondary" onclick="event.stopPropagation();closeGateCard()">${htmlEsc(t('gate_keep_it_btn'))}</button>
        <button type="button" class="gate-btn-danger" onclick="event.stopPropagation();resolveGateCancel(${j.id})">${htmlEsc(t('gate_cancel_job_btn'))}</button>
      </div>
    </div>`;
  }
  if (kind === 'pkg_final') {
    return `<div class="gate-card" onclick="event.stopPropagation()">
      <div class="gate-title">${htmlEsc(t('gate_pkg_final_title'))}</div>
      <div class="gate-context">${htmlEsc(t('gate_pkg_final_context'))}</div>
      ${dateInput}
      <div class="gate-btns">
        <button type="button" class="gate-btn-secondary" onclick="event.stopPropagation();resolveGatePkgFinal(${j.id},false)">${htmlEsc(t('gate_just_complete_btn'))}</button>
        <button type="button" class="gate-btn-primary" onclick="event.stopPropagation();resolveGatePkgFinal(${j.id},true)">${htmlEsc(t('gate_send_renewal_btn'))}</button>
      </div>
    </div>`;
  }
  if (kind === 'cash') {
    // TSK-023 (money-field removal): Fee no longer lives on the Add-session
    // form, so the Cash job shortcut needs its own one-field ask for how
    // much the client actually paid — see resolveGateCash().
    return `<div class="gate-card" onclick="event.stopPropagation()">
      <div class="gate-title">${htmlEsc(t('gate_cash_title'))}</div>
      <div class="gate-context">${htmlEsc(t('gate_cash_context'))}</div>
      <input type="number" class="gate-date tnum" id="gate-cash-amount-${j.id}" inputmode="decimal" min="0" placeholder="${attrEsc(t('gate_cash_amount_ph'))}" onclick="event.stopPropagation()">
      <div class="gate-btns">
        <button type="button" class="gate-btn-secondary" onclick="event.stopPropagation();closeGateCard()">${htmlEsc(t('confirm_cancel'))}</button>
        <button type="button" class="gate-btn-primary" onclick="event.stopPropagation();resolveGateCash(${j.id})">${htmlEsc(t('gate_confirm_cash_btn'))}</button>
      </div>
    </div>`;
  }
  if (kind === 'redo' || kind === 'postpone') {
    const titleKey = kind === 'redo' ? 'gate_redo_title' : 'gate_postpone_title';
    const contextKey = kind === 'redo' ? 'gate_redo_context' : 'gate_postpone_context';
    const primaryKey = kind === 'redo' ? 'gate_save_date_btn' : 'gate_rebook_btn';
    const fn = kind === 'redo' ? 'resolveGateRedo' : 'resolveGatePostpone';
    return `<div class="gate-card" onclick="event.stopPropagation()">
      <div class="gate-title">${htmlEsc(t(titleKey))}</div>
      <div class="gate-context">${htmlEsc(t(contextKey))}</div>
      ${dateInput}
      ${noteInput(t('gate_note_ph'))}
      <div class="gate-btns">
        <button type="button" class="gate-btn-secondary" onclick="event.stopPropagation();${fn}(${j.id},false)">${htmlEsc(t('gate_skip_btn'))}</button>
        <button type="button" class="gate-btn-primary" onclick="event.stopPropagation();${fn}(${j.id},true)">${htmlEsc(t(primaryKey))}</button>
      </div>
    </div>`;
  }
  // Basic transitions ('quote'/'booked'/'deliver'), 'pending', 'pkg_session'.
  const prefix = kind === 'pkg_session' ? 'gate_pkg_session' : gateCopyPrefixForStage(kind);
  const contextTxt = kind === 'pending' ? t('gate_pending_context').replace('{job}', j.client || t('field_client')) : t(prefix + '_context');
  const primaryKey = kind === 'pkg_session' ? 'gate_book_next_session_btn' : (kind === 'pending' ? 'gate_book_date_btn' : 'gate_book_move_btn');
  const fn = kind === 'pkg_session' ? 'resolveGatePkgSession' : 'resolveGateAdvance';
  return `<div class="gate-card" onclick="event.stopPropagation()">
    <div class="gate-title">${htmlEsc(t(prefix + '_title'))}</div>
    <div class="gate-context">${htmlEsc(contextTxt)}</div>
    ${dateInput}
    <div class="gate-btns">
      <button type="button" class="gate-btn-secondary" onclick="event.stopPropagation();${fn}(${j.id},false)">${htmlEsc(t('gate_skip_btn'))}</button>
      <button type="button" class="gate-btn-primary" onclick="event.stopPropagation();${fn}(${j.id},true)">${htmlEsc(t(primaryKey))}</button>
    </div>
  </div>`;
}

async function resolveGateAdvance(jobId, withDate) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const dateEl = document.getElementById('gate-date-' + jobId);
  const date = withDate ? ((dateEl && dateEl.value) || addDaysISO(todayISO(), 7)) : null;
  const kind = (window.__gateOpen && window.__gateOpen.jobId === jobId) ? window.__gateOpen.kind : 'pending';
  j.due = date;
  if (date) j.pendingGateStage = null;
  await syncGateBookingForDue(j, date, kind);   // TSK-016: real Calendar entry alongside the reminder
  j.updatedAt = nowISO();
  await dbPut('jobs', j);
  mirrorJob(j);
  window.__gateOpen = null;
  await reload();
  renderPipeline();
  if (date) toast(t('appt_booked_toast'));
}
window.resolveGateAdvance = resolveGateAdvance;

async function resolveGateRedo(jobId, withDate) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const dateEl = document.getElementById('gate-date-' + jobId);
  const noteEl = document.getElementById('gate-note-' + jobId);
  const note = ((noteEl && noteEl.value) || '').trim();
  j.attempt = (Number(j.attempt) > 0 ? Number(j.attempt) : 1) + 1;
  j.note = note || null;
  const date = withDate ? ((dateEl && dateEl.value) || addDaysISO(todayISO(), 7)) : null;
  j.due = date;
  if (date) j.pendingGateStage = null;
  await syncGateBookingForDue(j, date, 'redo');   // TSK-016: move the existing linked booking, or create one
  j.updatedAt = nowISO();
  logEvent('pipeline_redo:' + jobStage(j));
  await dbPut('jobs', j);
  mirrorJob(j);
  window.__gateOpen = null;
  await reload();
  renderPipeline();
}
window.resolveGateRedo = resolveGateRedo;

async function resolveGatePostpone(jobId, withDate) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const dateEl = document.getElementById('gate-date-' + jobId);
  const noteEl = document.getElementById('gate-note-' + jobId);
  const note = ((noteEl && noteEl.value) || '').trim();
  const date = withDate ? ((dateEl && dateEl.value) || addDaysISO(todayISO(), 7)) : null;
  j.note = note || j.note || null;
  j.due = date;
  if (date) j.pendingGateStage = null;
  await syncGateBookingForDue(j, date, 'postpone');   // TSK-016: move the existing linked booking, or create one
  j.updatedAt = nowISO();
  logEvent('pipeline_postpone:' + jobStage(j));
  await dbPut('jobs', j);
  mirrorJob(j);
  window.__gateOpen = null;
  await reload();
  renderPipeline();
  if (date) toast(t('pl_postponed_toast').replace('{date}', fmtDate(date)));
}
window.resolveGatePostpone = resolveGatePostpone;

// Single-select, same pattern as the old markJobLost() modal's
// toggleLostReason: tapping the already-selected chip clears it — the
// reason stays optional (TSK-017).
function toggleGateReason(btn) {
  const row = btn.closest('.gate-reason-row');
  if (!row) return;
  const wasSelected = btn.classList.contains('selected');
  row.querySelectorAll('.gate-reason-chip').forEach(b => b.classList.remove('selected'));
  if (!wasSelected) btn.classList.add('selected');
}
window.toggleGateReason = toggleGateReason;

async function resolveGateCancel(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j || jobComplete(j)) return;
  const noteEl = document.getElementById('gate-note-' + jobId);
  const note = ((noteEl && noteEl.value) || '').trim();
  const reasonRow = document.getElementById('gate-reasons-' + jobId);
  const selReason = reasonRow ? reasonRow.querySelector('.gate-reason-chip.selected') : null;
  j.complete = true;
  j.outcome = 'lost';
  j.note = note || null;
  j.lostReason = selReason ? selReason.dataset.reason : null;
  j.pendingGateStage = null;
  // TSK-016: a cancelled job doesn't need its calendar hold anymore — drop
  // the linked booking rather than leaving a phantom appointment behind.
  if (j.dueBookingCuid) { await deleteBookingByCuid(j.dueBookingCuid); j.dueBookingCuid = null; }
  j.updatedAt = nowISO();
  logEvent('pipeline_stage:lost:cancel_gate');
  _pipelineActiveStage = j.stage;
  window.__kbMoved = jobId;
  window.__gateOpen = null;
  await dbPut('jobs', j);
  mirrorJob(j);
  await reload();
  renderPipeline();
}
window.resolveGateCancel = resolveGateCancel;

async function resolveGatePkgSession(jobId, withDate) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const dateEl = document.getElementById('gate-date-' + jobId);
  j.due = withDate ? ((dateEl && dateEl.value) || addDaysISO(todayISO(), 7)) : null;
  if (j.due) j.pendingGateStage = null;
  j.updatedAt = nowISO();
  await dbPut('jobs', j);
  mirrorJob(j);
  window.__gateOpen = null;
  await reload();
  renderPipeline();
}
window.resolveGatePkgSession = resolveGatePkgSession;

// Package-final gate: "Send renewal quote" (reuses TSK-014's
// spawnRenewalQuoteJob, now taking the chosen date as the new card's due)
// vs. "Just complete" — either way THIS card completes (outcome 'extended',
// same terminal state a normal last-stage advance reaches).
async function resolveGatePkgFinal(jobId, withRenewal) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const clientId = j.clientId;
  const dateEl = document.getElementById('gate-date-' + jobId);
  const date = (dateEl && dateEl.value) || addDaysISO(todayISO(), 7);
  j.complete = true;
  j.outcome = 'extended';
  j.pendingGateStage = null;
  j.due = null;
  j.updatedAt = nowISO();
  logEvent('pipeline_stage:done:pkg_final' + (withRenewal ? ':renewal' : ''));
  window.__gateOpen = null;
  await dbPut('jobs', j);
  mirrorJob(j);
  if (withRenewal && clientId != null) {
    await spawnRenewalQuoteJob(clientId, date).catch(() => {});
  }
  await reload();
  renderPipeline();
  toast(withRenewal ? t('pl_package_complete_toast') : t('pl_package_complete_no_renewal_toast'));
}
window.resolveGatePkgFinal = resolveGatePkgFinal;

// Deliver-stage package cards: repeated "Log session" taps stay parked at
// Deliver (no stage move) and grow THIS job's own package usage by 1 each
// time — packageUsed() already sums job.count across every delivered job
// sharing a package (see the PACKAGES section), so growing this one job's
// count in place is exactly equivalent to "one more session logged" with no
// change to that derivation. Clamped so the running total across every job
// on the package can never exceed pkg.totalSessions.
async function logPackageSession(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j || j.packageId == null) return;
  const pkg = packages.find(p => p.id === j.packageId);
  if (!pkg) return;
  const ownCount = Number(j.count) > 0 ? Number(j.count) : 1;
  const otherUsed = packageUsed(pkg) - ownCount;
  const cap = Math.max(0, (Number(pkg.totalSessions) || 0) - otherUsed);
  j.count = Math.min(cap, ownCount + 1);
  applyPackageRevenue(j, pkg);
  j.updatedAt = nowISO();
  logEvent('pipeline_pkg_session_logged');
  await dbPut('jobs', j);
  mirrorJob(j);
  await reload();
  const pkg2 = packages.find(p => p.id === j.packageId) || pkg;
  const usedNow = packageUsed(pkg2);
  const isFinal = usedNow >= (Number(pkg2.totalSessions) || 0);
  window.__gateOpen = { jobId, kind: isFinal ? 'pkg_final' : 'pkg_session' };
  renderPipeline();
}
window.logPackageSession = logPackageSession;

// The single next-action per stage: complete the current stage and advance
// (following settings.stageOrder, NOT a hardcoded order).
function pipelineAction(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  // Stale-flag safety: a normal advance must never be mistaken for a
  // revise left over from a cancelled reviseQuoteForJob/reviseInvoiceForJob.
  window.__quoteReviseJobId = null;
  window.__invoiceReviseJobId = null;
  // An unresolved stage gate blocks every further forward action — reopen the
  // prompt instead of advancing (the card can never move twice past one gate).
  if (j.pendingGateStage) { openGateCard(j.id); return; }
  const stage = jobStage(j);
  // Deliver-stage package cards: the primary button logs one session in
  // place rather than advancing the stage — see logPackageSession().
  if (stage === 'deliver' && j.packageId != null) { logPackageSession(jobId); return; }
  if (stage === 'quote') {
    // docgen.js fires window.onEngagementQuoteCreated(docId, jobId) on save,
    // which links quoteDocId and advances quote -> booked. If cancelled,
    // stage stays put.
    openQuoteForJob(j);
  } else if (stage === 'booked' && j.packageId != null && entersDeliverOnAdvance(j)) {
    // Booked -> Deliver is the moment a package-linked job first counts
    // against its package (see jobDelivered()/entersDeliverOnAdvance()) —
    // stop for a required quantity confirmation instead of advancing
    // immediately. TSK-014: this used to live inside markJobPaid's own
    // paid->delivery advance; now that paid is a job-level flag rather than
    // a stage (see jobEarned()), the confirm belongs on the actual
    // booked->deliver move, whenever that happens — invoiced/paid or not.
    window.__packageConfirmJobId = jobId;
    renderPipeline();
  } else {
    advanceJobStage(jobId);   // 'inquiry', 'booked' (non-package), 'deliver': just advance
  }
}
window.pipelineAction = pipelineAction;

// ── Package quantity confirmation (required before a package-linked job
// can advance into Deliver) ──
window.__packageConfirmJobId = null;
function validatePackageConfirmQty(jobId, remaining) {
  const input = document.getElementById('pkg-confirm-qty-' + jobId);
  const errEl = document.getElementById('pkg-confirm-error-' + jobId);
  const saveBtn = document.getElementById('pkg-confirm-save-' + jobId);
  if (!input) return;
  const val = parseInt(input.value, 10);
  const over = isFinite(val) && val > remaining;
  const invalid = !(val > 0) || over;
  input.classList.toggle('blocked', over);
  if (errEl) {
    errEl.style.display = over ? 'flex' : 'none';
    if (over) errEl.textContent = t('confirm_overdraft_error').replace(/\{n\}/g, remaining);
  }
  if (saveBtn) saveBtn.classList.toggle('disabled', invalid);
}
window.validatePackageConfirmQty = validatePackageConfirmQty;
function cancelPackageConfirm() {
  window.__packageConfirmJobId = null;
  renderPipeline();
}
window.cancelPackageConfirm = cancelPackageConfirm;
async function confirmPackageDelivery(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j || j.packageId == null) return;
  const pkg = packages.find(p => p.id === j.packageId);
  const remaining = pkg ? packageRemaining(pkg) : 0;
  const input = document.getElementById('pkg-confirm-qty-' + jobId);
  const val = input ? parseInt(input.value, 10) : NaN;
  if (!(val > 0) || val > remaining) { validatePackageConfirmQty(jobId, remaining); return; }
  j.count = val;
  if (pkg) applyPackageRevenue(j, pkg);
  await dbPut('jobs', j);
  mirrorJob(j);
  window.__packageConfirmJobId = null;
  await advanceJobStage(jobId);
}
window.confirmPackageDelivery = confirmPackageDelivery;
function packageConfirmCardHtml(j) {
  const pkg = packages.find(p => p.id === j.packageId);
  if (!pkg) return '';
  const remaining = packageRemaining(pkg);
  const unit = packageUnitLabel();
  const prefill = j.count > 0 ? j.count : '';
  const prefillValid = prefill > 0 && prefill <= remaining;
  return `<div class="confirm-card" onclick="event.stopPropagation()">
      <div class="confirm-title">${htmlEsc(t('confirm_delivered_title').replace('{unit}', unit))}</div>
      <div class="confirm-context tnum">${htmlEsc(t('confirm_delivered_context').replace('{n}', remaining).replace('{total}', pkg.totalSessions).replace('{unit}', unit))}</div>
      <div class="confirm-input-row">
        <input type="number" class="confirm-input tnum" id="pkg-confirm-qty-${j.id}" min="1" value="${prefill}" oninput="event.stopPropagation();validatePackageConfirmQty(${j.id},${remaining})" onclick="event.stopPropagation()">
        <span class="confirm-unit">${htmlEsc(unit)}</span>
      </div>
      <div class="confirm-error" id="pkg-confirm-error-${j.id}" style="display:none"></div>
      <div class="confirm-btns">
        <button type="button" class="confirm-btn-cancel" onclick="event.stopPropagation();cancelPackageConfirm()">${htmlEsc(t('confirm_cancel'))}</button>
        <button type="button" class="confirm-btn-save${prefillValid ? '' : ' disabled'}" id="pkg-confirm-save-${j.id}" onclick="event.stopPropagation();confirmPackageDelivery(${j.id})">${htmlEsc(t('confirm_and_advance'))}</button>
      </div>
    </div>`;
}

async function advanceJobStage(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const order = jobOrder(j);
  const idx = order.indexOf(jobStage(j));
  if (idx < 0) { j.stage = order[0]; j.complete = false; }
  else if (idx >= order.length - 1) { j.stage = order[idx]; j.complete = true; j.outcome = 'extended'; }   // "Mark extended" — reachable again via a real renewal, see spawnRenewalQuoteJob()
  else { j.stage = order[idx + 1]; j.complete = false; }
  j.due = null;   // the new stage starts with no deadline — the gate below asks for one
  gateAfterForwardMove(j);   // persisted in the same put as the move — see the stage-gate section
  j.updatedAt = nowISO();
  logEvent('pipeline_stage:' + (j.complete ? (j.outcome || 'done') : j.stage));
  _pipelineActiveStage = j.stage;   // rail follows the card to wherever it just landed
  window.__kbMoved = jobId;
  await dbPut('jobs', j);
  mirrorJob(j);
  await reload();
  renderPipeline();
  if (j.pendingGateStage) openGateCard(j.id);
}

// Skip the current stage's linked action (no quote document required) and
// just move the card forward, same mechanics as advanceJobStage — only
// exposed on stages flagged skippable (Quote) since that's paperwork, not a
// money-received checkpoint. TSK-014: Paid is a job-level flag now, not a
// stage, so "never skippable" no longer applies here at all — see jobEarned().
async function skipJobStage(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (j) logEvent('pipeline_stage_skipped:' + jobStage(j));
  await advanceJobStage(jobId);
}
window.skipJobStage = skipJobStage;

// Cash-job path: skip Quote in one tap and land straight on Booked, already
// marked paid — for a session paid in cash on the spot, no client-facing
// quote is ever needed and there's no separate "money in" step to wait for
// (TSK-014: paid is a job-level flag, see jobEarned()). Opens the Cash gate
// card (gateCardHtml()'s 'cash' branch) rather than acting immediately —
// TSK-023 removed Fee from the Add-session form, so this is now the one
// place a cash job's amount ever gets entered; resolveGateCash() below does
// the actual stage/paid/amount mutation once that's confirmed. Still uses
// the job's own order (jobOrder(j)), same as everywhere else, so a Settings
// reorder never strands this on a stage that doesn't precede Booked in that
// particular job's chain.
function cashJobPath(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const order = jobOrder(j);
  const bookedIdx = order.indexOf('booked');
  const curIdx = order.indexOf(jobStage(j));
  if (bookedIdx < 0 || curIdx < 0 || curIdx >= bookedIdx) return;
  openGateCard(jobId, 'cash');
}
window.cashJobPath = cashJobPath;

// "Mark paid" for a Booked job with no invoice attached: same one-field
// cash-amount ask as cashJobPath (gateCardHtml()'s 'cash' branch,
// resolveGateCash() below), but for a job already AT Booked — no stage
// skip needed, just capture what was actually paid. Kept as a separate
// entry point from cashJobPath (which requires curIdx < bookedIdx) since
// this job is, by definition, already there.
function markPaidNoInvoice(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  openGateCard(jobId, 'cash');
}
window.markPaidNoInvoice = markPaidNoInvoice;

async function resolveGateCash(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const amountEl = document.getElementById('gate-cash-amount-' + jobId);
  const amount = amountEl ? (parseFloat(amountEl.value) || 0) : 0;
  const order = jobOrder(j);
  const bookedIdx = order.indexOf('booked');
  const curIdx = order.indexOf(jobStage(j));
  // Skip straight to Booked only if not already there/past it (the
  // cashJobPath case, from Inquiry) — markPaidNoInvoice's job is already at
  // Booked and just needs the amount + paid flag, no stage change.
  if (bookedIdx >= 0 && curIdx >= 0 && curIdx < bookedIdx) {
    logEvent('pipeline_stage_skipped:cash_job');
    j.stage = order[bookedIdx];
    j.due = null;
    gateAfterForwardMove(j);
  }
  j.paid = true;
  j.complete = false;
  j.amount = amount;
  j.tip = 0;
  j.expense = 0;
  j.netAmount = amount;
  j.updatedAt = nowISO();
  _pipelineActiveStage = j.stage;
  window.__kbMoved = jobId;
  window.__gateOpen = null;
  await dbPut('jobs', j);
  mirrorJob(j);
  await reload();
  renderPipeline();
  if (j.pendingGateStage) openGateCard(j.id);
}
window.resolveGateCash = resolveGateCash;

// Alt completion for the Deliver stage: the engagement is over without a renewal.
// Distinct from the primary "Mark extended" action so the completed badge (and
// the Insights pipeline-activity breakdown) can tell "extended" and "finished"
// engagements apart.
async function finishJobStage(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  j.complete = true;
  j.outcome = 'finished';
  j.pendingGateStage = null;   // terminal — nothing left to book
  j.due = null;
  j.updatedAt = nowISO();
  logEvent('pipeline_stage:finished');
  _pipelineActiveStage = j.stage;
  window.__kbMoved = jobId;
  await dbPut('jobs', j);
  mirrorJob(j);
  await reload();
  renderPipeline();
}
window.finishJobStage = finishJobStage;

// The failure exit at any live stage: the client walked away. Distinct from
// 'finished' (success, end-of-flow only) — a lost deal keeps its stage (so
// Insights can see WHERE deals die), keeps every sub-task/quote/option for
// history, leaves the active board counts and the timeline (complete jobs
// are excluded there), and never counts as delivered for package deduction
// (see jobDelivered()). Reopenable with the ← button like any completed
// engagement — moveJobStageBack already clears outcome.
// Opens a small reason-picker overlay (same build-on-demand pattern as
// openApptModal) instead of a bare confirm() — "why" is useful for Insights
// but must stay optional, so overlay-click and Cancel both back out with NO
// change (unlike the appointment gate, this is not a locked door).
const LOST_REASONS = ['cancelled', 'no_response', 'price', 'competitor'];
function markJobLost(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j || jobComplete(j)) return;
  document.getElementById('modal-lost')?.remove();   // never stack two
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'modal-lost';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${attrEsc(t('lost_modal_title'))}">
      <div class="modal-handle"></div>
      <div class="modal-title">${htmlEsc(t('lost_modal_title'))}</div>
      <div class="form-body" style="padding:0 20px 4px">
        <p class="ap-context">${htmlEsc(t('confirm_mark_lost'))}</p>
        <label style="display:block;font-size:13px;font-weight:700;color:var(--text2);margin:0 0 8px">${htmlEsc(t('lost_reason_label'))}</label>
        <div class="ap-seg" id="lost-reasons" style="flex-wrap:wrap">
          ${LOST_REASONS.map(r => `<button type="button" data-reason="${r}" style="flex:1 1 45%;min-width:120px" onclick="toggleLostReason(this)">${htmlEsc(t('lost_reason_' + r))}</button>`).join('')}
        </div>
      </div>
      <button type="button" class="btn-submit" id="lost-confirm" onclick="confirmMarkJobLost(${jobId})">${htmlEsc(t('lost_confirm_btn'))}</button>
      <button type="button" class="btn-danger" id="lost-cancel" style="border-color:var(--border-mid);color:var(--text3)">${htmlEsc(t('lost_cancel_btn'))}</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('lost-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}
window.markJobLost = markJobLost;

// Single-select: tapping the already-active chip clears it — the reason is
// optional, so there must be a way back to "none selected".
function toggleLostReason(btn) {
  const wasActive = btn.classList.contains('seg-active');
  document.querySelectorAll('#lost-reasons button').forEach(b => b.classList.remove('seg-active'));
  if (!wasActive) btn.classList.add('seg-active');
}
window.toggleLostReason = toggleLostReason;

async function confirmMarkJobLost(jobId) {
  const overlay = document.getElementById('modal-lost');
  const selBtn = overlay ? overlay.querySelector('#lost-reasons button.seg-active') : null;
  const reason = selBtn ? selBtn.dataset.reason : null;
  overlay?.remove();
  const j = jobs.find(x => x.id === jobId);
  if (!j || jobComplete(j)) return;
  j.complete = true;
  j.outcome = 'lost';
  j.lostReason = reason;
  j.pendingGateStage = null;   // a dead deal has nothing left to book
  j.due = null;
  j.updatedAt = nowISO();
  logEvent('pipeline_stage:lost' + (reason ? ':' + reason : ''));
  _pipelineActiveStage = j.stage;
  window.__kbMoved = jobId;
  await dbPut('jobs', j);
  mirrorJob(j);
  await reload();
  renderPipeline();
}
window.confirmMarkJobLost = confirmMarkJobLost;

// Move a card back one stage (or re-open a completed engagement at its final stage).
async function moveJobStageBack(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const order = jobOrder(j);
  const idx = order.indexOf(jobStage(j));
  if (idx > 0) { j.stage = order[idx - 1]; }            // step back one column
  else if (!jobComplete(j)) return;                     // already at the first stage, nothing to undo
  j.complete = false;
  j.outcome = null;   // stepping back out of a completed engagement clears its extended/finished outcome
  j.pendingGateStage = null;   // going backward never gates — an unresolved gate is void once the move is undone
  j.due = null;   // the due date belonged to the stage just left — stale once undone
  j.updatedAt = nowISO();
  _pipelineActiveStage = j.stage;   // rail follows the card back
  window.__kbMoved = jobId;
  if (window.__gateOpen && window.__gateOpen.jobId === jobId) window.__gateOpen = null;
  await dbPut('jobs', j);
  mirrorJob(j);
  await reload();
  renderPipeline();
}
window.moveJobStageBack = moveJobStageBack;

// TSK-014: paid is a job-level flag now, not a pipeline stage — marking a
// job paid NEVER moves its stage. Booked -> Deliver (where a package-linked
// job first counts against its package) happens on the card's own advance
// action (see pipelineAction()'s booked branch / entersDeliverOnAdvance()),
// independently of whether the job has been paid yet.
async function markJobPaid(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  if (j.invoiceId != null) {
    try {
      const inv = await dbGet('invoices', j.invoiceId);
      if (inv) {
        const wasPaid = inv.status === 'paid';
        inv.status = 'paid'; inv.updatedAt = nowISO();
        await dbPut('invoices', inv);
        // TSK-023 (money-field removal): Fee/Tip/Expense no longer live on
        // the job form, so the invoice's own youReceive figure (already
        // VAT/WHT-aware, computed independently of any job field) becomes
        // this job's revenue the moment its invoice is actually paid —
        // Home/the goal card/CSV export all read job.amount/netAmount
        // unchanged, they just get the right number now.
        j.amount = Number(inv.youReceive) || 0;
        j.tip = 0;
        j.expense = 0;
        j.netAmount = j.amount;
        // Pass M3-L1: third paid-transition path (direct dbPut, not through
        // invoices.js) — see decrementStockForInvoicePaid's own comment.
        if (!wasPaid && typeof window.decrementStockForInvoicePaid === 'function') {
          window.decrementStockForInvoicePaid(inv).catch(() => {});
        }
      }
    } catch (e) { /* non-fatal */ }
  }
  if (typeof renderInvoices === 'function') renderInvoices();
  j.paid = true;
  j.updatedAt = nowISO();
  logEvent('pipeline_stage:paid');
  await dbPut('jobs', j);
  mirrorJob(j);
  await reload();
  renderPipeline();
  toast('Marked paid');
}

// Open the doc-gen quote flow prefilled from this session's customer + service.
function openQuoteForJob(j) {
  if (typeof openGenerateForm !== 'function') { toast('Quote generator unavailable'); return; }
  openGenerateForm('quote', {
    clientId: j.clientId != null ? j.clientId : null,
    clientName: j.client || '',
    fields: {
      clientId: j.clientId != null ? j.clientId : null,
      // Pass M3-L2: any products/extra services attached to this engagement
      // (job-tracking-section's Items list) ride along as their own quote
      // lines — docgen.js consumes fields.lineItems as-is.
      lineItems: [
        { description: j.serviceName || unitWord(), qty: (j.count > 0 ? j.count : 1), unitPrice: Number(j.amount) || 0 },
        ...(j.items || []).map(it => ({ description: it.name, qty: it.qty, unitPrice: it.unitPrice })),
      ],
    },
  });
  // Mark this engagement pending AFTER opening (openGenerateForm clears it first);
  // docgen.js links quoteDocId + advances only on a successful save. Cancelling
  // leaves the stage untouched.
  window.__pendingQuoteJobId = j.id;
  // Stale-flag safety: a normal "Send quote" from the stage action must
  // never be mistaken for a leftover revise flag.
  window.__quoteReviseJobId = null;
}

// Redo a quote after the client pushes back, WITHOUT re-advancing the stage
// or re-gating — the only alternative today is ← back to quote + "Send
// quote", which advances AND re-gates on every single revision round trip.
// Same prefill as openQuoteForJob; onEngagementQuoteCreated checks
// __quoteReviseJobId FIRST and, when set, just relinks quoteDocId and stops.
function reviseQuoteForJob(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  if (typeof openGenerateForm !== 'function') { toast('Quote generator unavailable'); return; }
  openGenerateForm('quote', {
    clientId: j.clientId != null ? j.clientId : null,
    clientName: j.client || '',
    fields: {
      clientId: j.clientId != null ? j.clientId : null,
      // Pass M3-L2: any products/extra services attached to this engagement
      // (job-tracking-section's Items list) ride along as their own quote
      // lines — docgen.js consumes fields.lineItems as-is.
      lineItems: [
        { description: j.serviceName || unitWord(), qty: (j.count > 0 ? j.count : 1), unitPrice: Number(j.amount) || 0 },
        ...(j.items || []).map(it => ({ description: it.name, qty: it.qty, unitPrice: it.unitPrice })),
      ],
    },
  });
  // Set AFTER opening — openGenerateForm clears __pendingQuoteJobId first.
  window.__pendingQuoteJobId = j.id;
  window.__quoteReviseJobId = j.id;
}
window.reviseQuoteForJob = reviseQuoteForJob;

// Same idea for invoices: openInvoiceForm always creates a fresh invoice
// record (it has no in-place edit-and-relink path), so a revise is just
// "create another one and swap the link" — onEngagementInvoiceCreated
// checks __invoiceReviseJobId first and skips the stage move when set.
function reviseInvoiceForJob(jobId) {
  if (typeof openInvoiceForm !== 'function') return;
  openInvoiceForm(jobId);
  window.__invoiceReviseJobId = jobId;
}
window.reviseInvoiceForJob = reviseInvoiceForJob;

// Called by invoices.js whenever an invoice's status TRANSITIONS to 'paid'
// (detail-modal select or an edit save) — the reverse of markJobPaid's own
// invoice flip. Users record payment where the invoice lives; without this
// they had to mark the same payment twice. Deliberately narrow:
// - only a job LINKED to this invoice (j.invoiceId), not already paid, not
//   complete — TSK-014: paid is a job-level flag now (jobEarned()), not a
//   stage, so there's no "which stage is it sitting at" check needed
//   anymore, and package-linked jobs no longer need excluding either (the
//   quantity-confirm gate lives on the booked->deliver move, independent of
//   payment — see pipelineAction());
// - no loop risk: markJobPaid's own invoice flip writes dbPut directly
//   (not through invoices.js's handlers), so it can never re-fire this.
window.onInvoiceMarkedPaid = async function (invoiceId) {
  const j = jobs.find(x => x.invoiceId === invoiceId);
  if (!j || jobComplete(j) || j.paid) return;
  await markJobPaid(j.id);
};

// Called by invoices.js after an invoice is created from a pipeline session.
// TSK-014: a Booked job can carry zero/one/many invoices, and attaching one
// never moves the stage anymore (paperwork and "client accepted" are
// orthogonal now — see markJobPaid()/jobEarned()) — this is purely a link.
window.onEngagementInvoiceCreated = async function (invoiceId, jobId) {
  if (jobId == null) return;
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const wasRevise = window.__invoiceReviseJobId === jobId;
  window.__invoiceReviseJobId = null;
  j.invoiceId = invoiceId;
  j.updatedAt = nowISO();
  await dbPut('jobs', j);
  mirrorJob(j);
  await reload();
  renderPipeline();
  // A first-time attach already gets its own "Invoice INV-... created" toast
  // from invoices.js's own save handler — only the revise path needs this
  // one, to make clear the stage didn't move on a redo.
  if (wasRevise) toast(t('invoice_revised_toast'));
};

// Called by docgen.js after a quote document is saved from a pipeline session:
// link the doc, then advance that session's stage. Cancelling never reaches here.
window.onEngagementQuoteCreated = async function (docId, jobId) {
  if (jobId == null) return;
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  // Revise path (reviseQuoteForJob): relink the paperwork, stage untouched,
  // no re-gate — a redo shouldn't cost another round trip through the gate.
  if (window.__quoteReviseJobId === jobId) {
    window.__quoteReviseJobId = null;
    j.quoteDocId = docId;
    j.updatedAt = nowISO();
    await dbPut('jobs', j);
    mirrorJob(j);
    await reload();
    renderPipeline();
    toast(t('quote_revised_toast'));
    return;
  }
  j.quoteDocId = docId;
  const order = jobOrder(j);
  const idx = order.indexOf(jobStage(j));
  if (idx >= 0 && idx < order.length - 1) { j.stage = order[idx + 1]; j.complete = false; }
  else if (idx >= order.length - 1) { j.complete = true; }
  j.due = null;
  gateAfterForwardMove(j);
  j.updatedAt = nowISO();
  logEvent('pipeline_stage:' + (j.complete ? 'done' : j.stage));
  _pipelineActiveStage = j.stage;
  await dbPut('jobs', j);
  mirrorJob(j);
  await reload();
  renderPipeline();
  if (j.pendingGateStage) openGateCard(j.id);
};

// ─── STAGE-GATE + APPOINTMENT MODAL (dated steps) ──────────────────────
// Every forward stage move must answer "when's the next appointment?" before
// the user can act on the card again — a card can never advance silently and
// leave the follow-up unscheduled. The gate is persisted-first: pendingGateStage
// is written in the SAME dbPut as the stage move itself, so killing the tab
// mid-prompt can't lose it — on reload the card shows an amber "book next
// step" banner and any advance tap reopens the modal instead of moving again.
// Terminal moves (complete) never gate: there is no next step to book.
function gateAfterForwardMove(j) {          // call BEFORE the commit point's dbPut
  // Per-account off switch (Settings ▸ Manage): a high-volume persona (a
  // laundry moving 10 orders/day answers ~50 gate prompts) can disable the
  // prompt entirely; stored inverted (stageGateOff) so every existing
  // account and fresh install stays gated by default with no migration.
  if (settings.stageGateOff) { j.pendingGateStage = null; return; }
  if (!j.complete) j.pendingGateStage = j.stage; else j.pendingGateStage = null;
}

// Create the calendar booking behind an 'exact' dated step. saveBooking
// (bookings.js) is IIFE-private and reads its own form DOM, so it can't be
// called from here — instead this mirrors its create path (dbAdd + backend
// mirror) directly. jobCuid is the only link back; the booking renders on the
// calendar with zero changes (dot logic keys only on uid/date/status).
async function createBookingForStep(j, st) {
  const row = { uid: j.uid, cuid: cuid(), customerId: j.clientId ?? null,
    title: st.text + (j.client ? ' — ' + j.client : ''),
    date: st.date, startTime: st.startTime || '09:00', durationMin: 60, travelBufferMin: 0,
    location: '', notes: t('appt_booking_note'), status: 'scheduled',
    jobCuid: j.cuid, createdAt: nowISO(), updatedAt: nowISO() };
  const key = await dbAdd('bookings', row); row.id = key;
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled())
    SidekickBackend.mirrorBookingSave(row).catch(() => {});
  st.bookingCuid = row.cuid;
}

// TSK-016: keep the inline stage-gate's OPTIONAL linked Calendar booking
// (job.dueBookingCuid) in lockstep with job.due — the scalar reminder field
// TSK-012 introduced. Mirrors createBookingForStep's persistence shape but
// at the job level (no subTask involved, since the inline gate never had
// one): create on first save, MOVE the same booking in place on a later
// reschedule (Redo/Postpone) rather than leaving a stale duplicate behind,
// delete when a date is cleared. Doesn't touch the title on a move — a
// postponed appointment stays the same appointment, just on a new date.
async function syncGateBookingForDue(j, date, titleKind) {
  if (!date) {
    if (j.dueBookingCuid) { await deleteBookingByCuid(j.dueBookingCuid); j.dueBookingCuid = null; }
    return;
  }
  if (j.dueBookingCuid) {
    const row = (await dbAll('bookings')).find(b => b.cuid === j.dueBookingCuid);
    if (row) {
      row.date = date; row.updatedAt = nowISO();
      await dbPut('bookings', row);
      if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled())
        SidekickBackend.mirrorBookingSave(row).catch(() => {});
      return;
    }
    // Linked booking vanished elsewhere (e.g. deleted from Calendar directly)
    // — fall through and recreate rather than leaving due with a dead link.
  }
  const st = { text: t('gate_booking_title_' + (titleKind || 'pending')), date, startTime: '09:00' };
  await createBookingForStep(j, st);
  j.dueBookingCuid = st.bookingCuid;
}

// One dynamic overlay (same pattern as maybeShowCloudBackupModal — built on
// demand, no index.html markup) serves all four flows:
//   gate   — after a forward stage move; the ONLY exits are Save and
//            "no appointment needed" (overlay-click is a locked door here,
//            deliberately NOT wired into the shared overlay-click block at
//            the bottom of this file — a stray tap must not skip the gate)
//   add    — "+ Step with date" button inside the job edit modal
//   repeat — clone an existing dated step with a fresh date (↻ button)
//   edit   — reschedule an existing dated step in place (✎ button):
//            everything prefilled INCLUDING the date, and save mutates the
//            source step + moves/creates/removes its linked calendar
//            booking in the same write — the reschedule affordance whose
//            absence previously forced delete + recreate + an orphaned
//            booking (the sub-task workflow assessment's top gap).
window.__apCtx = null;      // { mode, jobId, stage?, sourceSubTaskId? } while open
window.__apType = 'exact';  // 'exact' (calendar booking) | 'by' (deadline only)
// Set by reviseQuoteForJob/reviseInvoiceForJob just before opening the same
// doc-gen/invoice UI a normal send uses — tells onEngagementQuoteCreated/
// onEngagementInvoiceCreated to relink the paperwork WITHOUT moving the
// stage or re-gating. Cleared at the top of pipelineAction() and inside
// openQuoteForJob() so a cancelled revise can never hijack the next normal
// send (stale-flag safety).
window.__quoteReviseJobId = null;
window.__invoiceReviseJobId = null;
// TSK-012 retired this modal's old 'gate' mode (the stage-gate prompt after
// every forward pipeline move) in favor of the inline gate card (see the
// STAGE-GATE INLINE CARD section, openGateCard()/gateCardHtml()). TSK-018
// part 2 later retired its 'repeat'/'edit' modes and the standalone
// "+ Step with date" entry point along with the rest of the freeform
// sub-task list — this modal now serves exactly one purpose: booking a
// viewing date for an Options-compared candidate (bookViewingForOption()),
// via job.subTasks[] as the underlying link to a real Calendar booking.
function openApptModal(ctx) {
  const j = jobs.find(x => x.id === ctx.jobId);
  if (!j) return;
  document.getElementById('modal-appt')?.remove();   // never stack two
  window.__apCtx = ctx;
  const title = t('appt_add_dated');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'modal-appt';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${attrEsc(title)}">
      <div class="modal-handle"></div>
      <div class="modal-title" id="ap-title">${htmlEsc(title)}</div>
      <div class="form-body" style="padding:0 20px 4px">
        <div class="field"><input type="text" id="ap-step" placeholder="${attrEsc(t('appt_step_ph'))}" value="${attrEsc(ctx.prefillText || '')}"></div>
        <div class="ap-seg">
          <button type="button" id="ap-type-exact" class="seg-active" onclick="setApptType('exact')">${htmlEsc(t('appt_type_exact'))}</button>
          <button type="button" id="ap-type-by" onclick="setApptType('by')">${htmlEsc(t('appt_type_by'))}</button>
        </div>
        <div class="field" id="ap-date-row"><label id="ap-date-label">${htmlEsc(t('appt_date_label'))}</label><input type="date" id="ap-date" value=""></div>
        <div class="field" id="ap-time-row"><label>${htmlEsc(t('appt_time_label'))}</label><input type="time" id="ap-time" value="09:00"></div>
      </div>
      <button type="button" class="btn-submit" id="ap-save" onclick="saveApptModal()">${htmlEsc(t('appt_save'))}</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeApptModal(); });
  setApptType('exact');
}
window.openApptModal = openApptModal;

function setApptType(type) {
  window.__apType = type === 'by' ? 'by' : 'exact';
  const ex = document.getElementById('ap-type-exact'), by = document.getElementById('ap-type-by');
  if (ex) ex.classList.toggle('seg-active', window.__apType === 'exact');
  if (by) by.classList.toggle('seg-active', window.__apType === 'by');
  const dl = document.getElementById('ap-date-label');
  if (dl) dl.textContent = window.__apType === 'by' ? t('appt_by_label') : t('appt_date_label');
  const tr = document.getElementById('ap-time-row');
  if (tr) tr.style.display = window.__apType === 'by' ? 'none' : '';   // a deadline has no start time
}
window.setApptType = setApptType;

async function saveApptModal() {
  const ctx = window.__apCtx;
  if (!ctx) return;
  const j = jobs.find(x => x.id === ctx.jobId);
  if (!j) { closeApptModal(); return; }
  const text = ((document.getElementById('ap-step') || {}).value || '').trim();
  const date = (document.getElementById('ap-date') || {}).value || '';
  if (!text) { toast(t('appt_err_step')); return; }   // validation keeps the modal open
  if (!date) { toast(t('appt_err_date')); return; }
  const timeVal = (document.getElementById('ap-time') || {}).value || '';

  const st = { id: cuid(), text, done: false, dateType: window.__apType, date,
    startTime: window.__apType === 'exact' ? (timeVal || '09:00') : null, bookingCuid: null };
  j.subTasks = j.subTasks || [];
  j.subTasks.push(st);
  if (st.dateType === 'exact') await createBookingForStep(j, st);
  // Booked from an option's 📅 button (bookViewingForOption) — flip that
  // option to 'viewing' in this same write, but only from 'considering' so
  // a re-booking never clobbers a verdict already recorded on it.
  if (ctx.optionId) {
    const o = (j.options || []).find(x => x.id === ctx.optionId);
    if (o && o.status === 'considering') o.status = 'viewing';
  }
  j.updatedAt = nowISO();
  await dbPut('jobs', j);
  mirrorJob(j);
  closeApptModal();
  renderJobTracking(ctx.jobId);
  toast(t('appt_step_added_toast'));
}
window.saveApptModal = saveApptModal;

function closeApptModal() {
  document.getElementById('modal-appt')?.remove();
  window.__apCtx = null;
}
window.closeApptModal = closeApptModal;

// ─── WORKFLOW SETTINGS (reorder only) ───────────────────────────────────
// All 6 stages are mandatory and always present, so this is just a reorder
// list — no add/remove toggle (there's no optional stage anymore).
function renderWorkflowControls() {
  const wrap = document.getElementById('workflow-body');
  if (!wrap) return;
  const order = getStageOrder();
  const rows = order.map((stage, i) => {
    const meta = STAGE_META[stage] || {};
    const label = (meta.label && t(meta.label)) || stage;
    return `<div class="wf-row">
      <span class="wf-ico">${meta.icon || ''}</span>
      <span class="wf-name">${htmlEsc(label)}</span>
      <span class="wf-btns">
        <button type="button" class="wf-move" aria-label="Move ${attrEsc(label)} up" ${i === 0 ? 'disabled' : ''} onclick="wfMove(${i},-1)">↑</button>
        <button type="button" class="wf-move" aria-label="Move ${attrEsc(label)} down" ${i === order.length - 1 ? 'disabled' : ''} onclick="wfMove(${i},1)">↓</button>
      </span>
    </div>`;
  }).join('');
  wrap.innerHTML = `<div class="wf-list">${rows}</div>`;
}
window.renderWorkflowControls = renderWorkflowControls;

async function wfMove(i, delta) {
  const order = getStageOrder();
  const j = i + delta;
  if (j < 0 || j >= order.length) return;
  const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  // 'deliver' must never precede 'booked' — nothing can be delivered before
  // it's booked. (TSK-014: the old "'paid' must never precede 'invoice'"
  // guard retired along with the 'paid'/'invoice' stages themselves — paid
  // is a job-level flag now, see jobEarned().)
  if (order.indexOf('deliver') < order.indexOf('booked')) {
    toast('Deliver must come after Booked');
    return;   // revert: order is a local copy, nothing saved
  }
  await saveSetting('stageOrder', order);
  renderWorkflowControls();
  renderPipeline();
}
window.wfMove = wfMove;

// ─── CUSTOMERS (records only — history/stats are BACKLOG) ──────────────
// Gym trainer intake fields shown on every customer form.
const CUSTOMER_INTAKE = [{id:'healthNotes', key:'field_health'}, {id:'allergies', key:'field_allergies'}, {id:'goals', key:'field_goals'}];
function intakeFields() { return CUSTOMER_INTAKE; }
// Stable, permanent per-customer ID (never reassigned, never reused) — unlike
// the auto-increment DB `id`, this is the human-facing "Member ID" a trainer
// can reference on paperwork or when talking to the client. Sequential across
// this uid's whole customer list, never reset (unlike invoice numbers, which
// reset per year).
function nextMemberNo() {
  const prefix = 'SK-';
  let max = 0;
  customers.forEach(c => {
    if (typeof c.memberNo !== 'string') return;
    // Legacy 'M-' records are migrated to 'SK-' on boot (see enterApp()), but
    // backfillMemberNumbers() runs before that migration in the same boot —
    // scanning both prefixes here keeps the sequence collision-free either way.
    let seq = null;
    if (c.memberNo.indexOf(prefix) === 0) seq = parseInt(c.memberNo.slice(prefix.length), 10);
    else if (c.memberNo.indexOf('M-') === 0) seq = parseInt(c.memberNo.slice(2), 10);
    if (seq != null && isFinite(seq) && seq > max) max = seq;
  });
  return prefix + String(max + 1).padStart(4, '0');
}
// Shared year-scoped running document number (e.g. "INV-2026-0001",
// "QUO-2026-0001", "REC-2026-0001") — one implementation reused by every
// referable document type (invoices.js's own invoice numbering, and
// docgen.js's quote/receipt numbering) so they all behave identically and
// reset together each calendar year. `rows` should already be filtered to
// just the document type being numbered (so each type gets its own sequence).
function nextDocNumber(rows, prefix) {
  const year = todayISO().slice(0, 4);
  const p = `${prefix}-${year}-`;
  let max = 0;
  rows.forEach(r => {
    if (typeof r.number === 'string' && r.number.indexOf(p) === 0) {
      const seq = parseInt(r.number.slice(p.length), 10);
      if (isFinite(seq) && seq > max) max = seq;
    }
  });
  return p + String(max + 1).padStart(4, '0');
}
// One-time backfill for customers saved before this feature existed — assigns
// each a permanent Member ID in creation order so the whole list is covered
// immediately, not just customers the trainer happens to re-save later.
async function backfillMemberNumbers() {
  const missing = customers.filter(c => !c.memberNo).sort((a,b) => (a.id||0) - (b.id||0));
  for (const c of missing) {
    c.memberNo = nextMemberNo();
    await dbPut('clients', c);
  }
}
// "Needs attention" — an overdue invoice takes priority over a nearly-used
// package if a client somehow has both, since money owed is more urgent than
// a renewal offer. Packages apply to every business type now, same as the
// overdue-invoice half.
const PACKAGE_ALMOST_DONE_THRESHOLD = 2;
const PACKAGE_EXPIRY_WARNING_DAYS = 7;
async function computeClientsNeedingAttention() {
  const uid = isGuest ? 'guest' : currentUser.id;
  const todayStr = todayISO();
  const allInvoices = (await dbAll('invoices')).filter(i => i.uid === uid);
  const items = [];
  customers.forEach(c => {
    const overdue = allInvoices
      .filter(i => i.clientId === c.id && i.status !== 'paid' && i.dueDate && i.dueDate < todayStr)
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    if (overdue.length) {
      const inv = overdue[0];
      const days = daysSinceISO(inv.dueDate);
      items.push({
        client: c,
        // `kind` + `todaySub`/`amount`/`sortKey` (TSK-009) are additive — the
        // Clients screen's needsAttentionRowHtml() only ever reads
        // client/reason/actionLabel/action, unchanged. `todaySub`/`amount`
        // exist so Home's merged "Today" card can put the invoice amount in
        // its own right-aligned red mono column instead of folding it into
        // the sub-line text (which `reason` still does, for the Clients
        // screen's plain-text row).
        kind: 'overdue',
        reason: `Invoice ${days} day${days === 1 ? '' : 's'} overdue · ${money(inv.clientPays)}`,
        todaySub: `${days} day${days === 1 ? '' : 's'} overdue`,
        amount: (Number(inv.clientPays) || 0),
        sortKey: -days, // most-overdue first
        actionLabel: t('remind_action'),
        action: () => remindAboutInvoice(inv.id),
      });
      return; // one attention item per client — overdue takes priority
    }
    {
      const pkg = activePackageFor(c.id);
      if (pkg) {
        const remaining = packageRemaining(pkg);
        const daysToExpiry = pkg.expiresAt ? -daysSinceISO(pkg.expiresAt) : null;
        // Expiring soon takes priority over merely "almost done" — a package
        // with plenty left that's about to be forfeited is the bigger risk
        // (real money about to be lost), not just a heads-up to plan ahead.
        if (remaining > 0 && daysToExpiry != null && daysToExpiry >= 0 && daysToExpiry <= PACKAGE_EXPIRY_WARNING_DAYS) {
          items.push({
            client: c,
            kind: 'expiring',
            reason: `Package expires in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'} · ${remaining} ${packageUnitLabel()} left`,
            todaySub: `Package expires in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'} · ${remaining} ${packageUnitLabel()} left`,
            sortKey: daysToExpiry, // soonest-expiring first
            actionLabel: t('offer_renewal_action'),
            action: () => offerRenewalForClient(c.id),
          });
        } else if (remaining > 0 && remaining <= PACKAGE_ALMOST_DONE_THRESHOLD) {
          items.push({
            client: c,
            kind: 'almost',
            reason: `Package almost done · ${remaining} ${packageUnitLabel()} left`,
            todaySub: `Package almost done · ${remaining} ${packageUnitLabel()} left`,
            sortKey: remaining, // fewest-remaining first
            actionLabel: t('offer_renewal_action'),
            action: () => offerRenewalForClient(c.id),
          });
        }
      } else {
        // TSK-019: activePackageFor() only ever returns a package with
        // remaining > 0, so a package that jumps straight from N remaining
        // to exactly 0 in one delivery (normal for a variable-quantity
        // business — e.g. a 26-piece laundry drop-off exhausting a package
        // that had 26 left, skipping past the <=2 "almost" window entirely)
        // fell out of this whole function with no renewal nudge, ever. Only
        // the client's single most-recent package is checked (an old,
        // long-abandoned depleted package shouldn't resurface); a package
        // that expired with balance forfeited is excluded here since that's
        // a different situation with its own message on the client profile.
        const mostRecent = clientPackages(c.id)[0];
        if (mostRecent && !packageIsExpired(mostRecent) && packageUsed(mostRecent) > 0 && packageRemaining(mostRecent) === 0) {
          items.push({
            client: c,
            kind: 'depleted',
            reason: `Package complete · 0 ${packageUnitLabel()} left`,
            todaySub: `Package complete · renew?`,
            sortKey: 0,
            actionLabel: t('offer_renewal_action'),
            action: () => offerRenewalForClient(c.id),
          });
        }
      }
    }
  });
  return items;
}
function remindAboutInvoice(invoiceId) {
  switchScreen('invoices');
}
window.remindAboutInvoice = remindAboutInvoice;
function offerRenewalForClient(clientId) {
  openEditCustomer(clientId);
  togglePackageForm(true, clientId);
  spawnRenewalQuoteJob(clientId).catch(() => {});
}
window.offerRenewalForClient = offerRenewalForClient;

// TSK-014: renewal is now an explicit action, not a stage a job sits in
// ('extend' is retired — see STAGES) — offering a renewal spawns a brand
// NEW job/card at the 'quote' stage instead. Best-effort: a client with no
// prior job to clone the service/amount from (e.g. no engagement yet) just
// gets the package-purchase form above; there's nothing to quote yet.
// TSK-013: now takes an optional dueDate — the Package-final gate's "Send
// renewal quote" passes the date the owner picked for the renewal follow-up,
// carried onto the new card's job.due (so it shows up immediately with a
// deadline chip instead of a pending banner). offerRenewalForClient's own
// call site (client-profile action, unrelated to the pipeline gate) omits
// it and keeps behaving exactly as before (due stays null there).
async function spawnRenewalQuoteJob(clientId, dueDate) {
  const c = customers.find(x => x.id === clientId);
  if (!c) return;
  const source = jobs.find(j => j.clientId === clientId && j.packageId != null) || jobs.find(j => j.clientId === clientId);
  if (!source) return;
  const order = getStageOrder();
  const quoteIdx = order.indexOf('quote');
  const job = {
    uid: c.uid, date: todayISO(), client: c.name, clientId: c.id,
    serviceId: source.serviceId || null, serviceName: source.serviceName || '',
    jobType: settings.workType || '', amount: Number(source.amount) || 0, tip: 0, expense: 0,
    count: 1, notes: t('renewal_job_note'), netAmount: Number(source.amount) || 0,
    cuid: cuid(), stageOrder: order.slice(), stage: quoteIdx >= 0 ? order[quoteIdx] : order[0], complete: false,
    invoiceId: null, quoteDocId: null, packageId: null,
    subTasks: [], milestones: [], timeEntries: [], timerStartedAt: null,
    outcome: null, lostReason: null, options: [], items: [], paid: false,
    due: dueDate || null, note: null, attempt: 1, dueBookingCuid: null,
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  const key = await dbAdd('jobs', job);
  job.id = key;
  mirrorJob(job);
  await reload();
}
window.__clientAttentionActions = [];
// Client engagement stage — 'active-customer' | 'inquiry' | 'lost' — purely
// engagement-based (jobEarned/outcome), never persona-specific, so it works
// identically across every BUSINESS_TYPES persona (trainer/realestate/
// laundry/insurance/garage/custom). `jobs` is already sorted date-descending
// (see reload()), so the first match below is already the client's
// most-recent job — no re-sort needed.
function clientStage(c) {
  const cj = jobs.filter(j => j.clientId === c.id);
  if (cj.some(jobEarned)) return 'active-customer';
  const mostRecent = cj[0];
  if (mostRecent && mostRecent.outcome === 'lost') return 'lost';
  return 'inquiry'; // covers zero jobs and in-progress-not-yet-earned
}
// The service name of the client's most-recently-dated job, or a "no
// engagement yet" fallback for a client with zero jobs — also covers a job
// that exists but has a blank serviceName (e.g. the `custom` persona's empty
// seedServices list can leave a job's service name unset).
function clientProspectService(c) {
  const mostRecent = jobs.find(j => j.clientId === c.id);
  return (mostRecent && mostRecent.serviceName) || t('no_engagement_yet');
}
// Transient UI state for the Clients screen's search + filter chips — not
// persisted, same pattern as window.__pkgFormOpen/__plView.
window.__clientFilterStage = 'all';
window.__clientSearchQuery = '';
function selectClientFilterStage(stage) {
  window.__clientFilterStage = stage;
  renderCustomers();
}
window.selectClientFilterStage = selectClientFilterStage;
function onClientSearchInput(value) {
  window.__clientSearchQuery = value || '';
  renderCustomers();
}
window.onClientSearchInput = onClientSearchInput;
function needsAttentionRowHtml(item, idx) {
  const initial = (item.client.name || '?').charAt(0).toUpperCase();
  return `<div class="list-row" style="cursor:default">
      <div class="list-icon" style="background:var(--marigold-tint);color:var(--marigold-ink)">${htmlEsc(initial)}</div>
      <div class="list-main">
        <div class="list-title">${htmlEsc(item.client.name)}</div>
        <div class="list-sub">${item.reason}</div>
      </div>
      <div class="list-right"><button type="button" class="qc-btn" style="width:auto;padding:0 10px;color:var(--marigold-ink);font-size:12px;font-weight:700" onclick="window.__clientAttentionActions[${idx}]()">${htmlEsc(item.actionLabel)}</button></div>
    </div>`;
}
async function renderCustomers() {
  const wrap = document.getElementById('customers-body');
  const chipsWrap = document.getElementById('client-filter-chips');
  if (!wrap) return;
  if (!customers.length) {
    wrap.innerHTML = `<div class="empty"><div class="empty-icon">👤</div>
      <p>${htmlEsc(t('no_customers'))}</p><span>${htmlEsc(t('no_customers_sub'))}</span></div>`;
    if (chipsWrap) chipsWrap.innerHTML = '';
    return;
  }
  const attention = await computeClientsNeedingAttention();
  window.__clientAttentionActions = attention.map(item => item.action);
  const attentionHtml = attention.length
    ? `<div class="section-title" style="font-size:12px;margin-bottom:8px">${htmlEsc(t('needs_attention_title'))}</div>
       <div class="list-card" style="margin-bottom:16px">${attention.map(needsAttentionRowHtml).join('')}</div>
       <div class="section-title" style="font-size:12px;margin-bottom:8px">${htmlEsc(t('all_clients_title'))}</div>`
    : '';

  // Search (name, case-insensitive) narrows the pool the filter chips count
  // and list from — live as-you-type, transient (window.__clientSearchQuery).
  const query = (window.__clientSearchQuery || '').trim().toLowerCase();
  const searchFiltered = query ? customers.filter(c => (c.name || '').toLowerCase().includes(query)) : customers.slice();
  const stageOf = new Map(searchFiltered.map(c => [c.id, clientStage(c)]));
  const counts = {all: searchFiltered.length, inquiry: 0, 'active-customer': 0, lost: 0};
  searchFiltered.forEach(c => { counts[stageOf.get(c.id)]++; });
  const activeFilter = ['all', 'inquiry', 'active-customer', 'lost'].includes(window.__clientFilterStage)
    ? window.__clientFilterStage : 'all';

  if (chipsWrap) {
    const filterDefs = [
      {key: 'all', label: 'client_filter_all'},
      {key: 'inquiry', label: 'client_filter_inquiry'},
      {key: 'active-customer', label: 'client_filter_active'},
      {key: 'lost', label: 'client_filter_lost'},
    ];
    chipsWrap.innerHTML = filterDefs.map(f => {
      const isActive = f.key === activeFilter;
      return `<button type="button" class="pl-chip${isActive ? ' active' : ''}" onclick="selectClientFilterStage('${f.key}')" aria-current="${isActive ? 'true' : 'false'}">
        <span>${htmlEsc(t(f.label))}</span>
        <span class="pl-chip-count">${counts[f.key]}</span>
      </button>`;
    }).join('');
  }

  const listFiltered = activeFilter === 'all' ? searchFiltered : searchFiltered.filter(c => stageOf.get(c.id) === activeFilter);
  const STAGE_PILL = {
    'active-customer': {cls: 'stage-pill-active', label: 'client_stage_active'},
    inquiry: {cls: 'stage-pill-inquiry', label: 'client_stage_inquiry'},
    lost: {cls: 'stage-pill-lost', label: 'client_stage_lost'},
  };
  const listHtml = listFiltered.length
    ? listFiltered.map(c => {
      const rest = c.company || c.phone || c.email || '';
      const idBits = (c.memberNo ? `<span class="tnum">${htmlEsc(c.memberNo)}</span>` : '') + (c.memberNo && rest ? ' · ' : '') + htmlEsc(rest);
      const stage = stageOf.get(c.id);
      const pillMeta = STAGE_PILL[stage] || STAGE_PILL.inquiry;
      const prospect = clientProspectService(c);
      const sub = (idBits ? idBits + ' · ' : '') + htmlEsc(prospect) + ` <span class="stage-pill ${pillMeta.cls}">${htmlEsc(t(pillMeta.label))}</span>`;
      const pkg = activePackageFor(c.id);
      const pkgBadge = pkg
        ? `<span class="pkg-badge">${pkg.serviceId != null ? htmlEsc(packageDisplayName(pkg)) + ' · ' : ''}${packageRemaining(pkg)}/${htmlEsc(pkg.totalSessions)} left</span>` : '';
      return `<div class="list-row" onclick="openEditCustomer(${c.id})">
        <div class="list-icon">👤</div>
        <div class="list-main">
          <div class="list-title">${htmlEsc(c.name)}</div>
          <div class="list-sub">${sub}</div>
        </div>
        <div class="list-right">
          ${pkgBadge}
          <button type="button" class="qc-btn" title="Quick check-in" aria-label="Quick check-in for ${attrEsc(c.name)}" onclick="event.stopPropagation(); quickCheckIn(${c.id})">⚡</button>
          <span style="color:var(--text3);font-size:18px">›</span>
        </div>
      </div>`;
    }).join('')
    : `<div class="list-row" style="cursor:default"><div class="list-main"><div class="list-sub">${htmlEsc(t('no_customers_sub'))}</div></div></div>`;
  wrap.innerHTML = attentionHtml + '<div class="list-card">' + listHtml + '</div>';
}
function renderIntakeFields(c) {
  const wrap = document.getElementById('cust-intake');
  if (!wrap) return;
  wrap.innerHTML = intakeFields().map(f =>
    `<div class="field"><label for="ci-${f.id}">${htmlEsc(t(f.key))}</label>
      <input type="text" id="ci-${f.id}" value="${attrEsc(c[f.id] || '')}"></div>`).join('');
}

// ─── SESSION PACKAGES — shown within the Customer modal (edit mode only) ──
window.__pkgFormOpen = false;
// A package's own name for display: the linked service's name when it has
// one (TSK-024 — packages created from booking a package-type service in
// Task flow, or manually linked via the "+Add package" form's service
// picker, carry serviceId), falling back to the generic unit label for
// older/unlinked packages so nothing regresses for existing data.
function packageDisplayName(pkg) {
  const svc = pkg && pkg.serviceId != null ? services.find(s => s.id === pkg.serviceId) : null;
  return svc ? svc.name : packageUnitLabel();
}
function renderCustomerPackages(clientId) {
  const wrap = document.getElementById('cust-package-body');
  if (!wrap) return;
  const list = clientPackages(clientId);
  const unit = packageUnitLabel();
  let html = '';
  // TSK-024: a client can hold multiple independently-tracked packages at
  // once now that a package can be linked to a specific service (e.g.
  // "1-on-1 training" 9/10 and "Nutrition consult" 3/5 both active) — list
  // every package, each tagged with its own service name, instead of
  // collapsing down to a single "most recent" summary that hid the rest.
  if (!list.length) {
    html += `<div class="pkg-status"><span>${htmlEsc(t('no_package_yet'))}</span></div>`;
  } else {
    html += '<div class="list-card">' + list.map(p => {
      const rem = packageRemaining(p);
      const pct = p.totalSessions > 0 ? Math.round((rem / p.totalSessions) * 100) : 0;
      const rawRemaining = packageRemainingIgnoringExpiry(p);
      const expSub = p.expiresAt ? ` · ${htmlEsc(t('expires_label'))} ${htmlEsc(fmtDate(p.expiresAt))}` : '';
      let statusSub;
      if (rem > 0) {
        statusSub = `${htmlEsc(t('purchased_label'))} ${htmlEsc(fmtDate(p.purchasedDate))}${expSub}`;
      } else if (packageIsExpired(p) && rawRemaining > 0) {
        statusSub = htmlEsc(t('package_expired_forfeited').replace('{date}', fmtDate(p.expiresAt)).replace('{n}', rawRemaining).replace('{unit}', unit));
      } else {
        statusSub = htmlEsc(t('no_units_left').replace('{unit}', unit));
      }
      return `<div class="list-row" style="cursor:default">
          <div class="list-main"><div class="list-title">${htmlEsc(packageDisplayName(p))}</div>
          <div class="list-sub">${statusSub}</div>
          <div class="pkg-status-track" style="margin-top:6px"><div class="pkg-status-fill" style="width:${pct}%"></div></div></div>
          <div class="list-right"><span class="list-amt tnum">${rem}/${htmlEsc(p.totalSessions)} ${htmlEsc(t('left_label'))}</span></div>
        </div>`;
    }).join('') + '</div>';
  }
  const activeAny = activePackageFor(clientId);
  const pkgServiceOptions = services.filter(s => !svcIsProduct(s) && Number(s.usageQty) > 1);
  html += window.__pkgFormOpen ? `
      ${pkgServiceOptions.length ? `<div class="field" style="margin-top:10px">
        <label for="pkg-service">${htmlEsc(t('pkg_service_label'))}</label>
        <select id="pkg-service" onchange="onPkgServiceChange(this.value)">
          <option value="">${htmlEsc(t('pkg_service_none'))}</option>
          ${pkgServiceOptions.map(s => `<option value="${s.id}">${htmlEsc(s.name)}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="form-row" style="margin-top:10px">
        <div class="field-half"><label for="pkg-total">${htmlEsc(unit)}</label><input type="number" id="pkg-total" class="tnum" inputmode="numeric" min="1" placeholder="10"></div>
        <div class="field-half"><label for="pkg-price">${htmlEsc(t('field_price'))}</label><input type="number" id="pkg-price" class="tnum" inputmode="decimal" min="0" placeholder="0"></div>
      </div>
      <div class="form-row">
        <div class="field-half"><label for="pkg-date">${htmlEsc(t('purchased_label'))}</label><input type="date" id="pkg-date"></div>
        <div class="field-half"><label for="pkg-expires">${htmlEsc(t('expires_label'))}</label><input type="date" id="pkg-expires" placeholder="${attrEsc(t('expires_ph'))}"></div>
      </div>
      <button type="button" class="btn-submit" style="margin-top:6px" onclick="savePackage(${clientId})">${htmlEsc(t('save_package'))}</button>
    ` : `<button type="button" class="btn-submit" style="margin-top:10px" onclick="togglePackageForm(true, ${clientId})">${activeAny ? htmlEsc(t('renew_package')) : htmlEsc(t('new_package'))}</button>`;
  wrap.innerHTML = html;
  if (window.__pkgFormOpen) {
    const dateEl = document.getElementById('pkg-date');
    if (dateEl && !dateEl.value) dateEl.value = todayISO();
  }
}
function togglePackageForm(open, clientId) {
  window.__pkgFormOpen = open;
  renderCustomerPackages(clientId);
}
window.togglePackageForm = togglePackageForm;
// Prefills the total/price fields from the chosen service's own package
// numbers (usageQty/rate) — "pick a template, don't retype it."
function onPkgServiceChange(v) {
  if (!v) return;
  const s = services.find(x => x.id === parseInt(v));
  if (!s) return;
  const totalEl = document.getElementById('pkg-total');
  const priceEl = document.getElementById('pkg-price');
  if (totalEl) totalEl.value = s.usageQty > 0 ? s.usageQty : 1;
  if (priceEl) priceEl.value = s.rate || 0;
}
window.onPkgServiceChange = onPkgServiceChange;
async function savePackage(clientId) {
  const total = parseInt(document.getElementById('pkg-total').value) || 0;
  const price = parseFloat(document.getElementById('pkg-price').value) || 0;
  const date = document.getElementById('pkg-date').value || todayISO();
  const expiresEl = document.getElementById('pkg-expires');
  const expiresAt = (expiresEl && expiresEl.value) || null;
  const svcEl = document.getElementById('pkg-service');
  const serviceId = (svcEl && svcEl.value) ? parseInt(svcEl.value) : null;
  if (total <= 0) { toast(t('enter_package_total').replace('{unit}', packageUnitLabel())); return; }
  if (expiresAt && expiresAt < date) { toast(t('expiry_before_purchase')); return; }
  const uid = isGuest ? 'guest' : currentUser.id;
  const obj = { uid, clientId, serviceId, totalSessions: total, price, purchasedDate: date, expiresAt, notes: '', cuid: cuid(), updatedAt: nowISO() };
  await dbAdd('packages', obj);
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorPackageSave(obj).catch(() => {});
  }
  window.__pkgFormOpen = false;
  await reload();
  renderCustomerPackages(clientId);
  toast(t('package_saved'));
}
window.savePackage = savePackage;

// ─── PROGRESS LOG — weight/notes over time, shown within the Customer modal ──
window.__progressFormOpen = false;
async function renderCustomerProgress(clientId) {
  const wrap = document.getElementById('cust-progress-body');
  if (!wrap) return;
  const uid = isGuest ? 'guest' : currentUser.id;
  const entries = (await dbAll('progressLogs')).filter(p => p.uid === uid && p.clientId === clientId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0));
  let html = '';
  if (!entries.length) {
    html += `<div class="pkg-status"><span>No entries yet.</span></div>`;
  } else {
    html += '<div class="list-card">' + entries.map((e, i) => {
      const prev = entries[i + 1];
      let delta = '';
      if (prev && e.weight != null && prev.weight != null) {
        const d = Number(e.weight) - Number(prev.weight);
        if (d !== 0) delta = ` <span class="${d > 0 ? 'progress-up' : 'progress-down'}">(${d > 0 ? '+' : ''}${fmt(d, 1)})</span>`;
      }
      return `<div class="list-row" style="cursor:default">
          <div class="list-main"><div class="list-title">${e.weight != null ? htmlEsc(fmt(e.weight, 1)) + ' kg' + delta : htmlEsc(fmtDate(e.date))}</div>
          <div class="list-sub">${e.weight != null ? htmlEsc(fmtDate(e.date)) + (e.notes ? ' · ' + htmlEsc(e.notes) : '') : htmlEsc(e.notes || '')}</div></div>
          <div class="list-right"><button type="button" class="qc-btn" aria-label="Delete entry" onclick="deleteProgressEntry(${e.id}, ${clientId})">✕</button></div>
        </div>`;
    }).join('') + '</div>';
  }
  html += window.__progressFormOpen ? `
      <div class="form-row" style="margin-top:10px">
        <div class="field-half"><label for="pl-date">Date</label><input type="date" id="pl-date"></div>
        <div class="field-half"><label for="pl-weight">Weight (kg)</label><input type="number" id="pl-weight" class="tnum" inputmode="decimal" min="0" step="0.1" placeholder="0"></div>
      </div>
      <div class="field"><label for="pl-notes">Notes</label><input type="text" id="pl-notes" placeholder="e.g. chest 96cm, waist 82cm"></div>
      <button type="button" class="btn-submit" style="margin-top:6px" onclick="saveProgressEntry(${clientId})">Save entry</button>
    ` : `<button type="button" class="btn-submit" style="margin-top:10px" onclick="toggleProgressForm(true, ${clientId})">+ Add entry</button>`;
  wrap.innerHTML = html;
  if (window.__progressFormOpen) {
    const dateEl = document.getElementById('pl-date');
    if (dateEl && !dateEl.value) dateEl.value = todayISO();
  }
}
function toggleProgressForm(open, clientId) {
  window.__progressFormOpen = open;
  renderCustomerProgress(clientId);
}
window.toggleProgressForm = toggleProgressForm;

// ─── CLIENT PERSONA TRACKER (redesign handoff, non-trainer business types) ──
// Trainer keeps its existing package + progress-log sections above (real,
// established features) — this is the registry for the other four. A
// deliberately lean first pass: a handful of auto-saving fields directly on
// the client record, not the full richness the design brief describes (a
// structured viewing log with verdicts, a real multi-policy list, full
// service history) — those are each their own small CRUD system, and
// building four of them in one pass wasn't realistic alongside everything
// else in this redesign. Real and useful, just simpler than the ideal.
async function saveClientField(clientId, field, value) {
  const c = customers.find(x => x.id === clientId);
  if (!c) return;
  c[field] = value;
  c.updatedAt = nowISO();
  await dbPut('clients', c);
}
window.saveClientField = saveClientField;

const PERSONA_TRACKER_TITLES = {
  trainer: 'tracker_mealplan_title',
  realestate: 'tracker_deal_title',
  laundry: 'tracker_order_title',
  insurance: 'tracker_policy_title',
  garage: 'tracker_vehicle_title',
};
// Generic list CRUD shared by every persona tracker's repeatable rows (meal
// plan, viewing log, service history) — each item just an object with its
// own cuid(), stored as an array field directly on the client record (no
// new IndexedDB store).
function addClientListItem(clientId, field, item) {
  const c = customers.find(x => x.id === clientId);
  if (!c) return;
  c[field] = c[field] || [];
  c[field].push({ id: cuid(), ...item });
  c.updatedAt = nowISO();
  return dbPut('clients', c).then(() => renderClientPersonaTracker(clientId));
}
window.addClientListItem = addClientListItem;
function deleteClientListItem(clientId, field, itemId) {
  const c = customers.find(x => x.id === clientId);
  if (!c) return;
  c[field] = (c[field] || []).filter(r => r.id !== itemId);
  c.updatedAt = nowISO();
  return dbPut('clients', c).then(() => renderClientPersonaTracker(clientId));
}
window.deleteClientListItem = deleteClientListItem;
// In-place edit of one field on one item within a client-list array (e.g. a
// single vehicle's plate/mileage) — the array-item counterpart to
// saveClientField() above, which only handles flat top-level client fields.
function saveClientListItemField(clientId, field, itemId, key, value) {
  const c = customers.find(x => x.id === clientId);
  if (!c) return;
  const item = (c[field] || []).find(r => r.id === itemId);
  if (!item) return;
  item[key] = value;
  c.updatedAt = nowISO();
  return dbPut('clients', c);
}
window.saveClientListItemField = saveClientListItemField;

function addMealPlanRow(clientId) {
  const input = document.getElementById('meal-plan-new-' + clientId);
  const text = ((input && input.value) || '').trim();
  if (!text) return;
  addClientListItem(clientId, 'mealPlan', { text });
  if (input) input.value = '';
}
window.addMealPlanRow = addMealPlanRow;

// addDealViewing/deleteDealViewing/addViewingRowToDeal (the deal-scoped
// viewing-log CRUD) and VIEWING_VERDICTS were removed in M4-P3 Merge 2 along
// with the deals CRUD UI that was their only caller — see
// migrateClientDealsToOptions below for where deal.viewings[] now goes
// instead (a future-dated viewing becomes a real dated step + booking).

function addServiceHistoryRow(clientId) {
  const date = (document.getElementById('svc-date-' + clientId) || {}).value || '';
  const noteEl = document.getElementById('svc-note-' + clientId);
  const note = ((noteEl && noteEl.value) || '').trim();
  if (!note) return;
  const vehicleEl = document.getElementById('svc-vehicle-' + clientId);
  const vehicleId = (vehicleEl && vehicleEl.value) || null;
  addClientListItem(clientId, 'serviceHistory', { date, note, vehicleId });
  if (noteEl) noteEl.value = '';
}
window.addServiceHistoryRow = addServiceHistoryRow;

// Sum of what a garage client has actually paid (amount+tip on jobs marked
// paid — TSK-014: jobEarned() is now a plain job.paid flag rather than a
// stage-index comparison, so this just calls it) — a computed display
// stat, not stored, so it always reflects the live job list.
function clientLifetimeSpend(clientId) {
  return jobs
    .filter(j => j.clientId === clientId && jobEarned(j))
    .reduce((s, j) => s + (Number(j.amount) || 0) + (Number(j.tip) || 0), 0);
}

function listRowsHtml(rows, clientId, field, lineFn) {
  if (!rows || !rows.length) return '';
  return '<div class="list-card" style="margin-bottom:8px">' + rows.map(r => `
      <div class="list-row" style="cursor:default">
        <div class="list-main">${lineFn(r)}</div>
        <div class="list-right"><button type="button" class="qc-btn" aria-label="Delete" onclick="deleteClientListItem(${clientId},'${field}','${r.id}')">✕</button></div>
      </div>`).join('') + '</div>';
}

// One-time, non-destructive: pre-deal-pipeline real estate clients had a flat
// searchBrief/offerStatus/estCommission per client plus one undifferentiated
// viewings[] log (no notion of which property a viewing was for, or where
// the deal stood). Folds them into a single deal[0] the first time this
// client's tracker renders: offerStatus becomes the deal's free-text notes
// (it was already free text, e.g. "Offer submitted, awaiting reply" — not a
// stage enum, so it can't map onto a fixed stage list automatically), estCommission
// becomes the deal's commission, and every existing viewing carries over
// as-is (its own `property` field dropped only going forward — see the
// render side below). searchBrief stays flat: it's the client's general
// search criteria, not any one deal's.
function migrateRealEstateDealsIfNeeded(c) {
  if (Array.isArray(c.deals)) return c.deals;
  const hadFlatFields = c.offerStatus || c.estCommission || (c.viewings && c.viewings.length);
  c.deals = hadFlatFields
    ? [{ id: cuid(), property: '', stage: 'searching', commission: c.estCommission || 0, notes: c.offerStatus || '', viewings: c.viewings || [] }]
    : [];
  delete c.offerStatus; delete c.estCommission; delete c.viewings;
  dbPut('clients', c);
  return c.deals;
}
// ── deals[] → job options[] (M4-P3 Merge 2) ─────────────────────────────
// One-time, non-destructive fold of a realestate client's dormant deals[]
// pipeline into option rows on ONE of that client's own jobs — the same
// options[]/subTasks[] machinery every other persona already gets via
// "Options compared" (renderJobOptions above), rather than a bespoke
// deals CRUD living only on the client record. deals[] itself is NEVER
// mutated or cleared here — it stays exactly as it was, dormant rollback
// data — guarded by c.dealsMigratedAt (stamped once, checked first) plus
// an in-memory in-flight set so re-rendering the client modal quickly
// (e.g. reopening it) can never run this twice or race itself into two
// jobs / duplicate options.
const DEAL_STAGE_TO_OPTION_STATUS = {
  searching: 'viewing', viewing: 'viewing',
  offer: 'interested', negotiating: 'interested',
  closing: 'chosen', closed: 'chosen',
};
const _dealsMigrationInFlight = new Set();
async function migrateClientDealsToOptions(clientId) {
  const c = customers.find(x => x.id === clientId);
  if (!c) return;
  const deals = migrateRealEstateDealsIfNeeded(c);
  if (!deals.length || c.dealsMigratedAt || _dealsMigrationInFlight.has(clientId)) return;
  _dealsMigrationInFlight.add(clientId);
  try {
    // Prefer the client's own most recent still-open job (jobs is already
    // date-descending — see reload()); only spin up a fresh one, mirroring
    // the shape createLocalJobFromOrderRequest builds, when nothing's open.
    let job = jobs.find(j => j.clientId === clientId && !jobComplete(j));
    let isNewJob = false;
    if (!job) {
      isNewJob = true;
      job = {
        uid: c.uid, date: todayISO(), client: c.name, clientId: c.id,
        serviceId: null, serviceName: t('deal_search_service'),
        jobType: settings.workType || '',
        amount: 0, tip: 0, expense: 0, count: 1, notes: '', netAmount: 0,
        cuid: cuid(), stageOrder: getStageOrder().slice(), stage: getStageOrder()[0], complete: false,
        invoiceId: null, quoteDocId: null, packageId: null,
        subTasks: [], milestones: [], timeEntries: [], timerStartedAt: null,
        outcome: null, lostReason: null, options: [], items: [],
        createdAt: nowISO(), updatedAt: nowISO(),
      };
    }
    job.options = job.options || [];
    job.subTasks = job.subTasks || [];
    const today = todayISO();
    for (const deal of deals) {
      const status = DEAL_STAGE_TO_OPTION_STATUS[deal.stage] || 'considering';
      const notes = [deal.notes, deal.commission ? ('commission ' + money(deal.commission)) : ''].filter(Boolean).join(' · ');
      job.options.push({ id: cuid(), name: deal.property, status, notes });
      // Only a FUTURE viewing becomes a real dated step + calendar booking —
      // a past one is just history the deal's own record already carries.
      for (const v of (deal.viewings || [])) {
        if (v.date && v.date > today) {
          const st = { id: cuid(), text: t('deal_viewing_step').replace('{name}', deal.property),
            done: false, dateType: 'exact', date: v.date, startTime: v.startTime || '09:00',
            bookingCuid: null, stage: null, repeatOfId: null };
          job.subTasks.push(st);
          await createBookingForStep(job, st);
        }
      }
    }
    job.updatedAt = nowISO();
    if (isNewJob) { const key = await dbAdd('jobs', job); job.id = key; }
    else await dbPut('jobs', job);
    mirrorJob(job);
    c.dealsMigratedAt = nowISO();
    c.updatedAt = c.dealsMigratedAt;
    await dbPut('clients', c);
    if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
      SidekickBackend.mirrorClientSave(c).catch(() => {});
    }
    await reload();
  } finally {
    _dealsMigrationInFlight.delete(clientId);
  }
}
// Read-through "Open engagement →" link (client modal's Properties-in-play
// section) — jumps straight to the job carrying that option.
function openClientEngagement(clientId, jobId) {
  closeCustomerModal();
  openEditJob(jobId);
}
window.openClientEngagement = openClientEngagement;
// One-time, non-destructive: pre-multi-policy insurance clients had one flat
// policyName/policyRenewalDate per client (no second policy possible).
// Folds them into policies[0] the first time this client's tracker renders,
// then drops the flat fields so they can never drift out of sync with the
// new array — same treatment as migrateGarageVehiclesIfNeeded() below.
function migrateInsurancePoliciesIfNeeded(c) {
  if (Array.isArray(c.policies)) return c.policies;
  const hadFlatFields = c.policyName || c.policyRenewalDate;
  c.policies = hadFlatFields
    ? [{ id: cuid(), name: c.policyName || '', renewalDate: c.policyRenewalDate || '' }]
    : [];
  delete c.policyName; delete c.policyRenewalDate;
  dbPut('clients', c);
  return c.policies;
}
// One-time, non-destructive: pre-multi-vehicle garage clients had one flat
// vehiclePlate/vehicleMileage/nextServiceDate per client instead of a
// vehicles[] array. Folds them into vehicles[0] the first time this
// client's tracker renders, then drops the flat fields so they can never
// drift out of sync with the new array.
function migrateGarageVehiclesIfNeeded(c) {
  if (Array.isArray(c.vehicles)) return c.vehicles;
  const hadFlatFields = c.vehiclePlate || c.vehicleMileage || c.nextServiceDate;
  c.vehicles = hadFlatFields
    ? [{ id: cuid(), plate: c.vehiclePlate || '', mileage: c.vehicleMileage || 0, nextServiceDate: c.nextServiceDate || '' }]
    : [];
  delete c.vehiclePlate; delete c.vehicleMileage; delete c.nextServiceDate;
  dbPut('clients', c);
  return c.vehicles;
}
// One-time, non-destructive: pre-order-history laundry clients had one live
// orderStatus scalar and no history at all. Folds it into a single active
// order the first time this client's tracker renders, then drops the flat
// field so it can never drift out of sync with the new array.
function migrateLaundryOrdersIfNeeded(c) {
  if (Array.isArray(c.orders)) return c.orders;
  c.orders = c.orderStatus
    ? [{ id: cuid(), date: '', kg: 0, status: c.orderStatus, notes: '' }]
    : [];
  delete c.orderStatus;
  dbPut('clients', c);
  return c.orders;
}
// Closes out the current active order into history — a dedicated function
// (not an inline saveClientListItemField() call) because, unlike every
// other field edit on an order, this one needs the tracker to actually
// re-render: the "current order" editor disappears and the order moves
// into the read-only history list below it.
async function completeLaundryOrder(clientId, orderId) {
  await saveClientListItemField(clientId, 'orders', orderId, 'status', 'completed');
  renderClientPersonaTracker(clientId);
}
window.completeLaundryOrder = completeLaundryOrder;
function renderClientPersonaTracker(clientId) {
  const wrap = document.getElementById('cust-persona-body');
  const titleEl = document.getElementById('cust-persona-title');
  if (!wrap) return;
  const c = customers.find(x => x.id === clientId);
  if (!c) return;
  const bt = businessType();
  if (titleEl) titleEl.textContent = PERSONA_TRACKER_TITLES[bt] ? t(PERSONA_TRACKER_TITLES[bt]) : '';

  if (bt === 'trainer') {
    const rows = c.mealPlan || [];
    wrap.innerHTML = `
      ${listRowsHtml(rows, clientId, 'mealPlan', r => `<div class="list-title">${htmlEsc(r.text)}</div>`) || `<div class="pkg-status"><span>${htmlEsc(t('no_meal_plan_rows'))}</span></div>`}
      <div class="form-row" style="margin-top:8px">
        <input type="text" id="meal-plan-new-${clientId}" placeholder="${attrEsc(t('meal_plan_add_ph'))}" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);font-family:inherit;font-size:14px">
        <button type="button" class="qc-btn" style="width:auto;padding:0 14px" onclick="addMealPlanRow(${clientId})">${htmlEsc(t('btn_add'))}</button>
      </div>
    `;
  } else if (bt === 'realestate') {
    // M4-P3 Merge 2: the old deals CRUD (property/stage/commission/viewing
    // log editors) is gone — deals[] now migrates once into option rows on
    // one of this client's own jobs (migrateClientDealsToOptions above) and
    // this section becomes a read-through of THOSE options, reusing the
    // same "Options compared" machinery every other persona already has.
    const deals = migrateRealEstateDealsIfNeeded(c);
    if (deals.length && !c.dealsMigratedAt && !_dealsMigrationInFlight.has(clientId)) {
      migrateClientDealsToOptions(clientId).then(() => renderClientPersonaTracker(clientId));
    }
    const jobsWithOptions = jobs.filter(j => j.clientId === clientId && !jobComplete(j) && (j.options || []).length);
    const optionsHtml = jobsWithOptions.map(j => `
        <div class="list-card" style="margin-bottom:8px">
          ${(j.options || []).map(o => `
            <div class="list-row" style="cursor:default">
              <div class="list-main"><div class="list-title">${htmlEsc(o.name)}</div><div class="list-sub">${htmlEsc(t('option_status_' + o.status))}</div></div>
            </div>`).join('')}
          <button type="button" class="qc-btn" style="width:100%" onclick="openClientEngagement(${clientId},${j.id})">${htmlEsc(t('open_engagement_link'))}</button>
        </div>`).join('');
    wrap.innerHTML = `
      <div class="field"><label>${htmlEsc(t('field_search_brief'))}</label><textarea rows="2" onchange="saveClientField(${clientId},'searchBrief',this.value)">${htmlEsc(c.searchBrief || '')}</textarea></div>
      <div class="section-title" style="font-size:12px;margin:14px 0 8px">${htmlEsc(t('client_options_title'))}</div>
      ${jobsWithOptions.length ? optionsHtml : `<div class="pkg-status"><span>${htmlEsc(t('options_none'))}</span></div>`}
    `;
  } else if (bt === 'laundry') {
    const orders = migrateLaundryOrdersIfNeeded(c);
    const steps = ['received', 'washing', 'drying', 'ready'];
    const active = orders.find(o => o.status !== 'completed');
    const history = orders.filter(o => o.status === 'completed').slice().reverse();
    wrap.innerHTML = `
      <div class="section-title" style="font-size:12px;margin:0 0 8px">${htmlEsc(t('current_order_title'))}</div>
      ${active ? `
        <div class="pkg-status">
          <div class="field"><label>${htmlEsc(t('field_order_status'))}</label><select onchange="saveClientListItemField(${clientId},'orders','${active.id}','status',this.value)">
            ${steps.map(s => `<option value="${s}"${s === active.status ? ' selected' : ''}>${htmlEsc(t('order_step_' + s))}</option>`).join('')}
          </select></div>
          <div class="field"><label>${htmlEsc(t('field_order_date'))}</label><input type="date" value="${attrEsc(active.date || '')}" onchange="saveClientListItemField(${clientId},'orders','${active.id}','date',this.value)"></div>
          <div class="field"><label>${htmlEsc(t('field_order_kg'))}</label><input type="number" class="tnum" inputmode="decimal" min="0" value="${active.kg || ''}" onchange="saveClientListItemField(${clientId},'orders','${active.id}','kg',parseFloat(this.value)||0)"></div>
          <div class="field"><label>${htmlEsc(t('field_order_notes'))}</label><textarea rows="2" onchange="saveClientListItemField(${clientId},'orders','${active.id}','notes',this.value)">${htmlEsc(active.notes || '')}</textarea></div>
        </div>
        <button type="button" class="qc-btn" style="width:100%;margin-top:8px" onclick="completeLaundryOrder(${clientId},'${active.id}')">${htmlEsc(t('mark_picked_up_btn'))}</button>
      ` : `
        <div class="pkg-status"><span>${htmlEsc(t('no_active_order'))}</span></div>
        <button type="button" class="qc-btn" style="width:100%;margin-top:8px" onclick="addClientListItem(${clientId},'orders',{date:todayISO(),kg:0,status:'received',notes:''})">${htmlEsc(t('start_new_order_btn'))}</button>
      `}
      <div class="field" style="margin-top:14px"><label>${htmlEsc(t('field_monthly_kg_plan'))}</label><input type="number" class="tnum" inputmode="decimal" min="0" value="${c.monthlyKgPlan || ''}" onchange="saveClientField(${clientId},'monthlyKgPlan',parseFloat(this.value)||0)"></div>
      <div class="field"><label>${htmlEsc(t('field_preferences'))}</label><textarea rows="2" onchange="saveClientField(${clientId},'preferences',this.value)">${htmlEsc(c.preferences || '')}</textarea></div>
      <div class="section-title" style="font-size:12px;margin:14px 0 8px">${htmlEsc(t('order_history_title'))}</div>
      ${listRowsHtml(history, clientId, 'orders', r => `<div class="list-title">${htmlEsc(fmt(r.kg, 1))} kg</div><div class="list-sub">${[r.date ? htmlEsc(fmtDate(r.date)) : '', htmlEsc(r.notes || '')].filter(Boolean).join(' · ')}</div>`) || `<div class="pkg-status"><span>${htmlEsc(t('no_order_history'))}</span></div>`}
    `;
  } else if (bt === 'insurance') {
    const policies = migrateInsurancePoliciesIfNeeded(c);
    const countdownHtml = p => {
      if (!p.renewalDate) return '';
      const days = daysSinceISO(p.renewalDate);
      return days > 0
        ? `<div class="pkg-status"><span style="color:var(--overdue)">${days} ${days === 1 ? t('day_singular') : t('day_plural')} ${t('overdue_for_renewal')}</span></div>`
        : `<div class="pkg-status"><span>${-days} ${-days === 1 ? t('day_singular') : t('day_plural')} ${t('until_renewal')}</span></div>`;
    };
    wrap.innerHTML = `
      <div class="section-title" style="font-size:12px;margin:0 0 8px">${htmlEsc(t('policies_title'))}</div>
      ${policies.length ? policies.map(p => `
        <div class="list-card" style="margin-bottom:8px;padding:10px 14px">
          <div class="field"><label>${htmlEsc(t('field_policy_name'))}</label><input type="text" value="${attrEsc(p.name || '')}" onchange="saveClientListItemField(${clientId},'policies','${p.id}','name',this.value)"></div>
          <div class="field"><label>${htmlEsc(t('field_renewal_date'))}</label><input type="date" value="${attrEsc(p.renewalDate || '')}" onchange="saveClientListItemField(${clientId},'policies','${p.id}','renewalDate',this.value)"></div>
          ${countdownHtml(p)}
          <button type="button" class="qc-btn" style="width:100%;margin-top:6px;color:var(--overdue)" onclick="deleteClientListItem(${clientId},'policies','${p.id}')">${htmlEsc(t('delete_policy_btn'))}</button>
        </div>
      `).join('') : `<div class="pkg-status"><span>${htmlEsc(t('no_policies'))}</span></div>`}
      <button type="button" class="qc-btn" style="width:100%;margin-bottom:14px" onclick="addClientListItem(${clientId},'policies',{name:'',renewalDate:''})">${htmlEsc(t('add_policy_btn'))}</button>

      <div class="field"><label>${htmlEsc(t('field_birthday'))}</label><input type="date" value="${attrEsc(c.birthday || '')}" onchange="saveClientField(${clientId},'birthday',this.value)"></div>
      <div class="field"><label>${htmlEsc(t('field_referred_by'))}</label><input type="text" value="${attrEsc(c.referredBy || '')}" onchange="saveClientField(${clientId},'referredBy',this.value)"></div>
    `;
  } else if (bt === 'garage') {
    const vehicles = migrateGarageVehiclesIfNeeded(c);
    const rows = (c.serviceHistory || []).slice().reverse();
    const spend = clientLifetimeSpend(clientId);
    const vehicleLabel = v => v.plate || t('unnamed_vehicle');
    wrap.innerHTML = `
      <div class="section-title" style="font-size:12px;margin:0 0 8px">${htmlEsc(t('vehicles_title'))}</div>
      ${vehicles.length ? vehicles.map(v => `
        <div class="list-card" style="margin-bottom:8px;padding:10px 14px">
          <div class="form-row">
            <div class="field-half"><label>${htmlEsc(t('field_plate'))}</label><input type="text" value="${attrEsc(v.plate || '')}" onchange="saveClientListItemField(${clientId},'vehicles','${v.id}','plate',this.value)"></div>
            <div class="field-half"><label>${htmlEsc(t('field_mileage'))}</label><input type="number" class="tnum" inputmode="decimal" min="0" value="${v.mileage || ''}" onchange="saveClientListItemField(${clientId},'vehicles','${v.id}','mileage',parseFloat(this.value)||0)"></div>
          </div>
          <div class="field"><label>${htmlEsc(t('field_next_service_due'))}</label><input type="date" value="${attrEsc(v.nextServiceDate || '')}" onchange="saveClientListItemField(${clientId},'vehicles','${v.id}','nextServiceDate',this.value)"></div>
          <button type="button" class="qc-btn" style="width:100%;margin-top:6px;color:var(--overdue)" onclick="deleteClientListItem(${clientId},'vehicles','${v.id}')">${htmlEsc(t('delete_vehicle_btn'))}</button>
        </div>
      `).join('') : `<div class="pkg-status"><span>${htmlEsc(t('no_vehicles'))}</span></div>`}
      <button type="button" class="qc-btn" style="width:100%;margin-bottom:14px" onclick="addClientListItem(${clientId},'vehicles',{plate:'',mileage:0,nextServiceDate:''})">${htmlEsc(t('add_vehicle_btn'))}</button>

      <div class="pkg-status-row"><span>${htmlEsc(t('lifetime_spend_label'))}</span><span class="tnum">${htmlEsc(money(spend))}</span></div>
      <div class="section-title" style="font-size:12px;margin:14px 0 8px">${htmlEsc(t('service_history_title'))}</div>
      ${listRowsHtml(rows, clientId, 'serviceHistory', r => {
        const v = vehicles.find(x => x.id === r.vehicleId);
        const sub = [v ? vehicleLabel(v) : '', r.date ? fmtDate(r.date) : ''].filter(Boolean).join(' · ');
        return `<div class="list-title">${htmlEsc(r.note)}</div>${sub ? `<div class="list-sub">${htmlEsc(sub)}</div>` : ''}`;
      }) || `<div class="pkg-status"><span>${htmlEsc(t('no_service_history'))}</span></div>`}
      ${vehicles.length ? `<div class="form-row" style="margin-top:8px">
        <select id="svc-vehicle-${clientId}" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);font-family:inherit;font-size:14px">
          <option value="">${htmlEsc(t('svc_vehicle_none_option'))}</option>
          ${vehicles.map(v => `<option value="${v.id}">${htmlEsc(vehicleLabel(v))}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="form-row" style="margin-top:8px">
        <input type="date" id="svc-date-${clientId}" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);font-family:inherit;font-size:14px">
      </div>
      <div class="form-row" style="margin-top:8px">
        <input type="text" id="svc-note-${clientId}" placeholder="${attrEsc(t('field_service_note'))}" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);font-family:inherit;font-size:14px">
        <button type="button" class="qc-btn" style="width:auto;padding:0 14px" onclick="addServiceHistoryRow(${clientId})">${htmlEsc(t('btn_add'))}</button>
      </div>
    `;
  } else {
    wrap.innerHTML = '';
  }
}

// ─── OPTIONS COMPARED, MILESTONES (redesign handoff, client-side) ──────
// Both live directly on the job record (options[]/milestones[]) — no new
// IndexedDB store, matching "no backend needed" per the handoff's
// BACKEND-REQUIREMENTS.md. The 6-stage Task flow stays the spine; these
// live inside a job's own edit modal, never as extra columns. TSK-023
// removed Items on this engagement and Time tracking (+ Focus mode) —
// each was its own self-contained feature with no other entry point.
function renderJobTracking(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  renderJobOptions(jobId);
  renderMilestones(jobId);
}

// TSK-008: keeps each drill row's "· N" count in sync with the underlying
// job record. Called from the tail of each render*() function above (not
// just renderJobTracking) so every mutation path — whether it re-renders
// just its own section (addJobOption etc.) or the whole tracking block —
// updates the count too.
// #job-options-title itself is left untouched (persona-dependent text,
// compared for exact equality by tests/check-options-lost.js); the count
// lives in the separate sibling span next to it.
function updateJobDrillSummaries(jobId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const setCount = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text ? ` · ${text}` : ''; };
  setCount('job-options-count', (j.options || []).length || '');
  // TSK-018 part 2: Plan & payments dropped its sub-task listing (see
  // job-plan-details in index.html) — its count is milestones-only now.
  // job.subTasks[] itself still exists for Options compared's booked
  // viewings, but those show under Options compared's own count instead.
  const miles = (j.milestones || []).length;
  setCount('job-plan-count', miles ? `${miles} ${t('drill_milestones_unit')}` : '');
}

// TSK-018 part 2: the freeform sub-task list (add/toggle/delete/edit/repeat
// arbitrary dated or undated reminders) is removed — job.subTasks[] is now
// written only by bookViewingForOption() (Options compared's 📅 button),
// never read/rendered as a standalone list.
// Booking rows are keyed by autoincrement id locally but linked from steps
// by cuid (the only stable cross-device key) — resolve, delete, and mirror.
async function deleteBookingByCuid(bookingCuid) {
  const row = (await dbAll('bookings')).find(b => b.cuid === bookingCuid);
  if (!row) return;
  await dbDel('bookings', row.id);
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorBookingDelete(bookingCuid).catch(() => {});
  }
}
// ── Options compared (job.options[]) ──
// One deal, several candidates — the realestate "client is weighing 5
// buildings" case (label becomes "Buildings" for that persona), but the same
// shape serves an insurance broker comparing insurers' quotes or a garage
// comparing repair approaches, so it's persona-generic like the tracker
// system rather than a realestate one-off. Deliberately lives on the JOB
// (deal-scoped: the same client can run a fresh search next year), not on
// the client record, where the realestate persona tracker's deals[] remains
// the long-term relationship view. Statuses are a flat select, not a strict
// machine — the agent knows their funnel; picking 'chosen' is the one
// moment with mechanics (every other still-live option flips to 'dropped',
// since choosing one IS dropping the rest — see saveJobOptionField).
const OPTION_STATUSES = ['considering', 'viewing', 'interested', 'passed', 'quoted', 'chosen', 'dropped'];
function renderJobOptions(jobId) {
  const wrap = document.getElementById('job-options-body');
  if (!wrap) return;
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const re = businessType() === 'realestate';
  const titleEl = document.getElementById('job-options-title');
  if (titleEl) titleEl.textContent = t(re ? 'options_title_re' : 'options_title');
  const opts = j.options || [];
  const rows = opts.map(o => `
      <div class="list-row" style="cursor:default;flex-wrap:wrap;gap:6px">
        <input type="text" value="${attrEsc(o.name || '')}" onchange="saveJobOptionField(${jobId},'${o.id}','name',this.value)"
               style="flex:1;min-width:110px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);font-family:inherit;font-size:13px">
        <select onchange="saveJobOptionField(${jobId},'${o.id}','status',this.value)"
                style="padding:8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);font-family:inherit;font-size:13px">
          ${OPTION_STATUSES.map(s => `<option value="${s}"${s === o.status ? ' selected' : ''}>${htmlEsc(t('option_status_' + s))}</option>`).join('')}
        </select>
        <button type="button" class="qc-btn" aria-label="${attrEsc(t('option_book_btn'))}" title="${attrEsc(t('option_book_btn'))}" onclick="bookViewingForOption(${jobId},'${o.id}')">📅</button>
        <button type="button" class="qc-btn" aria-label="Delete option" onclick="deleteJobOption(${jobId},'${o.id}')">✕</button>
      </div>`).join('');
  wrap.innerHTML = `
    ${opts.length ? `<div class="list-card">${rows}</div>` : `<div class="pkg-status"><span>${htmlEsc(t('options_none'))}</span></div>`}
    <div class="form-row" style="margin-top:8px">
      <input type="text" id="job-option-new" placeholder="${attrEsc(t(re ? 'option_name_ph_re' : 'option_name_ph'))}"
             onkeydown="if(event.key==='Enter'){event.preventDefault();addJobOption(${jobId});}"
             style="flex:1;padding:11px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);font-family:inherit;font-size:14px">
      <button type="button" class="qc-btn" style="width:auto;padding:0 14px" onclick="addJobOption(${jobId})">${htmlEsc(t('option_add_btn'))}</button>
    </div>`;
  updateJobDrillSummaries(jobId);
}
async function addJobOption(jobId) {
  jobId = parseInt(jobId, 10);
  const input = document.getElementById('job-option-new');
  const name = (input && input.value || '').trim();
  if (!name) return;
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  j.options = j.options || [];
  j.options.push({ id: cuid(), name, status: 'considering', note: '' });
  j.updatedAt = nowISO();
  await dbPut('jobs', j);
  mirrorJob(j);
  input.value = '';
  input.focus();   // stays focused so adding several in a row doesn't need re-tapping the field
  renderJobOptions(jobId);
}
window.addJobOption = addJobOption;
async function saveJobOptionField(jobId, optId, field, value) {
  const j = jobs.find(x => x.id === jobId);
  const o = j && (j.options || []).find(x => x.id === optId);
  if (!o) return;
  o[field] = value;
  if (field === 'status' && value === 'chosen') {
    (j.options || []).forEach(x => {
      if (x.id !== optId && x.status !== 'passed' && x.status !== 'dropped') x.status = 'dropped';
    });
    toast(t('option_chosen_toast'));
  }
  j.updatedAt = nowISO();
  await dbPut('jobs', j);
  mirrorJob(j);
  renderJobOptions(jobId);
}
window.saveJobOptionField = saveJobOptionField;
async function deleteJobOption(jobId, optId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j || !j.options) return;
  j.options = j.options.filter(x => x.id !== optId);
  j.updatedAt = nowISO();
  await dbPut('jobs', j);
  mirrorJob(j);
  renderJobOptions(jobId);
}
window.deleteJobOption = deleteJobOption;
// Opens the shared appointment modal prefilled for this option — an exact
// date there becomes a real calendar booking + dated step (the whole
// scheduling machinery for free). ctx.optionId lets saveApptModal flip the
// option to 'viewing' in the SAME write, but only from 'considering' — a
// later re-booking must not clobber an 'interested'/'passed' verdict the
// agent already recorded.
function bookViewingForOption(jobId, optId) {
  jobId = parseInt(jobId, 10);
  const j = jobs.find(x => x.id === jobId);
  const o = j && (j.options || []).find(x => x.id === optId);
  if (!o) return;
  openApptModal({ jobId, optionId: optId, prefillText: `${t('option_book_btn')} · ${o.name}` });
}
window.bookViewingForOption = bookViewingForOption;

// TSK-023: "Items on this engagement" (Pass M3-L2) is removed per the
// owner — addJobItem()/removeJobItem() had no entry point besides this
// drill row, so job.items[] can no longer gain new entries. Existing jobs'
// items still flow into quotes/invoices as before (openQuoteForJob/
// openInvoiceForm just read job.items regardless of how it got there).

// ── Milestone payments ──
// "Draft invoice" opens a pre-filled invoice form; the resulting invoiceId
// links back onto the milestone via window.onMilestoneInvoiceCreated below
// only once the invoice is actually saved (cancelling leaves the milestone
// untouched). Deliberately NOT routed through onEngagementInvoiceCreated /
// fromJobId — that hook also advances the Pipeline stage, which would be
// wrong here since a job can have several milestones before it's actually done.
window.__milestoneFormOpen = false;
function renderMilestones(jobId) {
  const wrap = document.getElementById('job-milestones-body');
  if (!wrap) return;
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const subs = j.subTasks || [];
  const miles = j.milestones || [];
  let html = miles.length ? '<div class="list-card">' + miles.map(m => {
    const gate = subs.find(s => s.id === m.gatingSubTaskId);
    const ready = !gate || gate.done;
    return `<div class="list-row" style="cursor:default">
        <div class="list-main">
          <div class="list-title"><span class="chip" style="background:var(--brand-tint);color:var(--brand);margin-right:6px;vertical-align:middle">💰</span>${fmt(m.pct, 0)}% · ${htmlEsc(money(m.amount))}</div>
          <div class="list-sub">${gate ? htmlEsc(t('unlocks_with')) + htmlEsc(gate.text) : htmlEsc(t('no_gating_subtask'))}</div>
        </div>
        <div class="list-right">
          ${m.invoiceId != null
            ? `<span class="chip" style="background:var(--brand-tint);color:var(--brand)">${htmlEsc(t('time_invoiced_label'))}</span>`
            : ready
              ? `<button type="button" class="qc-btn" style="width:auto;padding:0 10px;color:var(--brand)" onclick="draftMilestoneInvoice(${jobId},'${m.id}')">${htmlEsc(t('draft_invoice'))}</button>`
              : `<button type="button" class="qc-btn" style="width:auto;padding:0 10px;background:var(--border);color:var(--text3)" title="${attrEsc(t('mark_gate_done'))}" onclick="toggleMilestoneGate(${jobId},'${m.id}')">${htmlEsc(t('milestone_locked'))}</button>`}
          <button type="button" class="qc-btn" aria-label="Delete milestone" onclick="deleteMilestone(${jobId},'${m.id}')">✕</button>
        </div>
      </div>`;
  }).join('') + '</div>' : `<div class="pkg-status"><span>${htmlEsc(t('no_milestones'))}</span></div>`;

  if (window.__milestoneFormOpen) {
    html += `
      <div class="form-row" style="margin-top:10px">
        <div class="field-half"><label for="ms-pct">%</label><input type="number" id="ms-pct" class="tnum" inputmode="decimal" min="0" max="100" placeholder="50"></div>
        <div class="field-half"><label for="ms-amount">${htmlEsc(t('ms_amount_label'))}</label><input type="number" id="ms-amount" class="tnum" inputmode="decimal" min="0" placeholder="0"></div>
      </div>
      <div class="field"><label for="ms-gate">${htmlEsc(t('ms_gate_label'))}</label>
        <select id="ms-gate"><option value="">${htmlEsc(t('ms_gate_none'))}</option>${subs.map(s => `<option value="${s.id}">${htmlEsc(s.text)}</option>`).join('')}</select>
      </div>
      <div class="field"><label for="ms-gate-new-text">${htmlEsc(t('ms_gate_new_label'))}</label>
        <input type="text" id="ms-gate-new-text" placeholder="${attrEsc(t('ms_gate_new_ph'))}">
      </div>
      <div class="field"><input type="date" id="ms-gate-new-date"></div>
      <button type="button" class="btn-submit" style="margin-top:6px" onclick="saveMilestone(${jobId})">${htmlEsc(t('save_milestone'))}</button>
    `;
  }
  wrap.innerHTML = html;
  updateJobDrillSummaries(jobId);
}
function addMilestone(jobId) {
  window.__milestoneFormOpen = true;
  renderMilestones(parseInt(jobId, 10));
}
window.addMilestone = addMilestone;
async function saveMilestone(jobId) {
  const pct = parseFloat(document.getElementById('ms-pct').value) || 0;
  const amount = parseFloat(document.getElementById('ms-amount').value) || 0;
  if (amount <= 0) { toast('Enter the milestone amount'); return; }
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  let gatingSubTaskId = document.getElementById('ms-gate').value || null;
  // TSK-018 part 2: with the standalone dated-step list gone, a milestone
  // can still gate on a brand-new one-off step created right here — this is
  // the only remaining way to gate a milestone for a job with no Options
  // compared entries. Takes priority over the dropdown when both are filled.
  const newGateText = ((document.getElementById('ms-gate-new-text') || {}).value || '').trim();
  const newGateDate = (document.getElementById('ms-gate-new-date') || {}).value || '';
  if (newGateText && newGateDate) {
    const st = { id: cuid(), text: newGateText, done: false, dateType: 'exact', date: newGateDate, startTime: '09:00', bookingCuid: null };
    j.subTasks = j.subTasks || [];
    j.subTasks.push(st);
    await createBookingForStep(j, st);
    gatingSubTaskId = st.id;
  }
  j.milestones = j.milestones || [];
  j.milestones.push({ id: cuid(), pct, amount, gatingSubTaskId });
  await dbPut('jobs', j);
  mirrorJob(j);
  window.__milestoneFormOpen = false;
  renderMilestones(jobId);
}
window.saveMilestone = saveMilestone;
async function deleteMilestone(jobId, msId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j || !j.milestones) return;
  j.milestones = j.milestones.filter(x => x.id !== msId);
  await dbPut('jobs', j);
  mirrorJob(j);
  renderMilestones(jobId);
}
window.deleteMilestone = deleteMilestone;
// TSK-018 part 2: with the standalone dated-step list (and its toggle-on-
// click row) gone, this is the only remaining way to mark a gating step
// done and unlock its milestone — lives right on the "Locked" chip itself.
async function toggleMilestoneGate(jobId, msId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const m = (j.milestones || []).find(x => x.id === msId);
  const st = m && (j.subTasks || []).find(s => s.id === m.gatingSubTaskId);
  if (!st) return;
  st.done = !st.done;
  await dbPut('jobs', j);
  mirrorJob(j);
  renderMilestones(jobId);
}
window.toggleMilestoneGate = toggleMilestoneGate;
function draftMilestoneInvoice(jobId, msId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j) return;
  const m = (j.milestones || []).find(x => x.id === msId);
  if (!m) return;
  const client = customers.find(c => c.id === j.clientId);
  if (typeof openInvoiceForm !== 'function') return;
  openInvoiceForm(null, {
    clientId: j.clientId,
    clientName: (client && client.name) || j.client || '',
    lineItems: [{ description: `Milestone (${fmt(m.pct, 0)}%)`, qty: 1, unitPrice: m.amount }],
    linkMeta: { type: 'milestone', jobId, milestoneId: msId },
  });
}
window.draftMilestoneInvoice = draftMilestoneInvoice;

// Called by invoices.js only once a milestone-draft invoice is actually saved
// (never on cancel) — see invoices.js's file header for the linkMeta contract.
// Deliberately not routed through onEngagementInvoiceCreated: this must NOT
// advance the Pipeline stage, since a job can have several milestones before
// it's actually done.
window.onMilestoneInvoiceCreated = async function (invoiceId, jobId, milestoneId) {
  const j = jobs.find(x => x.id === jobId);
  if (!j || !j.milestones) return;
  const m = j.milestones.find(x => x.id === milestoneId);
  if (!m) return;
  m.invoiceId = invoiceId;
  j.updatedAt = nowISO();
  await dbPut('jobs', j);
  mirrorJob(j);
  renderMilestones(jobId);
};

// ── Time tracking + Focus mode ──
// TSK-023: Time tracking (the per-job timer, unbilled-time-to-invoice
// conversion, and Focus mode's full-screen Pomodoro view) is removed per
// the owner — startJobTimer() had no entry point besides the removed
// drill row's Start button, so no new timer could ever start; the whole
// feature (including Focus mode, which only ever opened over a running
// timer) goes with it.

async function saveProgressEntry(clientId) {
  const date = document.getElementById('pl-date').value || todayISO();
  const weightVal = document.getElementById('pl-weight').value;
  const weight = weightVal !== '' ? parseFloat(weightVal) : null;
  const notes = (document.getElementById('pl-notes').value || '').trim();
  if (weight == null && !notes) { toast('Enter a weight or a note'); return; }
  const uid = isGuest ? 'guest' : currentUser.id;
  const obj = { uid, clientId, date, weight, notes, cuid: cuid(), updatedAt: nowISO() };
  await dbAdd('progressLogs', obj);
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorProgressLogSave(obj).catch(() => {});
  }
  window.__progressFormOpen = false;
  await renderCustomerProgress(clientId);
  toast('Entry saved');
}
window.saveProgressEntry = saveProgressEntry;
async function deleteProgressEntry(id, clientId) {
  if (!confirm('Delete this entry?')) return;
  const prev = await dbGet('progressLogs', id);
  await dbDel('progressLogs', id);
  if (!isGuest && prev && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorProgressLogDelete(prev.cuid).catch(() => {});
  }
  await renderCustomerProgress(clientId);
}
window.deleteProgressEntry = deleteProgressEntry;

// ─── QUICK SESSION CHECK-IN — one-tap log for a recurring client ──────────
// Reuses the client's most recent session's service/amount so a routine
// repeat visit doesn't need the full Add Session form; goes straight to the
// Deliver stage (skipping Inquiry/Quote/Booked) since this is a repeat
// client, not a new sale, and auto-applies their active package if they have
// one — this IS the "did the package session happen" moment those exist for.
async function quickCheckIn(clientId) {
  const c = customers.find(x => x.id === clientId);
  if (!c) return;
  const uid = isGuest ? 'guest' : currentUser.id;
  const priorJobs = jobs.filter(j => j.clientId === clientId)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const last = priorJobs[0];
  const order = getStageOrder();
  const pkg = activePackageFor(clientId);
  const job = {
    uid, date: todayISO(), client: c.name, clientId: c.id,
    serviceId: last ? last.serviceId : null, serviceName: last ? last.serviceName : '',
    jobType: settings.workType || '',
    amount: last ? last.amount : 0, tip: 0, expense: 0, count: 1, notes: '',
    netAmount: last ? last.amount : 0,
    cuid: cuid(), stageOrder: order, stage: 'deliver', complete: false,
    // Landing directly on Deliver means the session already happened —
    // same as the old 6-stage model, where a job created straight onto
    // Delivery was already >= the old paidIdx and so counted as earned.
    paid: true,
    invoiceId: null, quoteDocId: null,
    packageId: pkg ? pkg.id : null,
    updatedAt: nowISO(),
  };
  await dbAdd('jobs', job);
  logEvent('quick_checkin');
  await reload();
  toast(`Checked in ${c.name}`);
}
window.quickCheckIn = quickCheckIn;

function openCustomerModal() { document.getElementById('modal-customer').classList.add('open'); }
// Always resets the pending job->customer link flag: cancelling (or clicking
// outside) the "add a new client" flow started from the session form must not
// leave a stale flag that could mis-link some unrelated later save.
function closeCustomerModal() { window.__pendingJobCustomerLink = false; document.getElementById('modal-customer').classList.remove('open'); }
function openAddCustomer() {
  document.getElementById('cust-modal-title').textContent = t('add_customer');
  document.getElementById('c-edit-id').value = '';
  ['c-name','c-phone','c-email','c-tags','c-notes','c-taxid','c-billing'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const memberNoEl = document.getElementById('c-memberno');
  if (memberNoEl) memberNoEl.value = t('assigned_on_save');
  renderIntakeFields({});
  // Package/progress/persona tracking all need a saved client id to attach
  // records to — hidden on Add, shown once the client actually exists
  // (openEditCustomer).
  document.getElementById('cust-package-section').style.display = 'none';
  document.getElementById('cust-progress-section').style.display = 'none';
  document.getElementById('cust-persona-section').style.display = 'none';
  document.getElementById('c-delete').style.display = 'none';
  clearFieldErrors();
  openCustomerModal();
}
function openEditCustomer(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  document.getElementById('cust-modal-title').textContent = t('edit_customer');
  document.getElementById('c-edit-id').value = String(id);
  const set = (i,v)=>{ const el=document.getElementById(i); if(el) el.value = (v==null?'':v); };
  set('c-name', c.name); set('c-phone', c.phone); set('c-email', c.email);
  set('c-tags', c.tags); set('c-notes', c.notes); set('c-taxid', c.taxId); set('c-billing', c.billingAddress);
  set('c-memberno', c.memberNo || t('assigned_on_save'));
  renderIntakeFields(c);
  window.__pkgFormOpen = false; window.__progressFormOpen = false;
  // Packages apply to every business type (any persona can sell "N units"
  // up front — sessions, pieces, policies, whatever packageUnitLabel() is
  // set to). The weight/measurement progress log stays trainer-only — a
  // different, unrelated feature this generalization doesn't touch. Every
  // persona also gets its own tracker section below (see the registry
  // above renderClientPersonaTracker()).
  const isTrainer = businessType() === 'trainer';
  const isCustom = businessType() === 'custom';
  document.getElementById('cust-package-section').style.display = 'block';
  document.getElementById('cust-progress-section').style.display = isTrainer ? 'block' : 'none';
  // 'custom' has no persona-specific tracker (see PERSONA_TRACKER_TITLES) —
  // hide the section entirely rather than render it empty.
  document.getElementById('cust-persona-section').style.display = isCustom ? 'none' : 'block';
  renderCustomerPackages(id);
  if (isTrainer) renderCustomerProgress(id);
  if (!isCustom) renderClientPersonaTracker(id);
  document.getElementById('c-delete').style.display = 'block';
  clearFieldErrors();
  openCustomerModal();
}
async function saveCustomer() {
  const name = (document.getElementById('c-name').value || '').trim();
  clearFieldErrors();
  if (!name) { markFieldError('c-name', 'err_name_required'); return; }
  const uid = isGuest ? 'guest' : currentUser.id;
  const editId = document.getElementById('c-edit-id').value;
  const prev = editId ? customers.find(c => c.id === parseInt(editId)) : null;
  if (editId && !prev) return;
  // Plan client cap (Phase 1) — only ever blocks a brand-new client, never
  // an edit to one that already exists (so nobody's existing data becomes
  // unreachable just for going over a cap after the fact). No-op (Infinity)
  // for guest/local-only/unlimited-plan accounts — see planClientCap().
  if (!prev && customers.length >= planClientCap()) {
    toast(t('client_cap_reached'));
    return;
  }
  const obj = {
    ...(prev || {}),
    uid, name,
    phone: (document.getElementById('c-phone').value || '').trim(),
    email: (document.getElementById('c-email').value || '').trim(),
    tags: (document.getElementById('c-tags').value || '').trim(),
    notes: (document.getElementById('c-notes').value || '').trim(),
    taxId: (document.getElementById('c-taxid').value || '').trim(),
    billingAddress: (document.getElementById('c-billing').value || '').trim(),
  };
  intakeFields().forEach(f => { const el = document.getElementById('ci-'+f.id); obj[f.id] = el ? el.value.trim() : ''; });
  if (prev) {
    obj.id = prev.id; obj.cuid = prev.cuid || cuid();
    obj.memberNo = prev.memberNo || nextMemberNo();   // legacy record predating this feature
  } else {
    obj.cuid = cuid();
    obj.memberNo = nextMemberNo();
  }
  obj.updatedAt = nowISO();
  const linkToJob = !!window.__pendingJobCustomerLink && !prev;
  const newId = await dbPut('clients', obj);
  if (!prev) logEvent('client_added');
  // Best-effort cloud-backup mirror (Phase 1 of the local->backend
  // migration) — local IndexedDB above is already the write of record by
  // this point, so a mirror failure here never blocks or reverts the save.
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorClientSave(obj).catch(() => {});
  }
  closeCustomerModal();
  await reload();
  toast(t('customer_saved'));
  if (linkToJob) {
    const linkedId = obj.id != null ? obj.id : newId;
    populateJobSelects(linkedId, document.getElementById('j-service')?.value || '');
  }
}
async function deleteCustomer() {
  const editId = document.getElementById('c-edit-id').value;
  if (!editId) return;
  if (!confirm(t('delete_customer_confirm'))) return;
  const prev = customers.find(c => c.id === parseInt(editId));
  await dbDel('clients', parseInt(editId));
  if (prev && prev.cuid && !isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorClientDelete(prev.cuid).catch(() => {});
  }
  closeCustomerModal();
  await reload();
  toast(t('customer_deleted'));
}

// ─── SERVICES (catalog + default rates) ───────────────────────────────
// Default services seeded once per business type (editable/deletable after).
// Numbers are currency-agnostic. Flag is keyed per type so switching
// Settings ▸ Business type later can seed that type's defaults too, without
// re-seeding (or touching) whatever the user already has.
async function seedServicesIfEmpty() {
  const bt = businessType();
  const flag = 'servicesSeeded_' + bt;
  if (settings[flag]) return;                       // already seeded for this type
  const uid = isGuest ? 'guest' : currentUser.id;
  const existing = (await dbAll('services')).filter(s => s.uid === uid);
  if (existing.length) { await saveSetting(flag, true); return; }   // never overwrite user data
  for (const [name, rate, unit] of BUSINESS_TYPES[bt].seedServices) {
    await dbAdd('services', {uid, name, rate, unit, cuid: cuid(), updatedAt: nowISO()});
  }
  await saveSetting(flag, true);
  await reload();
}
// Pass M3-L1: 📦 for a product row, 🏷️ for a service row (missing/null
// `kind` = 'service' — every pre-existing record, no migration).
function svcIsProduct(s) { return s && s.kind === 'product'; }
// Stock chip for a product row's right side: neutral "{n} left", amber
// "{n} left" when 0 < n <= 3 (low stock), red "Out of stock" at n === 0.
// Untracked products (stockQty == null) render no chip at all.
function svcStockChipHtml(s) {
  if (!svcIsProduct(s) || s.stockQty == null) return '';
  const n = s.stockQty;
  if (n === 0) {
    return `<div class="list-amt-sub" style="margin-top:3px"><span class="chip chip-overdue">${htmlEsc(t('svc_stock_out'))}</span></div>`;
  }
  const lowStyle = n <= 3 ? 'background:var(--marigold-tint);color:var(--marigold-ink)' : 'background:var(--border);color:var(--text3)';
  return `<div class="list-amt-sub" style="margin-top:3px"><span class="chip" style="${lowStyle}">${htmlEsc(t('svc_stock_left').replace('{n}', n))}</span></div>`;
}
function renderServices() {
  const wrap = document.getElementById('services-body');
  if (!wrap) return;
  if (!services.length) {
    wrap.innerHTML = `<div class="empty"><div class="empty-icon">🏷️</div>
      <p>${htmlEsc(t('no_services'))}</p><span>${htmlEsc(t('no_services_sub'))}</span></div>`;
    return;
  }
  wrap.innerHTML = '<div class="list-card">' + services.map(s => {
    const isProduct = svcIsProduct(s);
    const subParts = [s.unit || ''];
    if (isProduct && s.sku) subParts.push(s.sku);
    return `
    <div class="list-row" onclick="openEditService(${s.id})">
      <div class="list-icon">${isProduct ? '📦' : '🏷️'}</div>
      <div class="list-main">
        <div class="list-title">${htmlEsc(s.name)}</div>
        <div class="list-sub">${htmlEsc(subParts.filter(Boolean).join(' · '))}</div>
      </div>
      <div class="list-right">
        <div class="list-amt tnum">${htmlEsc(money(s.rate))}</div>
        ${svcStockChipHtml(s)}
      </div>
    </div>`;
  }).join('') + '</div>';
}
function openServiceModal() { document.getElementById('modal-service').classList.add('open'); }
function closeServiceModal() { window.__pendingJobServiceLink = false; document.getElementById('modal-service').classList.remove('open'); }
// Toggles the service/product segmented control — same shape as
// #modal-appt's setApptType(), a hidden input (#sv-kind) carries the current
// value and the product-only fields container is shown/hidden alongside it.
function setSvcKind(kind) {
  const k = kind === 'product' ? 'product' : 'service';
  const kindEl = document.getElementById('sv-kind');
  if (kindEl) kindEl.value = k;
  const svcBtn = document.getElementById('svc-kind-service'), prodBtn = document.getElementById('svc-kind-product');
  if (svcBtn) svcBtn.classList.toggle('seg-active', k === 'service');
  if (prodBtn) prodBtn.classList.toggle('seg-active', k === 'product');
  const fields = document.getElementById('svc-product-fields');
  if (fields) fields.style.display = k === 'product' ? '' : 'none';
}
function openAddService() {
  document.getElementById('svc-modal-title').textContent = t('add_service');
  document.getElementById('sv-edit-id').value = '';
  ['sv-name','sv-rate','sv-unit','sv-sku','sv-stock','sv-cost'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('sv-usage-qty').value = '1';
  document.getElementById('sv-delete').style.display = 'none';
  setSvcKind('service');
  clearFieldErrors();
  openServiceModal();
}
function openEditService(id) {
  const s = services.find(x => x.id === id);
  if (!s) return;
  document.getElementById('svc-modal-title').textContent = t('edit_service');
  document.getElementById('sv-edit-id').value = String(id);
  const set = (i,v)=>{ const el=document.getElementById(i); if(el) el.value = (v==null?'':v); };
  set('sv-name', s.name); set('sv-rate', s.rate); set('sv-unit', s.unit);
  set('sv-usage-qty', s.usageQty > 0 ? s.usageQty : 1);
  set('sv-sku', s.sku); set('sv-stock', s.stockQty); set('sv-cost', s.cost);
  setSvcKind(svcIsProduct(s) ? 'product' : 'service');
  document.getElementById('sv-delete').style.display = 'block';
  clearFieldErrors();
  openServiceModal();
}
async function saveService() {
  const name = (document.getElementById('sv-name').value || '').trim();
  clearFieldErrors();
  if (!name) { markFieldError('sv-name', 'err_name_required'); return; }
  const rate = parseFloat(document.getElementById('sv-rate').value) || 0;
  const unit = (document.getElementById('sv-unit').value || '').trim();
  const usageQty = parseInt(document.getElementById('sv-usage-qty').value, 10) || 1;
  const kindEl = document.getElementById('sv-kind');
  const kind = kindEl && kindEl.value === 'product' ? 'product' : 'service';
  const skuRaw = (document.getElementById('sv-sku') ? document.getElementById('sv-sku').value : '').trim();
  const sku = skuRaw ? skuRaw : null;
  const stockRaw = document.getElementById('sv-stock') ? document.getElementById('sv-stock').value : '';
  const stockParsed = parseInt(stockRaw, 10);
  const stockQty = stockRaw === '' ? null : (isNaN(stockParsed) ? null : stockParsed);
  const costRaw = document.getElementById('sv-cost') ? document.getElementById('sv-cost').value : '';
  const costParsed = parseFloat(costRaw);
  const cost = costRaw === '' ? null : (isNaN(costParsed) ? null : costParsed);
  const uid = isGuest ? 'guest' : currentUser.id;
  const obj = {uid, name, rate, unit, usageQty, kind, sku, stockQty, cost};
  const editId = document.getElementById('sv-edit-id').value;
  if (editId) {
    const id = parseInt(editId);
    const prev = services.find(s => s.id === id);
    if (!prev) return;
    obj.id = id; obj.cuid = prev.cuid || cuid();
  } else { obj.cuid = cuid(); }
  obj.updatedAt = nowISO();
  const linkToJob = !!window.__pendingJobServiceLink && !editId;
  const key = await dbPut('services', obj);
  if (obj.id == null) obj.id = key;
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorServiceSave(obj).catch(() => {});
  }
  closeServiceModal();
  await reload();
  toast(t('service_saved'));
  if (linkToJob) {
    populateJobSelects(document.getElementById('j-customer')?.value || '', obj.id);
    onJobServiceChange(String(obj.id));
  }
}
async function deleteService() {
  const editId = document.getElementById('sv-edit-id').value;
  if (!editId) return;
  if (!confirm(t('delete_service_confirm'))) return;
  const id = parseInt(editId);
  const prev = services.find(s => s.id === id);
  await dbDel('services', id);
  if (!isGuest && prev && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorServiceDelete(prev.cuid).catch(() => {});
  }
  closeServiceModal();
  await reload();
  toast(t('service_deleted'));
}

// Pass M3-L1: automatic stock decrement when an invoice is marked paid.
// Shared by all three paid-transition paths — invoices.js's
// transitionInvoiceStatus (status <select> / "Confirm payment received"),
// invoices.js's saveInvoice edit-path paid transition, and app.js's own
// markJobPaid direct invoice flip — kept here since app.js owns the
// `services` store/global, not invoices.js. Idempotent via
// inv.stockDecrementedAt (stamped on the INVOICE, not the service): a
// paid -> sent -> paid round trip must never decrement twice, so every
// call site fires this fire-and-forget (`.catch(()=>{})`) and lets the
// stamp guard do the actual dedup.
window.decrementStockForInvoicePaid = async function (inv) {
  if (!inv || inv.stockDecrementedAt) return;
  const lineItems = Array.isArray(inv.lineItems) ? inv.lineItems : [];
  let decremented = 0;
  let hasProductLine = false;
  for (const li of lineItems) {
    if (li.serviceId == null) continue;
    const svc = services.find(s => s.id === li.serviceId);
    if (!svc || !svcIsProduct(svc)) continue;
    hasProductLine = true;
    if (svc.stockQty == null) continue; // not tracked — nothing to decrement
    const qty = Number(li.qty) || 1;
    svc.stockQty = Math.max(0, svc.stockQty - qty);
    svc.updatedAt = nowISO();
    await dbPut('services', svc);
    if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
      SidekickBackend.mirrorServiceSave(svc).catch(() => {});
    }
    decremented++;
  }
  if (decremented > 0 || hasProductLine) {
    inv.stockDecrementedAt = nowISO();
    await dbPut('invoices', inv);
    if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
      SidekickBackend.mirrorInvoiceSave(inv).catch(() => {});
    }
  }
  await reload();
  if (decremented > 0) toast(t('svc_stock_decremented').replace('{n}', decremented));
};

// ─── SETTINGS ─────────────────────────────────────────────────────────
async function saveSetting(key, val) {
  settings[key] = val;
  const prefix = isGuest ? 'guest:' : (currentUser.id + ':');
  await dbPut('settings', {key: prefix + key, value: val});
  if (!isGuest && typeof SidekickBackend !== 'undefined' && SidekickBackend.isEnabled()) {
    SidekickBackend.mirrorSettingSave(prefix + key, val).catch(() => {});
  }
  if (key === 'lang') localStorage.setItem('sidekick_ui_lang', val);
}
async function onCurrencyChange(v) { await saveSetting('currency', v); applyLang(); }
// Switching business type never touches existing services/clients — only
// changes the unit word, seeds that type's defaults if the account has no
// services at all yet, and swaps which tracker card renders on a client.
async function onBusinessTypeChange(v) {
  if (!BUSINESS_TYPES[v]) return;
  // Re-seed the package unit label to the new type's default, but only if it
  // was never customized away from the old type's default — an explicit
  // "Pieces" a laundry account typed in shouldn't silently flip back on a
  // later persona switch.
  const oldDefault = PACKAGE_UNIT_DEFAULTS[businessType()];
  if (!settings.packageUnitLabel || settings.packageUnitLabel === oldDefault) {
    await saveSetting('packageUnitLabel', PACKAGE_UNIT_DEFAULTS[v] || 'Units');
    const el = document.getElementById('set-package-unit');
    if (el) el.value = packageUnitLabel();
  }
  await saveSetting('businessType', v);
  document.body.setAttribute('data-work-type', v);
  await seedServicesIfEmpty();
  applyLang();
  renderHome();
}
async function onPackageUnitLabelChange(v) {
  await saveSetting('packageUnitLabel', (v || '').trim() || PACKAGE_UNIT_DEFAULTS[businessType()] || 'Units');
}
async function onLangChange(v) { await saveSetting('lang', v === 'th' ? 'th' : 'en'); applyLang(); }
async function onWhtChange(v) { const n = parseFloat(v); await saveSetting('wht', isNaN(n)?null:n); }
async function onVatChange(v) { const n = parseFloat(v); await saveSetting('vat', isNaN(n)?null:n); }
async function onPageSizeChange(v) { await saveSetting('docPageSize', v === 'A5' ? 'A5' : 'A4'); }
// Shared by invoices.js/docgen.js's print flows so both document types honor
// the same Settings ▸ Preferences ▸ "Document page size" choice.
function docPageSizeCss() {
  const size = (typeof settings !== 'undefined' && settings && settings.docPageSize === 'A5') ? 'A5' : 'A4';
  const margin = size === 'A5' ? '10mm' : '16mm';
  return `@page{ size: ${size}; margin: ${margin}; }`;
}
window.docPageSizeCss = docPageSizeCss;
// ─── PAYMENT CHANNELS (Settings) ──────────────────────────────────────
// Generalizes the old single "PromptPay ID" field into a saved list of
// payment methods — only 'promptpay' ever renders a scannable QR
// (invoices.js); the rest are shown to clients as plain reference text.
// Legacy single-field installs are migrated once in enterApp().
const PAYMENT_CHANNEL_TYPES = {
  promptpay: { label: 'PromptPay', detailLabel: 'PromptPay ID', ph: 'Phone or 13-digit national ID' },
  bank:      { label: 'Bank transfer', detailLabel: 'Account details', ph: 'Bank name, account number, account name' },
  // 2026-07-17: Tier-0 payment link — any hosted checkout URL (Stripe payment
  // link, Ko-fi, etc.) pasted in; renders as a tappable "Pay now" button on
  // invoices (invoices.js). The app never touches the money — detail must be
  // a validated http(s) URL or it falls back to plain text (see safeHttpUrl).
  paylink:   { label: 'Payment link', detailLabel: 'Link URL', ph: 'https://buy.stripe.com/…' },
  cash:      { label: 'Cash', detailLabel: 'Note (optional)', ph: 'e.g. Pay in cash at the session' },
  other:     { label: 'Other', detailLabel: 'Instructions', ph: 'Payment instructions' },
};
const PAYMENT_CHANNEL_ICONS = {
  promptpay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M15 15h2.5v2.5H15zM19.5 15V19M15 19.5h2M19.5 19.5h1.5"/></svg>',
  bank:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M3 10l9-7 9 7"/><path d="M4 10v10M20 10v10M9 10v10M15 10v10"/><path d="M2 20h20"/></svg>',
  paylink:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M9 15l6-6"/><path d="M11 6l1-1a4 4 0 0 1 5.7 5.7l-1.4 1.4"/><path d="M13 18l-1 1a4 4 0 0 1-5.7-5.7l1.4-1.4"/></svg>',
  cash:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/></svg>',
  other:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M20.6 13.4L11 3.8A2 2 0 0 0 9.5 3H4a1 1 0 0 0-1 1v5.5c0 .5.2 1 .6 1.4l9.6 9.6a2 2 0 0 0 2.8 0l4.4-4.4a2 2 0 0 0 .2-2.7z"/><circle cx="7.5" cy="7.5" r="1.3"/></svg>',
};
let editingPaymentChannelId = null;

function paymentChannels() { return Array.isArray(settings.paymentChannels) ? settings.paymentChannels : []; }

function renderPaymentChannels() {
  updatePaymentsPill();
  const wrap = document.getElementById('payment-channels-list');
  if (!wrap) return;
  const chans = paymentChannels();
  if (!chans.length) {
    wrap.innerHTML = `<div class="empty" style="padding:20px 12px">
        <p style="font-size:13px;font-weight:700">${htmlEsc(t('no_payment_channels'))}</p>
        <span style="font-size:12px">${htmlEsc(t('no_payment_channels_sub'))}</span>
      </div>`;
    return;
  }
  wrap.innerHTML = '<div class="list-card">' + chans.map(c => {
    const meta = PAYMENT_CHANNEL_TYPES[c.type] || PAYMENT_CHANNEL_TYPES.other;
    return `<div class="list-row" onclick="openEditPaymentChannel('${c.id}')">
        <div class="list-icon">${PAYMENT_CHANNEL_ICONS[c.type] || PAYMENT_CHANNEL_ICONS.other}</div>
        <div class="list-main">
          <div class="list-title">${htmlEsc(c.label || meta.label)}</div>
          <div class="list-sub">${htmlEsc(c.detail || '—')}</div>
        </div>
      </div>`;
  }).join('') + '</div>';
}

function openAddPaymentChannel() {
  editingPaymentChannelId = null;
  buildPaymentChannelModal({ type: 'promptpay', label: '', detail: '' }, false);
}
function openEditPaymentChannel(id) {
  const c = paymentChannels().find(x => x.id === id);
  if (!c) return;
  editingPaymentChannelId = id;
  buildPaymentChannelModal(c, true);
}
function buildPaymentChannelModal(v, isEdit) {
  closePaymentChannelModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-paychannel';
  const typeOpts = Object.keys(PAYMENT_CHANNEL_TYPES).map(k =>
    `<option value="${k}"${k === v.type ? ' selected' : ''}>${htmlEsc(PAYMENT_CHANNEL_TYPES[k].label)}</option>`).join('');
  const meta = PAYMENT_CHANNEL_TYPES[v.type] || PAYMENT_CHANNEL_TYPES.promptpay;
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-handle"></div>
      <div class="modal-title">${isEdit ? 'Edit payment channel' : 'Add payment channel'}</div>
      <div class="form-section">
        <div class="field"><label for="pc-type">Type</label>
          <select id="pc-type" onchange="onPaymentChannelTypeChange(this.value)">${typeOpts}</select>
        </div>
        <div class="field"><label for="pc-label">Label</label>
          <input type="text" id="pc-label" value="${attrEsc(v.label || '')}" placeholder="${attrEsc(meta.label)}"></div>
        <div class="field"><label for="pc-detail" id="pc-detail-label">${htmlEsc(meta.detailLabel)}</label>
          <input type="text" id="pc-detail" value="${attrEsc(v.detail || '')}" placeholder="${attrEsc(meta.ph)}"></div>
      </div>
      <button class="btn-submit" onclick="savePaymentChannel()">Save channel</button>
      ${isEdit ? `<button class="btn-danger" onclick="deletePaymentChannel()">Delete channel</button>` : ''}
      <button class="btn-danger" style="border-color:var(--border-mid);color:var(--text3)" onclick="closePaymentChannelModal()">Cancel</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.classList.add('open');
}
function onPaymentChannelTypeChange(type) {
  const meta = PAYMENT_CHANNEL_TYPES[type] || PAYMENT_CHANNEL_TYPES.other;
  const labelInput = document.getElementById('pc-label');
  const detailInput = document.getElementById('pc-detail');
  const detailLabelEl = document.getElementById('pc-detail-label');
  if (labelInput) labelInput.placeholder = meta.label;
  if (detailInput) detailInput.placeholder = meta.ph;
  if (detailLabelEl) detailLabelEl.textContent = meta.detailLabel;
}
async function savePaymentChannel() {
  const type = document.getElementById('pc-type').value;
  const meta = PAYMENT_CHANNEL_TYPES[type] || PAYMENT_CHANNEL_TYPES.other;
  const label = document.getElementById('pc-label').value.trim() || meta.label;
  const detail = document.getElementById('pc-detail').value.trim();
  const chans = paymentChannels().slice();
  if (editingPaymentChannelId) {
    const idx = chans.findIndex(c => c.id === editingPaymentChannelId);
    if (idx >= 0) chans[idx] = { ...chans[idx], type, label, detail };
  } else {
    chans.push({ id: cuid(), type, label, detail });
  }
  await saveSetting('paymentChannels', chans);
  closePaymentChannelModal();
  renderPaymentChannels();
  toast('Payment channel saved');
}
async function deletePaymentChannel() {
  if (!editingPaymentChannelId) return;
  const chans = paymentChannels().filter(c => c.id !== editingPaymentChannelId);
  await saveSetting('paymentChannels', chans);
  closePaymentChannelModal();
  renderPaymentChannels();
  toast('Payment channel deleted');
}
function closePaymentChannelModal() {
  const el = document.getElementById('modal-paychannel');
  if (el) el.remove();
}

async function onSellerBusinessNameChange(v) { await saveSetting('sellerBusinessName', (v||'').trim()); }
async function onSellerTaxIdChange(v) { await saveSetting('sellerTaxId', (v||'').trim()); }
async function onSellerAddressChange(v) { await saveSetting('sellerAddress', (v||'').trim()); }

// ─── EXPORT: CSV + JSON backup/restore ────────────────────────────────
// Neutralize spreadsheet formula injection in free-text cells and always quote.
function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function exportCSV() {
  const sym = curSym();
  let csv = `Date,End date,Start,End,Client,Amount (${sym}),Tip (${sym}),Expense (${sym}),Count,Net (${sym}),Notes\n`;
  jobs.forEach(j => {
    csv += `${csvCell(j.date)},${csvCell(j.endDate||j.date)},${csvCell(j.startTime||'')},${csvCell(j.endTime||'')},`
        +  `${csvCell(j.client||'')},${Number(j.amount)||0},${Number(j.tip)||0},${Number(j.expense)||0},`
        +  `${Number(j.count)||0},${netOf(j)},${csvCell(j.notes||'')}\n`;
  });
  // UTF-8 BOM so Excel detects UTF-8 (฿ header + any non-ASCII text stay intact).
  const blob = new Blob(['﻿' + csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sidekick-jobs-${(currentUser&&currentUser.username)||'guest'}-${todayISO()}.csv`;
  a.click();
  toast(t('exported'));
}
function exportCustomersCSV() {
  let csv = 'Member ID,Name,Phone,Email,Tags,Tax ID,Billing address,Notes\n';
  customers.forEach(c => {
    csv += `${csvCell(c.memberNo||'')},${csvCell(c.name||'')},${csvCell(c.phone||'')},${csvCell(c.email||'')},${csvCell(c.tags||'')},`
        +  `${csvCell(c.taxId||'')},${csvCell(c.billingAddress||'')},${csvCell(c.notes||'')}\n`;
  });
  const blob = new Blob(['﻿' + csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sidekick-customers-${(currentUser&&currentUser.username)||'guest'}-${todayISO()}.csv`;
  a.click();
  toast(t('exported'));
}
async function exportInvoicesCSV() {
  const sym = curSym();
  const uid = isGuest ? 'guest' : currentUser.id;
  const rows = (await dbAll('invoices')).filter(r => r.uid === uid);
  rows.sort((a, b) => String(a.number||'').localeCompare(String(b.number||'')));
  let csv = `Number,Issue date,Due date,Client,Status,Subtotal (${sym}),VAT (${sym}),WHT (${sym}),Client pays (${sym}),You receive (${sym})\n`;
  rows.forEach(inv => {
    csv += `${csvCell(inv.number||'')},${csvCell(inv.issueDate||'')},${csvCell(inv.dueDate||'')},${csvCell(inv.clientName||'')},`
        +  `${csvCell(inv.status||'')},${Number(inv.subtotal)||0},${Number(inv.vat)||0},${Number(inv.wht)||0},`
        +  `${Number(inv.clientPays)||0},${Number(inv.youReceive)||0}\n`;
  });
  const blob = new Blob(['﻿' + csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sidekick-invoices-${(currentUser&&currentUser.username)||'guest'}-${todayISO()}.csv`;
  a.click();
  toast(t('exported'));
}
// Year-end P.N.D. 90/94 filing summary: assessable income (subtotal, before
// tax) and WHT credits withheld, grouped by the year each invoice was
// issued. A rollup of exportInvoicesCSV()'s same per-invoice figures, not a
// separate data source — this is a summary export to help with filing, not
// an authoritative tax document.
async function exportPndSummary() {
  const sym = curSym();
  const uid = isGuest ? 'guest' : currentUser.id;
  const rows = (await dbAll('invoices')).filter(r => r.uid === uid && r.status !== 'draft');
  const byYear = {};
  rows.forEach(inv => {
    const y = (inv.issueDate || '').slice(0, 4) || 'Unknown';
    if (!byYear[y]) byYear[y] = { income: 0, credits: 0, count: 0 };
    byYear[y].income += Number(inv.subtotal) || 0;
    byYear[y].credits += Number(inv.wht) || 0;
    byYear[y].count++;
  });
  let csv = `Year,Invoices,Assessable income (${sym}),WHT credits (${sym})\n`;
  Object.keys(byYear).sort().forEach(y => {
    const r = byYear[y];
    csv += `${csvCell(y)},${r.count},${r.income},${r.credits}\n`;
  });
  const blob = new Blob(['﻿' + csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sidekick-pnd-summary-${(currentUser&&currentUser.username)||'guest'}-${todayISO()}.csv`;
  a.click();
  toast(t('exported'));
}
// All uid-scoped stores a full backup/restore round-trips. Kept in one place
// so a future new store (like bookings/followups/portfolio were for M3) only
// needs to be added here, not re-plumbed through export/import separately.
const BACKUP_STORES = ['jobs', 'expenses', 'clients', 'services', 'invoices', 'documents', 'bookings', 'followups', 'portfolio', 'research', 'packages', 'progressLogs'];

async function exportBackup() {
  const uid = isGuest ? 'guest' : currentUser.id;
  const allByStore = await Promise.all(BACKUP_STORES.map(s => dbAll(s)));
  const backup = {
    app: 'Sidekick', version: APP_VERSION, exportedAt: nowISO(),
    user: (currentUser && currentUser.username) || 'guest',
    settings: settings, theme: 'light',   // dark mode paused in M1.5; restore never flips theme
  };
  BACKUP_STORES.forEach((s, i) => { backup[s] = allByStore[i].filter(r => r.uid === uid); });
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sidekick-backup-${backup.user}-${todayISO()}.json`;
  a.click();
  logEvent('backup_exported');
  await saveSetting('lastBackupAt', nowISO());
  renderBackupReminder(); updateMoreNavBadge();   // clears the reminder immediately, no reload needed
  toast(t('exported'));
}
function pickBackupFile() { const inp = document.getElementById('backup-file'); if (inp) inp.click(); }

// Referenced stores first (targets), dependents after — shared ordering for
// both the delete phase and the insert-with-remap phase below.
const IMPORT_ORDER = ['clients', 'services', 'invoices', 'documents', 'packages',
  'jobs', 'bookings', 'followups', 'progressLogs', 'expenses', 'portfolio', 'research'];

// The delete-then-insert swap (with per-store oldId→newId remap of every
// id-based cross-reference, rollback on failure) that used to live inline in
// importBackup() — extracted so restoreFromCloud() (below) can drive the
// exact same, already id-remap-tested machinery from a cloud pull instead of
// a parsed backup file. The two sources look different (a JSON file dump vs.
// dataClient.js's pullAll() reshaping server rows) but reduce to the same
// shape once they reach here: a plain { storeName: [rows] } object.
//
// Only touches stores that are actually keys on `byStore` — importBackup()
// below still explicitly sets every BACKUP_STORES key (defaulting an absent
// one to []), so its behavior is unchanged (a backup missing a store's key
// still wipes that store locally, exactly as before). restoreFromCloud()
// deliberately does NOT include an 'expenses' key at all (dataClient.js's
// pullAll() has nothing to fetch for it — no server table exists), so this
// loop leaves local expenses completely untouched on a cloud restore rather
// than wiping them because the cloud has no copy.
//
// BE SURGICAL note for future edits: the remap logic below is the same code
// that shipped with the file-based restore and is covered by
// tests/check-blockers-p1.js's id-remap roundtrip — change it with that test
// in mind.
async function importDataset(byStore, uid) {
  const stores = IMPORT_ORDER.filter(s => Object.prototype.hasOwnProperty.call(byStore, s));
  const savedByStore = {};
  await Promise.all(stores.map(async s => {
    savedByStore[s] = (await dbAll(s)).filter(r => r.uid === uid);
  }));
  let linksReset = 0;
  let inserted = 0;
  try {
    // Delete every existing row across every store first, then add every new
    // row across every store — matches the original jobs/expenses swap so a
    // failed add always rolls back cleanly (every old id was already gone).
    for (const s of stores) { for (const row of savedByStore[s]) await dbDel(s, row.id); }
    // dbAdd() re-mints every autoincrement id, so every id-based
    // cross-reference in the dataset (jobs.clientId → clients.id, etc.)
    // would dangle if rows were re-added verbatim — the restore-corrupts-
    // relationships bug. The legacy-DB migration solved this with put()
    // (preserving ids), but a restore can't: the target DB may already own
    // those ids under another account. So: insert referenced stores first,
    // record oldId→newId per store, and rewrite every reference on the way
    // in. Cuid-based links (subTasks[].bookingCuid, bookings.jobCuid) ride
    // through untouched — cuids are globally unique and never re-minted.
    // A reference whose target row is missing from this batch is nulled
    // rather than left pointing at whatever row now happens to own that
    // id; those are counted and surfaced in the caller's success toast.
    //
    // 2026-07-16: TWO-TIER resolution, cuid first. A file-based backup's
    // rows only ever carry the raw id (oldId → newId, "same-file identity" —
    // meaningful because referrer and target came from the same export/
    // import batch). A real cloud pull (dataClient.js pullAll()) is
    // different: the id on e.g. a job's clientId is the MIRRORING DEVICE's
    // own local autoincrement id, meaningless on this device — but
    // fromJobRow() etc. now also attach a `__clientCuid` (etc.) transient
    // field carrying that ref's actual cuid, which IS globally stable
    // ("cross-device identity"). resolveRef() below tries that first; only
    // when no ref cuid was captured at all (a file backup, or a row
    // mirrored before this pass shipped) does it fall back to the same
    // oldId map file-based restores already relied on. Whichever tier
    // fires, the __*Cuid field itself is always stripped before dbAdd() —
    // it must never end up as a persisted column on the local record.
    const idMap = {};     // store -> Map(oldId -> newId): same-file identity.
    const cuidMap = {};   // store -> Map(cuid -> newId): cross-device identity.
    const remap = (store, oldId) => {
      if (oldId == null) return null;
      const m = idMap[store];
      if (m && m.has(oldId)) return m.get(oldId);
      linksReset++;
      return null;
    };
    // Resolves one ref (`rest[idField]`) using `rest[cuidField]` (a
    // __*Cuid transient field) if present, else falls back to remap() on
    // the raw id. A present-but-unresolvable ref cuid nulls the ref and
    // counts a reset WITHOUT ever consulting the raw id — a ref cuid that
    // was captured but can't be resolved means the target genuinely isn't
    // in this batch, same conclusion the id-only path would reach anyway.
    const resolveRef = (store, rest, idField, cuidField) => {
      const refCuid = rest[cuidField];
      delete rest[cuidField];
      if (refCuid != null) {
        const m = cuidMap[store];
        if (m && m.has(refCuid)) { rest[idField] = m.get(refCuid); return; }
        linksReset++;
        rest[idField] = null;
        return;
      }
      rest[idField] = remap(store, rest[idField]);
    };
    for (const s of stores) {
      idMap[s] = new Map();
      cuidMap[s] = new Map();
      for (const row of byStore[s]) {
        const { id, ...rest } = row;
        if (s === 'jobs') {
          resolveRef('clients', rest, 'clientId', '__clientCuid');
          resolveRef('services', rest, 'serviceId', '__serviceCuid');
          resolveRef('invoices', rest, 'invoiceId', '__invoiceCuid');
          resolveRef('documents', rest, 'quoteDocId', '__quoteDocCuid');
          resolveRef('packages', rest, 'packageId', '__packageCuid');
          // Residual gap, accepted this pass: nested milestone/timeEntry
          // invoiceIds are NOT mirrored as cuids (see sql/schema-core.sql's
          // jobs comment) — still id-only, still reset exactly as today.
          if (Array.isArray(rest.milestones)) rest.milestones = rest.milestones.map(m => ({ ...m, invoiceId: remap('invoices', m.invoiceId) }));
          if (Array.isArray(rest.timeEntries)) rest.timeEntries = rest.timeEntries.map(e => e.invoiceId != null ? { ...e, invoiceId: remap('invoices', e.invoiceId) } : e);
        } else if (s === 'bookings') {
          resolveRef('clients', rest, 'customerId', '__customerCuid');
        } else if (s === 'invoices') {
          resolveRef('clients', rest, 'clientId', '__clientCuid');
        } else if (s === 'documents') {
          resolveRef('clients', rest, 'clientId', '__clientCuid');
          resolveRef('invoices', rest, 'invoiceId', '__invoiceCuid');
        } else if (s === 'packages') {
          resolveRef('clients', rest, 'clientId', '__clientCuid');
          resolveRef('services', rest, 'serviceId', '__serviceCuid');
        } else if (s === 'progressLogs') {
          resolveRef('clients', rest, 'clientId', '__clientCuid');
        } else if (s === 'followups' && typeof rest.key === 'string') {
          // Keys embed ids as strings: `overdue:CID:INVID`, `draft:CID:INVID`,
          // `stale:CID:` — rewrite the embedded ids, leave unknown shapes as-is.
          // Residual gap, accepted this pass: no ref-cuid mirroring for
          // followups' embedded ids either — still id-only, same as today.
          const parts = rest.key.split(':');
          if ((parts[0] === 'overdue' || parts[0] === 'draft') && parts.length >= 3) {
            const c = remap('clients', parseInt(parts[1], 10)), i = remap('invoices', parseInt(parts[2], 10));
            if (c != null && i != null) rest.key = `${parts[0]}:${c}:${i}`;
          } else if (parts[0] === 'stale' && parts.length >= 2) {
            const c = remap('clients', parseInt(parts[1], 10));
            if (c != null) rest.key = `stale:${c}:${parts.slice(2).join(':')}`;
          }
        }
        const newId = await dbAdd(s, { ...rest, uid });
        if (id != null) idMap[s].set(id, newId);
        if (rest.cuid) cuidMap[s].set(rest.cuid, newId);
        inserted++;
      }
    }
  } catch (err) {
    // Roll back: restore the pre-import rows so a failed swap doesn't lose data.
    for (const s of stores) {
      for (const row of savedByStore[s]) { const {id, ...rest} = row; await dbAdd(s, {...rest, uid}).catch(()=>{}); }
    }
    throw err;
  }
  return { inserted, linksReset };
}

async function importBackup(inputEl) {
  const file = inputEl && inputEl.files && inputEl.files[0];
  inputEl.value = '';
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); }
  catch(e) { toast(t('restore_bad_file')); return; }
  // Accepts backups from either the current 'Sidekick' tag or the pre-rebrand
  // 'FreelanzGym' one, so a backup file exported before the rename still restores.
  if (!data || (data.app !== 'Sidekick' && data.app !== 'FreelanzGym') || !Array.isArray(data.jobs)) { toast(t('restore_bad_file')); return; }
  // Validate the ENTIRE payload before touching the DB: every row in every
  // store must be a plain, non-null object. Reject malformed backups up front
  // so a bad file (e.g. jobs:[null]) can never delete data mid-import. A
  // backup from an older app version simply won't have the newer stores'
  // keys — Array.isArray(undefined) is false, so those default to [].
  const isPlainObj = o => o != null && typeof o === 'object' && !Array.isArray(o);
  const byStore = {};
  for (const s of BACKUP_STORES) {
    const rows = Array.isArray(data[s]) ? data[s] : [];
    if (!rows.every(isPlainObj)) { toast(t('restore_bad_file')); return; }
    byStore[s] = rows;
  }
  const n = BACKUP_STORES.reduce((sum, s) => sum + byStore[s].length, 0);
  if (!confirm(t('restore_confirm').replace('{n}', n))) return;
  const uid = isGuest ? 'guest' : currentUser.id;
  let result;
  try {
    result = await importDataset(byStore, uid);
  } catch (err) {
    await reload();
    toast(t('restore_failed'));
    return;
  }
  // Do NOT import device-global prefs from another account's backup: the
  // top-level data.theme is intentionally ignored (no setTheme call) and the
  // 'lang' setting is skipped, so restoring never changes this device's
  // theme/language.
  if (data.settings && typeof data.settings === 'object') {
    for (const key of Object.keys(data.settings)) {
      if (key === 'lang' || key === 'workType') continue;
      await saveSetting(key, data.settings[key]);
    }
  }
  await reload();
  applyLang();
  toast(t('restore_done').replace('{n}', result.inserted)
    + (result.linksReset > 0 ? ' ' + t('backup_links_reset').replace('{n}', result.linksReset) : ''));
}

// ─── Cloud restore + Team read cutover (same mechanism) ────────────────
// lib/crudHandler.js's GET already resolves to the DATA OWNER's rows, not
// the caller's own (lib/teams.js's resolveDataOwner()) — a team member's
// pull already comes back as the org owner's data. That means "restore this
// device from the cloud" (a solo account after a wipe/reinstall) and "let
// staff see the owner's data" (Team plan) are literally the same operation
// from here: pull everything, then hand it to the exact same importDataset()
// swap importBackup() above already uses for a file-based restore. No
// separate "team view" code path to build or keep in sync.
async function restoreFromCloud() {
  if (isGuest || typeof SidekickBackend === 'undefined' || !SidekickBackend.isEnabled()) return;
  if (!confirm(t('restore_cloud_confirm'))) return;
  const pulled = await SidekickBackend.pullAll();
  if (!pulled.ok) { toast(t('restore_cloud_failed')); return; }
  const uid = isGuest ? 'guest' : currentUser.id;
  let result;
  try {
    result = await importDataset(pulled.byStore, uid);
  } catch (err) {
    await reload();
    toast(t('restore_failed'));
    return;
  }
  // Same device-global exclusions importBackup() applies above, same reason:
  // never let a restore change this device's language or persona (workType)
  // choice, even though both are legitimately stored server-side too.
  for (const row of pulled.settingsRows) {
    if (row.key === 'lang' || row.key === 'workType') continue;
    await saveSetting(row.key, row.value);
  }
  await reload();
  applyLang();
  let msg = t('restore_cloud_done').replace('{n}', result.inserted);
  if (result.linksReset > 0) msg += ' ' + t('backup_links_reset').replace('{n}', result.linksReset);
  if (pulled.failed && pulled.failed.length) msg += ' ' + t('restore_cloud_partial').replace('{stores}', pulled.failed.join(', '));
  toast(msg);
}
window.restoreFromCloud = restoreFromCloud;

// ─── NAV / SCREENS ────────────────────────────────────────────────────
function switchScreen(name) {
  if (name === 'insights' && !settings.insightsUnlocked) name = 'more';   // hidden dev-only screen — bounce direct navigation
  // M4 Pass P1: the standalone Tax screen (#s-tax) was folded into Docs as a
  // collapsible details block (#docs-tax-details, tax.js untouched — still
  // just fills #tax-body). switchScreen('tax') is kept as an alias so old
  // nav rows / onclick handlers / logEvent history referencing it can't
  // break: it opens Docs and expands+scrolls to the calculator instead of
  // landing on a screen that no longer exists.
  if (name === 'tax') { openDocsTaxCalculator(); return; }
  // Task flow + Calendar merge: #s-book is retired — Calendar is now a
  // third view on the pipeline screen (see plViewToggleHtml()/
  // renderPipelineCalendarView()). Kept as an alias (same pattern as 'tax'
  // above) so every existing switchScreen('book') caller (Home's
  // next-booking row, tests) keeps working unchanged.
  if (name === 'book') { switchScreen('pipeline'); setPipelineView('calendar'); return; }
  logEvent('screen_view:' + name);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
  document.getElementById('s-'+name)?.classList.add('active');
  const navBtn = document.getElementById('nav-'+name);
  if (navBtn) { navBtn.classList.add('active'); navBtn.setAttribute('aria-current','page'); }
  const fab = document.getElementById('fab');
  if (fab) fab.style.display = (name === 'home' || name === 'pipeline') ? 'flex' : 'none';
  if (name === 'home') renderHome();
  if (name === 'customers') renderCustomers();
  if (name === 'services') renderServices();
  if (name === 'pipeline' && typeof renderPipeline === 'function') renderPipeline();
  // TSK-002/007 More/Settings rebuild: the root screen ('more') now only
  // hosts the account card + "Set up your business" drill-in rows (with
  // live status pills) + Preferences + About — everything that used to be
  // a <details> block on this same screen moved into one of the drill-in
  // sub-screens below (TSK-020 added a 5th, Tools, moving the old Tools
  // grid off root entirely). Root still needs every one of these render
  // calls (payment channels / LINE / team / shop / slip-verify / etc.)
  // because their status feeds the root's status pills even though their
  // markup now lives on the sub-screen — see updatePaymentsPill()/
  // updateLineTeamPill()/renderDataBackupStatus() called from inside those
  // functions.
  if (name === 'more' && typeof renderWorkflowControls === 'function') renderWorkflowControls();
  if (name === 'more') renderBackupReminder();
  if (name === 'more') renderCloudBackupSection();
  if (name === 'more') renderSubscriptionSection();
  if (name === 'more') renderCardWaitlistSection();
  if (name === 'more') renderSellerLogoSection();
  if (name === 'more') renderLineChannelSection();
  if (name === 'more') renderTeamSection();
  if (name === 'more') renderShopSection();
  if (name === 'more') renderSlipVerifySection();
  if (name === 'more') renderPaymentChannels();
  if (name === 'more') renderDataBackupStatus();
  if (name === 'more') renderThemeSeg();
  // Drill-in sub-screens: re-render their own sections fresh on every visit
  // (not just via root) so direct/back-forward navigation never shows stale
  // data — all of these are idempotent and cheap.
  if (name === 'more-biz' && typeof renderWorkflowControls === 'function') renderWorkflowControls();
  if (name === 'more-biz') renderSellerLogoSection();
  if (name === 'more-pay') renderPaymentChannels();
  if (name === 'more-pay') renderShopSection();
  if (name === 'more-pay') renderSlipVerifySection();
  if (name === 'more-line') renderLineChannelSection();
  if (name === 'more-line') renderTeamSection();
  if (name === 'more-data') renderDataBackupStatus();
  // TSK-020: Tools relocated off More's root into its own drill-in — same
  // idempotent re-render-on-every-visit treatment as the 4 above.
  if (name === 'more-tools') applyInsightsVisibility();
  if (name === 'more-tools') renderFollowupsTile();
  if (name === 'insights') renderInsights();
  // M2 modules (tax.js / invoices.js / docgen.js). Guarded so a not-yet-loaded
  // module can't crash navigation.
  if (name === 'invoices' && typeof renderInvoices === 'function') renderInvoices();
  if (name === 'docs' && typeof renderDocgen === 'function') renderDocgen();
  // Tax calculator now lives inside Docs (#docs-tax-details) — render it
  // whenever the Docs screen shows so it's ready the moment the details
  // block is expanded (either by hand or via openDocsTaxCalculator()).
  if (name === 'docs' && typeof renderTax === 'function') renderTax();
  // M4 Pass P4: the annual tax roll-up is a second block inside the same
  // details area — render it alongside the calculator above.
  if (name === 'docs' && typeof renderTaxRollup === 'function') renderTaxRollup();
  // M3 modules (followups.js / portfolio.js). bookings.js's renderBookings()
  // is no longer called from here — 'book' is aliased above into the
  // pipeline's Calendar view, which calls it itself.
  if (name === 'followups' && typeof renderFollowups === 'function') renderFollowups();
  if (name === 'portfolio' && typeof renderPortfolio === 'function') renderPortfolio();
  // M5 module (research.js).
  if (name === 'research' && typeof renderResearch === 'function') renderResearch();
  window.scrollTo(0, 0);
}
// M4 Pass P1: switchScreen('tax') alias target — see the comment at the top
// of switchScreen(). Opens Docs, expands the tax calculator's details
// block (re-rendering it, in case renderTax() wasn't defined yet the last
// time Docs rendered), and scrolls it into view.
function openDocsTaxCalculator() {
  logEvent('screen_view:tax');
  switchScreen('docs');
  const det = document.getElementById('docs-tax-details');
  if (det) {
    det.open = true;
    if (typeof renderTax === 'function') renderTax();
    if (typeof renderTaxRollup === 'function') renderTaxRollup();
    det.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
window.openDocsTaxCalculator = openDocsTaxCalculator;
// ─── i18n render pass ─────────────────────────────────────────────────
function applyLang() {
  const lang = curLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  const hintEl = document.getElementById('auth-hint-text');
  if (hintEl) hintEl.innerHTML = t('auth_hint');
  const submitBtn = document.getElementById('auth-submit');
  if (submitBtn) submitBtn.textContent = authMode === 'register' ? t('create_account') : t('login');
  // M4 Pass P4: the tax roll-up (unlike tax.js's English-only calculator)
  // is fully localized — keep it in sync with a live language switch too,
  // not just the next time Docs re-renders.
  try { if (currentUser) { renderHome(); applyUser(); renderPaymentChannels(); if (typeof renderTaxRollup === 'function') renderTaxRollup(); } } catch(e) {}
}

// ─── UTILS ────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}

// ─── PWA: service worker (registered relatively) ──────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW register failed', err));
  });
}

// close modals on overlay click
document.getElementById('modal-job')?.addEventListener('click', function(e) {
  if (e.target === this) closeJobModal();
});
document.getElementById('modal-customer')?.addEventListener('click', function(e) {
  if (e.target === this) closeCustomerModal();
});
document.getElementById('modal-service')?.addEventListener('click', function(e) {
  if (e.target === this) closeServiceModal();
});
// submit auth with Enter (login.html)
['auth-user','auth-pass','auth-confirm'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });
});

// ─── START ────────────────────────────────────────────────────────────
boot();
