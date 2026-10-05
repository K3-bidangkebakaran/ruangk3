/* Portal PIC – aplikasi lapangan PIC (ruangk3.com/pic/).
   Alur: admin utama menginput kegiatan di lembar Input Kegiatan (Daftar Hadir) + membuat akun PIC → semua PIC melihat semua kegiatan; PIC login sekali (butuh sinyal) → kegiatan tersimpan di HP →
   PIC mengisi absensi TTD peserta (status Hadir/Remedial/Cancel), TTD PIC, dan foto dokumentasi, boleh tanpa sinyal →
   begitu ada sinyal, hasil terkirim otomatis ke Firebase; aplikasi Daftar Hadir (admin) menariknya ke kegiatan yang sama, lalu Word/PDF dan Google Drive memakai alur yang sudah ada.
   Semua data kerja disimpan di IndexedDB "portal-pic". */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fnv = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + ':' + str.length; };
const LOGO = 'icons/icon-192.png';

/* ---------- penyimpanan lokal (IndexedDB) ---------- */
let dbP = null;
function db() {
  if (!dbP) dbP = new Promise((res, rej) => {
    try { const r = indexedDB.open('portal-pic', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
    catch (e) { rej(e); }
  });
  return dbP;
}
async function idb(mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('kv', mode), q = fn(tx.objectStore('kv')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); }
const iGet = k => idb('readonly', s => s.get(k)).catch(() => null);
const iPut = (k, v) => idb('readwrite', s => s.put(v, k)).catch(() => {});
const iDel = k => idb('readwrite', s => s.delete(k)).catch(() => {});

/* ---------- keadaan ---------- */
let ME = null;            // {uid, nama, user}
let KEGS = {};            // kid -> kegiatan dari server
let H = {};               // kid -> hasil kerja di HP
let P = { screen: 'login', kid: null, day: 0, q: '', err: '' };
let syncing = false, syncErr = '', lastSync = 0, pullErr = '';
const newH = () => ({ batal: {}, remedial: {}, hadir: {}, foto: {}, ttdPic: '', ttdPicNama: '', upd: 0, rev: 0, dirty: false, sent: {} });
// batal: PIC bisa menandai (true) atau mencabut (false) secara eksplisit; bila belum disentuh, ikut tanda dari admin (peserta.batal)
const isBatal = (h, p) => (p.id in h.batal) ? !!h.batal[p.id] : !!p.batal;
// Remedial (baris kuning di daftar hadir): hanya tanda tangan di HARI TERAKHIR; Cancel (merah) tidak ikut absensi.
const isRem = (h, p) => !isBatal(h, p) && ((h.remedial && p.id in h.remedial) ? !!h.remedial[p.id] : !!p.remedial);
const perluHari = (h, p, d, days) => !isBatal(h, p) && (!isRem(h, p) || d === days[days.length - 1]);
const hOf = kid => (H[kid] = H[kid] || newH());
const saveH = kid => iPut('h:' + kid, H[kid]);
const saveK = () => iPut('kegs', KEGS);
const online = () => navigator.onLine !== false;

/* ---------- tanggal ---------- */
const fm = (iso, o) => new Intl.DateTimeFormat('id-ID', o).format(new Date(iso + 'T00:00:00'));
const tglPanjang = i => fm(i, { day: 'numeric', month: 'long', year: 'numeric' });
const tglPendek = i => fm(i, { day: 'numeric', month: 'short' });
const hariNama = i => fm(i, { weekday: 'long' });
function rentang(d) {
  if (!d || !d.length) return '';
  if (d.length < 2) return tglPanjang(d[0]);
  const a = new Date(d[0] + 'T00:00:00'), b = new Date(d[d.length - 1] + 'T00:00:00');
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? `${a.getDate()} – ${tglPanjang(d[d.length - 1])}` : `${tglPendek(d[0])} – ${tglPanjang(d[d.length - 1])}`;
}
const todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const jamNow = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0'); };

/* ---------- ikon ---------- */
const I = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  pen: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 11-11a2.1 2.1 0 00-3-3L5 16l-1 4z"/><path d="M14 7l3 3"/></svg>',
  cam: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/></svg>',
  list: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6.2l1 1 1.8-2M4 12.2l1 1 1.8-2M4 18.2l1 1 1.8-2"/></svg>',
  chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  pensm: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 11-11a2.1 2.1 0 00-3-3L5 16l-1 4z"/><path d="M14 7l3 3"/></svg>',
};

/* ---------- hitung ---------- */
function stat(kid) {
  const k = KEGS[kid], h = hOf(kid), peserta = (k && k.peserta) || [], days = (k && k.tgl) || [];
  const aktif = peserta.filter(p => !isBatal(h, p));
  let ttd = 0, ttdTotal = 0; aktif.forEach(p => days.forEach(d => { if (!perluHari(h, p, d, days)) return; ttdTotal++; if (h.hadir[p.id] && h.hadir[p.id][d]) ttd++; }));
  return { aktif: aktif.length, batal: peserta.length - aktif.length, remedial: aktif.filter(p => isRem(h, p)).length, ttd, ttdTotal, foto: aktif.filter(p => h.foto[p.id]).length, ttdPic: !!h.ttdPic };
}
function statusKeg(kid) {
  const s = stat(kid);
  if (!s.ttd && !s.foto && !s.ttdPic && !s.batal) return ['Belum mulai', ''];
  if (s.ttdTotal && s.ttd >= s.ttdTotal && s.foto >= s.aktif && s.ttdPic) return ['Lengkap', 'ok'];
  return ['Berjalan', 'warn'];
}
const mediaList = h => {
  const out = [];
  Object.keys(h.hadir).forEach(pid => Object.keys(h.hadir[pid]).forEach(d => { if (h.hadir[pid][d]) out.push([`s_${pid}_${d}`, h.hadir[pid][d]]); }));
  Object.keys(h.foto).forEach(pid => { if (h.foto[pid]) out.push([`f_${pid}`, h.foto[pid]]); });
  if (h.ttdPic) out.push(['pic', h.ttdPic]);
  return out;
};
function pending() {
  let n = 0;
  Object.keys(H).forEach(kid => {
    if (!KEGS[kid]) return; const h = H[kid];
    mediaList(h).forEach(([k, d]) => { if (h.sent[k] !== fnv(d)) n++; });
    if (h.dirty) n++;
  });
  return n;
}
const flags = h => {
  const hadir = {}; Object.keys(h.hadir).forEach(pid => { const m = {}; Object.keys(h.hadir[pid]).forEach(d => { if (h.hadir[pid][d]) m[d] = 1; }); if (Object.keys(m).length) hadir[pid] = m; });
  const foto = {}; Object.keys(h.foto).forEach(pid => { if (h.foto[pid]) foto[pid] = 1; });
  return { batal: h.batal, remedial: h.remedial || {}, hadir, foto, ttdPic: !!h.ttdPic, ttdPicNama: h.ttdPicNama || '', picNama: (ME && ME.nama) || '', upd: h.upd, rev: h.rev };
};

/* ---------- toast ---------- */
let tT = 0;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => t.classList.remove('show'), 2800); }

/* ---------- sinkron ke server ---------- */
const fbOk = () => !!window.PicFB && !!ME && window.PicFB.uid() === ME.uid;
function friendlyErr(e) {
  const m = String((e && (e.code || e.message)) || e || '');
  if (/PERMISSION_DENIED|permission/i.test(m)) return 'Aturan Firebase untuk Portal PIC belum dipasang oleh admin.';
  if (/network|timeout|terputus|lambat|fetch/i.test(m)) return 'Sinyal lemah. Akan dicoba lagi.';
  return 'Belum terkirim. Akan dicoba lagi.';
}
let retryT = 0;
async function sync() {
  if (ME && window.PicFB && !window.PicFB.uid() && online() && pending()) { syncErr = 'Sesi login berakhir. Hubungi admin atau masuk ulang.'; renderPill(); return; }
  if (syncing || !fbOk() || !online()) { renderPill(); return; }
  if (!pending()) { renderPill(); return; }
  syncing = true; syncErr = ''; renderPill();
  try {
    for (const kid of Object.keys(H)) {
      if (!KEGS[kid]) continue;
      const h = H[kid];
      for (const [key, data] of mediaList(h)) {
        const hs = fnv(data);
        if (h.sent[key] !== hs) { await window.PicFB.putMedia(kid, key, data); h.sent[key] = hs; await saveH(kid); renderPill(); }
      }
      if (h.dirty) {
        const upd = h.upd;
        await window.PicFB.putHasil(kid, flags(h));
        if (h.upd === upd) h.dirty = false;
        await saveH(kid);
      }
    }
    lastSync = Date.now(); syncErr = '';
  } catch (e) {
    syncErr = friendlyErr(e); clearTimeout(retryT); retryT = setTimeout(sync, 30000);
  } finally { syncing = false; renderPill(); if (pending() && !syncErr && online()) setTimeout(sync, 500); }
}
function touch(kid) { const h = hOf(kid); h.upd = Date.now(); h.rev = (h.rev || 0) + 1; h.dirty = true; saveH(kid); renderPill(); setTimeout(sync, 1200); }

async function restore(kid) { // HP baru / data lokal hilang: ambil kembali hasil yang sudah ada di server
  try {
    const sv = await window.PicFB.hasil(kid); if (!sv) return;
    const media = await window.PicFB.media(kid);
    const h = newH(); h.batal = sv.batal || {}; h.remedial = sv.remedial || {}; h.ttdPicNama = sv.ttdPicNama || ''; h.upd = sv.upd || 0; h.rev = sv.rev || 0;
    const own = key => { // hanya gambar yang tercatat di hasil akun ini (gambar PIC lain tidak ikut)
      if (key === 'pic') return !!sv.ttdPic;
      if (key.startsWith('f_')) return !!(sv.foto && sv.foto[key.slice(2)]);
      if (key.startsWith('s_') && key.length > 13) { const date = key.slice(-10), pid = key.slice(2, -11); return !!(sv.hadir && sv.hadir[pid] && sv.hadir[pid][date]); }
      return false;
    };
    Object.keys(media).forEach(key => {
      const d = media[key]; if (typeof d !== 'string' || !own(key)) return;
      if (key === 'pic') h.ttdPic = d;
      else if (key.startsWith('f_')) h.foto[key.slice(2)] = d;
      else { const date = key.slice(-10), pid = key.slice(2, -11); (h.hadir[pid] = h.hadir[pid] || {})[date] = d; }
      h.sent[key] = fnv(d);
    });
    H[kid] = h; await saveH(kid); render();
  } catch (e) { /* dicoba lagi saat tarik data berikutnya */ }
}

async function pull() {
  if (!fbOk() || !online()) return;
  try {
    const [srv, prof] = await Promise.all([window.PicFB.kegiatan(), window.PicFB.profile(ME.uid)]);
    if (!prof) { await doLogout(true, 'Akun PIC ini sudah dihapus oleh admin utama.'); return; }
    if (prof.aktif === false) { await doLogout(true, 'Akun ini dinonaktifkan oleh admin utama.'); return; }
    if (prof.nama && prof.nama !== ME.nama) { ME.nama = prof.nama; iPut('me', ME); }
    const baru = [];
    Object.keys(srv).forEach(kid => { const k = srv[kid]; k.id = kid; if (!KEGS[kid]) baru.push(kid); KEGS[kid] = k; });
    Object.keys(KEGS).forEach(kid => { // dihapus admin: buang dari HP bila tidak ada data yang belum terkirim
      if (srv[kid]) return;
      const h = H[kid]; if (h && (h.dirty || mediaList(h).some(([k, d]) => h.sent[k] !== fnv(d)))) return;
      delete KEGS[kid]; delete H[kid]; iDel('h:' + kid);
    });
    await saveK(); pullErr = '';
    baru.forEach(kid => { if (!H[kid]) restore(kid); });
    render();
  } catch (e) { pullErr = friendlyErr(e); }
}

/* ---------- login / keluar ---------- */
async function doLogin(user, pw) {
  if (!window.PicFB) throw new Error(online() ? 'Layanan login belum siap. Muat ulang aplikasi lalu coba lagi.' : 'Tidak ada sinyal. Masuk pertama kali membutuhkan internet.');
  const me = await window.PicFB.login(user, pw);
  ME = me; await iPut('me', ME);
  P = { screen: 'home', kid: null, day: 0, q: '', err: '' };
  render(); pull(); sync();
}
async function doLogout(force, msg) {
  if (!force && pending()) { askLogout(); return; }
  try { if (window.PicFB) await window.PicFB.logout(); } catch (e) {}
  ME = null; KEGS = {}; const ks = Object.keys(H); H = {};
  await iDel('me'); await iDel('kegs'); await Promise.all(ks.map(k => iDel('h:' + k)));
  P = { screen: 'login', kid: null, day: 0, q: '', err: msg || '' }; render();
}
function askLogout() {
  const o = $('#ovl'); const n = pending();
  o.innerHTML = `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true"><b style="font-family:var(--f-display);font-size:17px">Keluar dari aplikasi?</b>
    <div class="hint">Masih ada <b>${n}</b> data yang belum terkirim ke server. Bila keluar sekarang, data itu hilang dari HP ini. Sebaiknya tunggu sampai ada sinyal.</div>
    <div class="row end"><button class="btn" data-act="padno">Batal</button><button class="btn bad" data-act="logoutforce">Tetap keluar</button></div></div></div>`;
}

function askPw() {
  $('#ovl').innerHTML = `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true" aria-label="Ganti kata sandi"><b style="font-family:var(--f-display);font-size:17px">Ganti kata sandi</b>
    <div class="hint">Butuh sinyal. Kata sandi baru minimal 6 karakter.</div>
    <div class="field"><label for="pwOld">Kata sandi sekarang</label><input id="pwOld" type="password" autocomplete="current-password"></div>
    <div class="field"><label for="pwNew">Kata sandi baru</label><input id="pwNew" type="password" autocomplete="new-password"></div>
    <div class="err" id="pwErr" role="alert"></div>
    <div class="row end"><button class="btn" data-act="padno">Batal</button><button class="btn pri" data-act="pwok" id="pwBtn">Simpan</button></div></div></div>`;
}
async function savePw() {
  const o = $('#pwOld').value, n = $('#pwNew').value, er = $('#pwErr');
  if (n.length < 6) { er.textContent = 'Kata sandi baru minimal 6 karakter.'; return; }
  if (!online() || !window.PicFB) { er.textContent = 'Tidak ada sinyal. Coba lagi saat online.'; return; }
  $('#pwBtn').disabled = true;
  try { await window.PicFB.changePassword(o, n); $('#ovl').innerHTML = ''; toast('Kata sandi diganti.'); }
  catch (e) { er.textContent = (e && e.message) || 'Gagal mengganti kata sandi.'; $('#pwBtn').disabled = false; }
}

/* ---------- tampilan ---------- */
function pillHtml() {
  const n = pending();
  if (syncErr) return `<button type="button" class="sync err" data-act="sync" title="${esc(syncErr)}"><span class="dot"></span>${n} belum terkirim</button>`;
  if (!online()) return `<button type="button" class="sync off" data-act="sync"><span class="dot"></span>Offline${n ? ` · ${n} menunggu` : ''}</button>`;
  if (syncing) return `<button type="button" class="sync send" data-act="sync"><span class="dot"></span>Mengirim…</button>`;
  if (n) return `<button type="button" class="sync send" data-act="sync"><span class="dot"></span>${n} menunggu</button>`;
  return `<button type="button" class="sync ok" data-act="sync"><span class="dot"></span>Tersinkron</button>`;
}
function renderPill() { $$('.sync').forEach(el => { el.outerHTML = pillHtml(); }); }
const appbar = (title, sub, back) => `<div class="appbar">${back ? `<button type="button" class="back" data-act="back" aria-label="Kembali">${I.back}</button>` : `<img src="${LOGO}" alt="LPMI">`}<div class="ttl"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>${ME ? pillHtml() : ''}</div>`;
const bar = (lbl, a, b) => `<div class="bar${b && a >= b ? ' full' : ''}"><span style="font-weight:500;color:var(--muted)">${lbl}</span><i><b style="width:${b ? Math.min(100, Math.round(a / b * 100)) : 0}%"></b></i><span>${a}/${b}</span></div>`;

function render() {
  const app = $('#app'); if (!app) return;
  if (!ME) P.screen = 'login';
  const kid = P.kid, k = kid && KEGS[kid];
  if (['keg', 'abs', 'pic', 'dok'].includes(P.screen) && !k) P.screen = 'home';
  let h = '';
  if (P.screen === 'login') {
    h = `<div class="screen login"><div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px"><img class="logo" src="${LOGO}" alt="LPMI"><h2 style="font-size:26px">Portal PIC</h2><div class="hint">PT Lintas Pengembangan Manajemen Indonesia</div></div>
      <form id="fLogin" style="display:flex;flex-direction:column;gap:14px" autocomplete="off">
      <div class="hint">Akun dibuat oleh admin utama. Masuk sekali saat ada sinyal; setelah itu aplikasi bisa dipakai tanpa sinyal.</div>
      <div class="field"><label for="lUser">Email atau username</label><input id="lUser" autocapitalize="none" autocomplete="username" spellcheck="false" inputmode="email"></div>
      <div class="field"><label for="lPw">Kata sandi</label><input id="lPw" type="password" autocomplete="current-password"></div>
      ${P.err ? `<div class="err" role="alert">${esc(P.err)}</div>` : ''}
      <button class="btn pri" type="submit" style="min-height:48px" id="bLogin">Masuk</button></form>
      ${online() ? '' : '<div class="pill warn">Tidak ada sinyal</div>'}</div>`;
  } else if (P.screen === 'home') {
    const hari = todayIso(), qq = (P.hq || '').trim().toLowerCase();
    const akhir = x => (x.tgl && x.tgl[x.tgl.length - 1]) || '', awal = x => (x.tgl && x.tgl[0]) || '';
    const all = Object.values(KEGS);
    // yang sedang/akan berlangsung di atas (terdekat dulu), lalu yang sudah lewat (terbaru dulu)
    const list = all.filter(x => !qq || String(x.nama).toLowerCase().includes(qq) || String(x.tempat || '').toLowerCase().includes(qq))
      .sort((a, b) => { const ua = akhir(a) >= hari, ub = akhir(b) >= hari; if (ua !== ub) return ua ? -1 : 1; return ua ? awal(a).localeCompare(awal(b)) : awal(b).localeCompare(awal(a)); });
    h = appbar('Portal PIC', ME.nama, false) + `<div class="screen"><div class="hello"><h2>Daftar kegiatan</h2><p class="hint" style="margin:4px 0 0">${qq ? `${list.length} dari ${all.length} kegiatan` : `${all.length} kegiatan dari admin utama`}.</p></div>
      ${all.length > 4 ? `<div class="field"><input id="homeQ" type="search" placeholder="Cari nama kegiatan atau tempat" aria-label="Cari kegiatan" value="${esc(P.hq || '')}"></div>` : ''}
      ${list.length ? list.map(x => { const s = stat(x.id), st = statusKeg(x.id); return `<button type="button" class="kcard" data-act="open" data-id="${esc(x.id)}"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h3>${esc(x.nama)}</h3><span class="pill ${st[1]}">${st[0]}</span></div>
        <div class="meta"><span>${esc(rentang(x.tgl))}</span><span>${esc(x.tempat || '')}</span><span>${(x.peserta || []).length} peserta</span></div>
        <div class="bars">${bar('TTD peserta', s.ttd, s.ttdTotal)}${bar('Foto', s.foto, s.aktif)}${bar('TTD PIC', s.ttdPic ? 1 : 0, 1)}</div></button>`; }).join('')
        : `<div class="empty">${qq ? 'Tidak ada kegiatan yang cocok.' : 'Belum ada kegiatan. Semua kegiatan yang diinput admin utama muncul di sini begitu HP mendapat sinyal.'}</div>`}
      ${pullErr && !online() ? '' : (pullErr ? `<div class="err">${esc(pullErr)}</div>` : '')}
      <button class="btn" type="button" data-act="refresh">Perbarui daftar kegiatan</button>
      <button class="btn" type="button" data-act="pw">Ganti kata sandi</button>
      <button class="btn" type="button" data-act="logout">Keluar</button></div>`;
  } else if (P.screen === 'keg') {
    const s = stat(kid);
    h = appbar(k.nama, rentang(k.tgl) + (k.tempat ? ' · ' + k.tempat : ''), true) + `<div class="screen">
      <button type="button" class="tile" data-act="go" data-to="abs"><span class="ic">${I.list}</span><span><b>Absensi TTD Peserta</b><small>${s.ttd}/${s.ttdTotal} tanda tangan${s.batal ? ` · ${s.batal} cancel` : ''}</small></span>${I.chev}</button>
      <button type="button" class="tile" data-act="go" data-to="pic"><span class="ic">${I.pen}</span><span><b>TTD PIC</b><small>${s.ttdPic ? 'Sudah ditandatangani' : 'Belum ditandatangani'}</small></span>${I.chev}</button>
      <button type="button" class="tile" data-act="go" data-to="dok"><span class="ic">${I.cam}</span><span><b>Dokumentasi Peserta</b><small>${s.foto}/${s.aktif} foto diambil</small></span>${I.chev}</button>
      <div class="bars" style="padding:4px 2px">${bar('TTD peserta', s.ttd, s.ttdTotal)}${bar('Foto', s.foto, s.aktif)}${bar('TTD PIC', s.ttdPic ? 1 : 0, 1)}</div>
      <p class="hint">Semua isian tersimpan di HP lebih dulu, lalu dikirim otomatis saat ada sinyal.</p></div>`;
  } else if (P.screen === 'abs') {
    const days = k.tgl || [], d = days[P.day] || days[0] || '';
    h = appbar('Absensi TTD Peserta', k.nama, true) + `<div class="screen">
      ${days.length > 1 ? `<div class="chips" role="tablist">${days.map((t, i) => `<button type="button" role="tab" data-act="day" data-i="${i}" aria-selected="${i === P.day}">Hari ${i + 1} · ${esc(tglPendek(t))}</button>`).join('')}</div>` : (d ? `<div class="hint">${esc(hariNama(d))}, ${esc(tglPanjang(d))}</div>` : '')}
      <div class="counter" id="absCount"></div>
      <div class="field"><input id="absQ" type="search" placeholder="Cari nama peserta" aria-label="Cari nama peserta" value="${esc(P.q)}"></div>
      <div class="ahead"><span>Status</span><span>Peserta</span><span style="text-align:center">TTD</span></div>
      <div class="alist" id="absList"></div>
      <p class="hint">Ketuk tombol <b>Status</b> untuk mengganti: <b>Hadir</b> → <b>Remedial</b> (baris kuning, hanya tanda tangan di hari terakhir) → <b>Cancel</b> (baris merah, tidak jadi ikut) → Hadir. Warna ini tercetak di daftar hadir beserta kolom Keterangan.</p></div>`;
  } else if (P.screen === 'pic') {
    const hh = hOf(kid);
    h = appbar('TTD PIC', k.nama, true) + `<div class="screen">
      ${hh.ttdPic ? `<div style="text-align:center;border:1px solid var(--line);border-radius:14px;padding:14px"><small>Tanda tangan tersimpan</small><div class="sigbtn done" style="margin:8px auto;max-width:300px;min-height:100px;border-style:solid"><img src="${hh.ttdPic}" alt="TTD PIC" style="max-height:90px"></div><b>${esc(hh.ttdPicNama || ME.nama)}</b><br><small>PIC kegiatan</small></div><button class="btn" type="button" data-act="ttdpic">Ganti tanda tangan</button>`
      : `<div class="empty">Belum ada tanda tangan PIC.<br>Tanda tangan setelah absensi selesai.</div><button class="btn pri" type="button" data-act="ttdpic" style="min-height:48px">Tanda tangan sekarang</button>`}
      <p class="hint">Tanda tangan dan nama PIC tercetak di bagian bawah daftar hadir.</p></div>`;
  } else if (P.screen === 'dok') {
    const s = stat(kid), hh = hOf(kid);
    h = appbar('Dokumentasi Peserta', k.nama, true) + `<div class="screen"><div class="row" style="align-items:center"><span class="pill ${s.foto === s.aktif && s.aktif ? 'ok' : ''}">${s.foto}/${s.aktif} foto</span></div>
      <div class="photos">${(k.peserta || []).map(p => { const cx = isBatal(hh, p), f = hh.foto[p.id]; return `<div class="ph${cx ? ' cx' : ''}"><div class="img">${f ? `<img src="${f}" alt="Foto ${esc(p.nama)}">` : (cx ? 'Batal ikut' : 'Belum ada foto')}</div><div class="cap"><b>${esc(p.nama)}</b>${cx ? '<span class="pill bad">Batal</span>' : `<button type="button" class="btn sm" data-act="foto" data-pid="${esc(p.id)}" aria-label="${f ? 'Ganti' : 'Ambil'} foto ${esc(p.nama)}">${f ? 'Ganti foto' : 'Ambil foto'}</button>`}</div></div>`; }).join('')}</div>
      <p class="hint">Foto diambil langsung dari kamera dan otomatis diberi watermark: nama peserta, kegiatan, titik lokasi (koordinat Google Maps), tanggal, dan jam. Ukurannya diperkecil agar cepat terkirim di sinyal lemah.</p></div>`;
  }
  app.innerHTML = h + '<div id="ovl"></div>';
  if (P.screen === 'abs') renderAbs();
  if (P.screen === 'login') $('#lUser').focus();
}

function renderAbs() {
  const kid = P.kid, k = KEGS[kid]; if (!k) return;
  const h = hOf(kid), days = k.tgl || [], d = days[P.day] || days[0] || '', q = P.q.trim().toLowerCase(), s = stat(kid);
  const peserta = k.peserta || [], perlu = peserta.filter(p => perluHari(h, p, d, days));
  const sudah = perlu.filter(p => h.hadir[p.id] && h.hadir[p.id][d]).length;
  $('#absCount').innerHTML = `<div><b>${sudah}</b><small>Sudah TTD</small></div><div><b>${perlu.length - sudah}</b><small>Belum TTD</small></div><div><b>${s.remedial}</b><small>Remedial</small></div><div><b style="color:${s.batal ? 'var(--bad)' : 'inherit'}">${s.batal}</b><small>Cancel</small></div>`;
  const rows = peserta.filter(p => !q || p.nama.toLowerCase().includes(q) || String(p.instansi || '').toLowerCase().includes(q));
  $('#absList').innerHTML = rows.length ? rows.map(p => {
    const cx = isBatal(h, p), rm = isRem(h, p), g = h.hadir[p.id] && h.hadir[p.id][d], lewat = rm && !perluHari(h, p, d, days);
    const st = cx ? 'Cancel' : rm ? 'Remedial' : 'Hadir', cls = cx ? ' cx' : rm ? ' rm' : '';
    return `<div class="arow${cls}" data-pid="${esc(p.id)}"><button type="button" class="stbtn${cx ? ' cx' : rm ? ' rm' : ''}" data-act="status" aria-label="Status ${esc(p.nama)}: ${st}. Ketuk untuk mengganti">${st}</button>
      <div class="who"><b>${esc(p.nama)}</b><small>${esc(p.instansi || '')}</small></div>
      <div>${lewat ? `<div class="sigbtn" style="border-style:solid;border-color:var(--line);font-size:11px;text-align:center;opacity:.8">Hanya hari terakhir</div>` : g ? `<button type="button" class="sigbtn done" data-act="sig" aria-label="Ganti tanda tangan ${esc(p.nama)}"><img src="${g}" alt="TTD ${esc(p.nama)}"></button>` : `<button type="button" class="sigbtn" data-act="sig">${I.pensm} Tanda tangan</button>`}</div></div>`;
  }).join('') : `<div class="empty">${peserta.length ? 'Tidak ada nama yang cocok.' : 'Belum ada peserta di kegiatan ini.'}</div>`;
}

/* ---------- bantalan tanda tangan ---------- */
let padApi = null;
function openPad(title, sub, onSave, existing) {
  const o = $('#ovl');
  o.innerHTML = `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div><b style="font-family:var(--f-display);font-size:17px">${esc(title)}</b><br><small>${esc(sub)}</small></div>
   <canvas class="pad" id="pad" aria-label="Area tanda tangan"></canvas><div class="hint" id="padHint">Tanda tangan di dalam kotak dengan jari.</div>
   <div class="row end"><button type="button" class="btn" data-act="padno">Batal</button><button type="button" class="btn" data-act="padclr">Hapus</button><button type="button" class="btn pri" data-act="padok">Simpan</button></div></div></div>`;
  const c = $('#pad'); c.width = 600; c.height = 240;
  const x = c.getContext('2d'); x.strokeStyle = '#14233a'; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round';
  let down = false, ink = false, lx = 0, ly = 0;
  if (existing) { const im = new Image(); im.onload = () => { x.drawImage(im, 0, 0, 600, 240); ink = true; }; im.src = existing; }
  const pos = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * 600 / r.width, (e.clientY - r.top) * 240 / r.height]; };
  c.addEventListener('pointerdown', e => { down = true; c.setPointerCapture(e.pointerId); [lx, ly] = pos(e); x.beginPath(); x.arc(lx, ly, 2.4, 0, 7); x.fillStyle = '#14233a'; x.fill(); ink = true; });
  c.addEventListener('pointermove', e => { if (!down) return; const [nx, ny] = pos(e); x.beginPath(); x.moveTo(lx, ly); x.lineTo(nx, ny); x.stroke(); lx = nx; ly = ny; });
  const up = () => { down = false; }; c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  const close = () => { $('#ovl').innerHTML = ''; padApi = null; };
  padApi = {
    clear() { x.clearRect(0, 0, 600, 240); ink = false; },
    ok() { if (!ink) { const hn = $('#padHint'); hn.textContent = 'Tanda tangan masih kosong.'; hn.className = 'err'; return; } const u = c.toDataURL('image/png'); close(); onSave(u); },
    no: close,
  };
}

/* ---------- foto: kamera langsung + watermark ---------- */
let POS = null;
const zonaOf = k => (k && k.zona) || 'WIB';
const pad2 = n => String(n).padStart(2, '0');
function wmLines(k, nama, pos, d) {
  const tgl = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  const jam = pad2(d.getHours()) + '.' + pad2(d.getMinutes()) + '.' + pad2(d.getSeconds());
  const lok = pos ? `Lokasi (Maps): ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}${pos.acc ? ' (±' + Math.round(pos.acc) + ' m)' : ''}` : 'Lokasi (Maps): tidak tersedia';
  const tmp = [k.tempat, k.kota].map(x => String(x || '').trim()).filter((x, i, a) => x && a.indexOf(x) === i).join(', '); // nama tempat dari Input Kegiatan
  return [nama, k.nama, tmp ? `Tempat: ${tmp}` : '', lok, `${tgl} · ${jam} ${zonaOf(k)}`].filter(Boolean);
}
function stamp(x, w, h, lines) {
  const f = Math.max(14, Math.round(w / 40)), pad = Math.round(f * .55), gap = Math.round(f * .25), maxW = w - pad * 2;
  const rows = []; // pecah baris panjang (nama kegiatan / tempat) agar tidak terpotong
  lines.forEach((t, i) => {
    const fs = i === 0 ? Math.round(f * 1.25) : f; x.font = (i === 0 ? '700 ' : '') + fs + 'px Arial, sans-serif';
    let cur = ''; String(t).split(' ').forEach(wd => { const tr = cur ? cur + ' ' + wd : wd; if (cur && x.measureText(tr).width > maxW) { rows.push([cur, fs, i === 0]); cur = wd; } else cur = tr; });
    if (cur) rows.push([cur, fs, i === 0]);
  });
  const bh = pad * 2 + rows.reduce((a, r) => a + r[1] + gap, 0) - gap;
  x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, h - bh, w, bh); x.fillStyle = '#fff'; x.textBaseline = 'top';
  let y = h - bh + pad;
  rows.forEach(([t, fs, b]) => { x.font = (b ? '700 ' : '') + fs + 'px Arial, sans-serif'; x.fillText(t, pad, y, maxW); y += fs + gap; });
}
const tidyPos = p => ({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, t: Date.now() });
function toJpeg(src, sw, sh, k, nama, pos) { // src: video/image/bitmap
  const s = Math.min(1, 1280 / Math.max(sw, sh)), w = Math.round(sw * s), h = Math.round(sh * s);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h);
  stamp(x, w, h, wmLines(k, nama, pos, new Date()));
  return c.toDataURL('image/jpeg', .72);
}
async function prosesFoto(file, k, nama, pos) { // cadangan bila kamera langsung tidak bisa dipakai: kamera bawaan HP
  let src, sw, sh, rev = null;
  try {
    if (window.createImageBitmap) { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); sw = src.width; sh = src.height; }
  } catch (e) { src = null; }
  if (!src) {
    rev = URL.createObjectURL(file);
    src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = rev; });
    sw = src.naturalWidth || src.width; sh = src.naturalHeight || src.height;
  }
  try { return toJpeg(src, sw, sh, k, nama, pos); } finally { if (rev) URL.revokeObjectURL(rev); if (src.close) src.close(); }
}

let CAM = null;
function camClose() {
  if (!CAM) return;
  try { CAM.stream && CAM.stream.getTracks().forEach(t => t.stop()); } catch (e) { }
  try { if (CAM.watch != null) navigator.geolocation.clearWatch(CAM.watch); } catch (e) { }
  clearInterval(CAM.tick); clearTimeout(CAM.wait);
  CAM.el.remove(); CAM = null;
}
function camStatus() {
  if (!CAM) return;
  const st = $('#camSt', CAM.el), sh = $('#camShot', CAM.el);
  let txt, ok = true;
  if (CAM.pos) txt = `Lokasi terkunci (±${Math.round(CAM.pos.acc || 0)} m)`;
  else if (CAM.perm === 'denied') txt = 'Lokasi DIBLOKIR di pengaturan situs Chrome untuk ruangk3.com. Buka Chrome > ⋮ > Setelan > Setelan situs > Lokasi > ruangk3.com > Izinkan';
  else if (CAM.locErr === 'denied') txt = 'Izin Lokasi ditolak. Aktifkan Lokasi untuk Portal PIC di Pengaturan HP > Aplikasi > Portal PIC > Izin';
  else if (CAM.locErr === 'off') txt = 'Lokasi/GPS HP mati atau tidak tersedia. Nyalakan Lokasi di HP lalu ketuk Ulangi lokasi';
  else if (CAM.waited) txt = 'Lokasi belum didapat. Ketuk Ulangi lokasi (coba di tempat terbuka)';
  else { txt = 'Mencari lokasi…'; ok = false; }
  st.textContent = txt; st.className = CAM.pos ? 'ok' : (CAM.waited || CAM.locErr ? 'bad' : '');
  const dg = $('#camDiag', CAM.el); if (dg) dg.textContent = `diagnosa: izin situs=${CAM.perm || '?'} · kode=${CAM.code == null ? '-' : CAM.code}${CAM.msg ? ' · ' + CAM.msg : ''} · v6`;
  const lb = $('#camLoc', CAM.el); if (lb) lb.hidden = !!CAM.pos || !(CAM.waited || CAM.locErr);
  sh.disabled = !(ok && CAM.live && !CAM.review);
}
function camWm() {
  if (!CAM) return;
  $('#camWm', CAM.el).innerHTML = wmLines(CAM.k, CAM.nama, CAM.pos, new Date()).map((t, i) => i === 0 ? `<b>${esc(t)}</b>` : `<span>${esc(t)}</span>`).join('');
}
async function camStart() {
  const v = $('#camV', CAM.el); CAM.live = false; camStatus();
  try { CAM.stream && CAM.stream.getTracks().forEach(t => t.stop()); } catch (e) { }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return camFallback('Kamera langsung tidak didukung di perangkat ini.');
  try {
    CAM.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: CAM.facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    v.srcObject = CAM.stream; v.classList.toggle('mirror', CAM.facing === 'user');
    await v.play(); CAM.live = true; camStatus();
  } catch (e) {
    const n = (e && e.name) || '';
    camFallback(/NotAllowed|Security/.test(n) ? 'Izin kamera ditolak. Aktifkan izin Kamera untuk Portal PIC di pengaturan HP, lalu coba lagi.' : /NotFound|Overconstrained/.test(n) ? 'Kamera tidak ditemukan di perangkat ini.' : 'Kamera tidak bisa dibuka (' + (n || 'kesalahan') + '). Tutup aplikasi lain yang memakai kamera lalu coba lagi.');
  }
}
function camFallback(msg) {
  if (!CAM) return;
  const b = $('#camFb', CAM.el); b.hidden = false;
  b.innerHTML = `<p>${esc(msg)}</p><div class="row" style="justify-content:center"><button type="button" class="btn" data-act="camretry">Coba lagi</button><label class="btn pri filebtn">Pakai kamera bawaan HP<input type="file" accept="image/*" capture="environment" id="camFile"></label></div><small>Foto dari kamera bawaan tetap diberi watermark yang sama.</small>`;
  CAM.live = false; camStatus();
}
function openCam(kid, pid) {
  const k = KEGS[kid], p = k && k.peserta.find(x => x.id === pid); if (!p) return;
  camClose();
  const el = document.createElement('div'); el.className = 'cam'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Kamera dokumentasi');
  el.innerHTML = `<div class="camtop"><button type="button" class="btn sm" data-act="camx">✕ Tutup</button><div class="camsel"><b>${esc(p.nama)}</b><span id="camSt"></span><button type="button" class="btn sm" id="camLoc" data-act="camloc" hidden>Ulangi lokasi</button><small id="camDiag" style="opacity:.7;font-size:10.5px"></small></div><button type="button" class="btn sm" data-act="camflip" aria-label="Balik kamera depan/belakang">⟲ Balik</button></div>
    <div class="camstage"><video id="camV" playsinline muted autoplay></video><img id="camImg" alt="Hasil foto" hidden><div id="camWm" class="camwm"></div><div id="camFb" class="camfb" hidden></div></div>
    <div class="cambar"><div id="camLive"><button type="button" class="shutter" id="camShot" data-act="camshot" aria-label="Ambil foto" disabled></button></div>
    <div id="camRev" class="row" style="justify-content:center;gap:12px" hidden><button type="button" class="btn" data-act="camretake">Ulangi</button><button type="button" class="btn pri" data-act="camuse">Pakai foto</button></div></div>`;
  document.body.appendChild(el);
  CAM = { el, kid, pid, k, nama: p.nama, facing: 'environment', stream: null, live: false, review: null, pos: (POS && Date.now() - POS.t < 120000) ? POS : null, locErr: '', waited: false, watch: null };
  camLocStart();
  CAM.tick = setInterval(camWm, 1000); camWm(); camStatus(); camStart();
}
function camLocStart() { // dua jalur: lokasi cepat (jaringan/Wi-Fi, berfungsi di dalam ruangan) + GPS akurat yang menyusul
  if (!CAM) return;
  const c = CAM;
  try { if (c.watch != null) navigator.geolocation.clearWatch(c.watch); } catch (e) { }
  clearTimeout(c.wait); c.watch = null; c.waited = false; c.locErr = '';
  if (!navigator.geolocation) { c.locErr = 'off'; camStatus(); return; }
  const ok = g => { if (CAM !== c) return; const n = tidyPos(g); if (!c.pos || (n.acc || 1e9) <= (c.pos.acc || 1e9) + 5 || Date.now() - c.pos.t > 60000) { c.pos = POS = n; } c.locErr = ''; camStatus(); camWm(); };
  const bad = er => { if (CAM !== c) return; c.code = er && er.code; c.msg = String((er && er.message) || '').slice(0, 60); if (er && er.code === 1) c.locErr = 'denied'; else if (!c.pos) c.locErr = c.locErr || 'off'; camStatus(); };
  try { if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then(r => { if (CAM !== c) return; c.perm = r.state; camStatus(); r.onchange = () => { if (CAM === c) { c.perm = r.state; camStatus(); } }; }).catch(() => { }); } catch (e) { }
  try { navigator.geolocation.getCurrentPosition(ok, bad, { enableHighAccuracy: false, maximumAge: 300000, timeout: 12000 }); } catch (e) { bad(e); }
  try { c.watch = navigator.geolocation.watchPosition(ok, bad, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }); } catch (e) { bad(e); }
  c.wait = setTimeout(() => { if (CAM === c) { c.waited = true; camStatus(); } }, 10000);
  camStatus();
}
function camShot() {
  const v = $('#camV', CAM.el); if (!v.videoWidth) return;
  const url = toJpeg(v, v.videoWidth, v.videoHeight, CAM.k, CAM.nama, CAM.pos);
  if (!CAM.pos) toast('Foto ini belum memuat lokasi. Tekan Ulangi setelah lokasi terkunci.');
  CAM.review = url; v.pause();
  const im = $('#camImg', CAM.el); im.src = url; im.hidden = false; v.hidden = true; $('#camWm', CAM.el).hidden = true;
  $('#camLive', CAM.el).hidden = true; $('#camRev', CAM.el).hidden = false;
}
function camRetake() {
  CAM.review = null; const v = $('#camV', CAM.el); v.hidden = false; v.play().catch(() => { });
  $('#camImg', CAM.el).hidden = true; $('#camWm', CAM.el).hidden = false; $('#camLive', CAM.el).hidden = false; $('#camRev', CAM.el).hidden = true; camStatus();
}
function camSave(url) {
  const { kid, pid } = CAM, h = hOf(kid); h.foto[pid] = url; camClose(); touch(kid); render(); toast('Foto tersimpan');
}

/* ---------- aksi ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, kid = P.kid, k = kid && KEGS[kid];
  if (a === 'sync') { if (!online()) toast('Belum ada sinyal. Data aman di HP dan dikirim otomatis nanti.'); else { syncErr = ''; sync(); pull(); toast('Memeriksa dan mengirim data…'); } }
  else if (a === 'open') { P.kid = b.dataset.id; P.screen = 'keg'; const ds = (KEGS[P.kid].tgl || []), t = ds.indexOf(todayIso()); P.day = t >= 0 ? t : 0; P.q = ''; render(); }
  else if (a === 'back') { P.screen = (P.screen === 'keg') ? 'home' : 'keg'; render(); }
  else if (a === 'go') { P.screen = b.dataset.to; P.q = ''; render(); }
  else if (a === 'logout') doLogout(false);
  else if (a === 'logoutforce') { doLogout(true); }
  else if (a === 'pw') askPw();
  else if (a === 'pwok') savePw();
  else if (a === 'refresh') { if (!online()) toast('Belum ada sinyal.'); else { pull().then(() => toast('Daftar kegiatan diperbarui.')); } }
  else if (a === 'day') { P.day = +b.dataset.i; render(); }
  else if (a === 'status' && k) {
    const pid = b.closest('.arow').dataset.pid, p = (k.peserta || []).find(x => x.id === pid), h = hOf(kid); if (!p) return;
    const cur = isBatal(h, p) ? 'cx' : isRem(h, p) ? 'rm' : '', nxt = cur === '' ? 'rm' : cur === 'rm' ? 'cx' : ''; // Hadir -> Remedial -> Cancel -> Hadir
    h.batal[pid] = nxt === 'cx'; h.remedial[pid] = nxt === 'rm'; // false eksplisit = mencabut tanda dari admin
    touch(kid); renderAbs();
    toast(nxt === 'cx' ? 'Ditandai Cancel (baris merah)' : nxt === 'rm' ? 'Ditandai Remedial (baris kuning, TTD hanya hari terakhir)' : 'Dikembalikan ke Hadir');
  }
  else if (a === 'sig' && k) {
    const pid = b.closest('.arow').dataset.pid, p = k.peserta.find(x => x.id === pid), d = (k.tgl || [])[P.day] || (k.tgl || [])[0], h = hOf(kid);
    openPad('Tanda tangan peserta', `${p.nama} · ${d ? tglPanjang(d) : ''}`, u => { h.hadir[pid] = h.hadir[pid] || {}; h.hadir[pid][d] = u; touch(kid); renderAbs(); }, h.hadir[pid] && h.hadir[pid][d]);
  }
  else if (a === 'ttdpic' && k) { const h = hOf(kid); openPad('TTD PIC', `${ME.nama} · ${k.nama}`, u => { h.ttdPic = u; h.ttdPicNama = ME.nama; touch(kid); render(); }, h.ttdPic); }
  else if (a === 'foto' && k) openCam(kid, b.dataset.pid);
  else if (a === 'camx') camClose();
  else if (a === 'camshot' && CAM) camShot();
  else if (a === 'camretake' && CAM) camRetake();
  else if (a === 'camuse' && CAM && CAM.review) camSave(CAM.review);
  else if (a === 'camflip' && CAM) { CAM.facing = CAM.facing === 'environment' ? 'user' : 'environment'; $('#camFb', CAM.el).hidden = true; camStart(); }
  else if (a === 'camloc' && CAM) camLocStart();
  else if (a === 'camretry' && CAM) { $('#camFb', CAM.el).hidden = true; camStart(); }
  else if (a === 'padno' && padApi) padApi.no();
  else if (a === 'padno') { $('#ovl').innerHTML = ''; }
  else if (a === 'padclr' && padApi) padApi.clear();
  else if (a === 'padok' && padApi) padApi.ok();
});
document.addEventListener('change', async e => {
  const kid = P.kid, k = kid && KEGS[kid];
  if (e.target.id === 'camFile' && CAM) {
    const f = e.target.files[0]; if (!f) return;
    toast('Memproses foto…');
    try { const pos = CAM.pos || await new Promise(r => { if (!navigator.geolocation) return r(null); navigator.geolocation.getCurrentPosition(g => r(POS = tidyPos(g)), () => r(null), { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }); }); camSave(await prosesFoto(f, CAM.k, CAM.nama, pos)); }
    catch (err) { toast('Foto tidak bisa dibaca. Coba ambil ulang.'); }
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'absQ') { P.q = e.target.value; renderAbs(); }
  else if (e.target.id === 'homeQ') { P.hq = e.target.value; const pos = e.target.selectionStart; render(); const el = $('#homeQ'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (_) {} } }
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'fLogin') return; e.preventDefault();
  const u = $('#lUser').value.trim(), pw = $('#lPw').value;
  if (!u || !pw) { P.err = 'Isi username dan kata sandi.'; render(); return; }
  const btn = $('#bLogin'); btn.disabled = true; btn.textContent = 'Masuk…';
  try { await doLogin(u, pw); } catch (err) { P.err = (err && err.message) || 'Gagal masuk.'; render(); $('#lUser').value = u; }
});

/* ---------- jaringan ---------- */
window.addEventListener('online', () => { renderPill(); pull(); sync(); });
window.addEventListener('offline', () => renderPill());
document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderPill(); pull(); sync(); } });
setInterval(() => { if (ME && online()) { pull(); sync(); } }, 5 * 60000);
window.addEventListener('pic-fb-ready', () => { if (ME) { pull(); sync(); } });

/* ---------- pembaruan otomatis ----------
   Aplikasi (APK/PWA) membuka halaman dari ruangk3.com, jadi isi terbaru otomatis terambil tiap dibuka.
   Kode di bawah mengurus app yang dibiarkan terbuka lama: tiap dibuka kembali & tiap 10 menit, berkas
   aplikasi dibandingkan dengan yang ada di server; kalau berbeda -> muat ulang sendiri bila sedang
   tidak dipakai (tidak sedang kamera / tanda tangan / mengetik / mengirim), kalau tidak -> tombol "Perbarui". */
(() => {
  const FILES = ['./index.html', './js/app.js', './js/firebase.js', './sw.js'];
  let base = null, shown = false, checking = false;
  const hash = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + t.length; };
  async function sig() {
    try { return (await Promise.all(FILES.map(async f => { const r = await fetch(f, { cache: 'no-cache' }); if (!r.ok) throw new Error('x'); return hash(await r.text()); }))).join('|'); }
    catch (e) { return null; }
  }
  const idle = () => { const a = document.activeElement; return !CAM && !$('#pad') && !syncing && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
  const boleh = () => { try { return Date.now() - (+sessionStorage.getItem('pic-upd') || 0) > 120000; } catch (e) { return true; } }; // cegah muat ulang beruntun
  function muat() { try { sessionStorage.setItem('pic-upd', String(Date.now())); } catch (e) { } location.reload(); }
  function bar() {
    if (shown) return; shown = true;
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;background:#14532d;color:#fff;padding:calc(8px + env(safe-area-inset-top,0px)) 14px 8px;display:flex;gap:10px;align-items:center;font:600 14px system-ui,sans-serif';
    d.innerHTML = '<span style="flex:1">Versi baru aplikasi tersedia.</span><button type="button" style="background:#fff;color:#14532d;border:0;border-radius:8px;padding:6px 12px;font:700 13px system-ui,sans-serif">Perbarui</button>';
    d.querySelector('button').onclick = muat; document.body.appendChild(d);
  }
  async function cek() {
    if (checking || document.hidden || !navigator.onLine) return; checking = true;
    try {
      if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => { });
      const s = await sig(); if (!s) return;
      if (base === null) { base = s; return; }
      if (s === base) return;
      if (idle() && boleh()) muat(); else bar();
    } finally { checking = false; }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) cek(); });
  window.addEventListener('online', cek);
  setInterval(cek, 10 * 60000);
  setInterval(() => { if (shown && idle() && boleh()) muat(); }, 15000);
  setTimeout(cek, 4000);
})();

/* ---------- mulai ---------- */
(async () => {
  const me = await iGet('me');
  if (me) {
    ME = me; KEGS = (await iGet('kegs')) || {};
    for (const kid of Object.keys(KEGS)) { const h = await iGet('h:' + kid); if (h) H[kid] = { ...newH(), ...h }; }
    P.screen = 'home';
  }
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  if (ME && window.PicFB) { await window.PicFB.ready; if (window.PicFB.uid() !== ME.uid) { /* sesi Firebase habis: data tetap bisa dipakai, kirim butuh login ulang */ syncErr = ''; } pull(); sync(); }
})();
window.__pic = { get H() { return H; }, get KEGS() { return KEGS; }, sync, pull, pending };
})();
