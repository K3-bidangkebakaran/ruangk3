/**
 * Backend Google Drive – Aplikasi Daftar Hadir & Dokumentasi (PT LPMI)
 * ---------------------------------------------------------------------
 * Menyimpan semua data kegiatan ke Google Drive milik akun yang men-deploy:
 *
 *   📂 Ruangk3.com                                (folder induk RuangK3 – sudah ada: Backup & media)
 *    └─ 📂 Daftar Hadir & Dokumentasi - LPMI      (folder Daftar Hadir, otomatis dibuat/dipindah ke sini)
 *        ├─ 📊 Database Induk - Daftar Hadir LPMI (spreadsheet: sheet "Kegiatan" & "Peserta")
 *        └─ 📁 2026-07-15 - Pelatihan K3 Kebakaran (1 folder per kegiatan)
 *            ├─ data.json                         (data lengkap kegiatan & peserta)
 *            ├─ 📁 Foto Dokumentasi               (foto bertanda air per peserta)
 *            ├─ 📁 Tanda Tangan Peserta / 2026-07-15 (Rabu), 2026-07-17 (Jumat), …
 *            └─ 📁 Tanda Tangan Penyelenggara
 *
 * Cara pasang: lihat PANDUAN-GOOGLE-DRIVE.md
 *   1. Tempel file ini di https://script.google.com (proyek baru)
 *   2. Jalankan fungsi setup() sekali → catat KODE AKSES di log
 *   3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
 *   4. Salin URL Web App + Kode Akses ke aplikasi (tombol ☁️)
 */

const ROOT_NAME = 'Daftar Hadir & Dokumentasi - LPMI';
const PARENT_NAME = 'Ruangk3.com'; // folder induk di Google Drive (dicari lewat nama, ID tidak disimpan di repo)
const SHEET_NAME = 'Database Induk - Daftar Hadir LPMI';
const MAX_DAYS = 7;
const KEG_HEAD = ['ID Kegiatan', 'Nama Kegiatan', 'Tanggal Mulai', 'Tanggal Selesai', 'Jumlah Hari', 'Daftar Tanggal', 'Tempat', 'Narasumber',
  'Jumlah Peserta', 'Foto Terisi', 'TTD Peserta Terisi', 'TTD Penyelenggara', 'Folder Drive', 'Diperbarui', 'Folder ID'];
const PES_HEAD = ['ID Kegiatan', 'Nama Kegiatan', 'Tanggal Mulai', 'No', 'Nama Peserta', 'Perusahaan', 'Foto Dokumentasi']
  .concat(Array.from({ length: MAX_DAYS }, function (_, i) { return 'TTD Hari ' + (i + 1); }))
  .concat(['Diperbarui', 'ID Peserta']);
const KI = function (name) { return KEG_HEAD.indexOf(name); }; // indeks kolom sheet Kegiatan (0-based)

/* =========================== SETUP =========================== */

/** Jalankan SEKALI dari editor Apps Script. Membuat folder induk, spreadsheet & kode akses. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty('TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
    props.setProperty('TOKEN', token);
  }
  const root = getRoot_();
  const ss = getSheet_();
  Logger.log('Folder induk : ' + root.getUrl());
  Logger.log('Spreadsheet  : ' + ss.getUrl());
  Logger.log('KODE AKSES   : ' + token);
  return token;
}

/** Opsional: ganti kode akses (semua perangkat harus diisi ulang). */
function gantiKodeAkses() {
  PropertiesService.getScriptProperties().deleteProperty('TOKEN');
  return setup();
}

/* =========================== HTTP =========================== */

function doGet() {
  return out_({ ok: true, app: 'lpmi-daftar-hadir', message: 'Backend aktif. Data dikirim dari aplikasi Daftar Hadir & Dokumentasi.' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Permintaan tidak valid' }); }
  const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!token) return out_({ ok: false, error: 'Backend belum di-setup. Jalankan fungsi setup() sekali di editor Apps Script.' });
  if (String(req.token || '') !== token) return out_({ ok: false, error: 'Kode akses salah' });

  const lock = LockService.getScriptLock();
  try {
    if (req.action !== 'getFile' && req.action !== 'ping') lock.waitLock(30000);
    switch (req.action) {
      case 'ping': return out_({ ok: true, rootUrl: getRoot_().getUrl(), sheetUrl: getSheet_().getUrl() });
      case 'uploadFile': return out_(uploadFile_(req));
      case 'saveEvent': return out_(saveEvent_(req));
      case 'listEvents': return out_(listEvents_());
      case 'getEvent': return out_(getEvent_(req));
      case 'getFile': return out_(getFile_(req));
      default: return out_({ ok: false, error: 'Aksi tidak dikenal: ' + req.action });
    }
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) { }
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* =========================== DRIVE =========================== */

// Folder induk "Ruangk3.com" (tempat Backup-YYYY-MM-DD & media). null bila tidak ditemukan → folder dibuat di My Drive.
function getParent_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PARENT_ID');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { } }
  const it = DriveApp.getFoldersByName(PARENT_NAME);
  let first = null, best = null;
  while (it.hasNext()) {
    const f = it.next();
    if (f.isTrashed()) continue;
    if (!first) first = f;
    if (!best && f.getFoldersByName('media').hasNext()) best = f; // utamakan yang berisi folder "media"
  }
  const p = best || first;
  if (p) props.setProperty('PARENT_ID', p.getId());
  return p;
}

function getRoot_() {
  const props = PropertiesService.getScriptProperties();
  const parent = getParent_();
  const pid = parent ? parent.getId() : '';
  const id = props.getProperty('ROOT_ID');
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) {
        // folder lama di luar Ruangk3.com → pindahkan sekali (isinya ikut)
        if (parent && props.getProperty('ROOT_PARENT') !== pid) {
          try { f.moveTo(parent); props.setProperty('ROOT_PARENT', pid); } catch (e) { }
        }
        return f;
      }
    } catch (e) { }
  }
  const f = parent ? parent.createFolder(ROOT_NAME) : DriveApp.createFolder(ROOT_NAME);
  props.setProperty('ROOT_ID', f.getId());
  if (parent) props.setProperty('ROOT_PARENT', pid);
  return f;
}

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) {
    let ss = null;
    try { ss = SpreadsheetApp.openById(id); } catch (e) { }
    if (ss) { migrateSheet_(ss); return ss; }
  }
  const ss = SpreadsheetApp.create(SHEET_NAME);
  DriveApp.getFileById(ss.getId()).moveTo(getRoot_());
  const k = ss.getSheets()[0];
  k.setName('Kegiatan');
  k.getRange(1, 1, 1, KEG_HEAD.length).setValues([KEG_HEAD]).setFontWeight('bold').setBackground('#f58220').setFontColor('#ffffff');
  k.setFrozenRows(1);
  const p = ss.insertSheet('Peserta');
  p.getRange(1, 1, 1, PES_HEAD.length).setValues([PES_HEAD]).setFontWeight('bold').setBackground('#f58220').setFontColor('#ffffff');
  p.setFrozenRows(1);
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

/** Sheet buatan versi lama (tanpa kolom "Daftar Tanggal") disesuaikan otomatis. */
function migrateSheet_(ss) {
  const k = ss.getSheetByName('Kegiatan');
  if (!k) return;
  const head = k.getRange(1, 1, 1, Math.max(1, k.getLastColumn())).getValues()[0];
  if (head.indexOf('Daftar Tanggal') < 0 && head.indexOf('Jumlah Hari') >= 0) {
    k.insertColumnAfter(head.indexOf('Jumlah Hari') + 1);
    k.getRange(1, head.indexOf('Jumlah Hari') + 2).setValue('Daftar Tanggal');
  }
}

function folderName_(ev) {
  const a = (ev && ev.acara) || {};
  return (a.tanggal || 'tanpa-tanggal') + ' - ' + String(a.kegiatan || 'Kegiatan tanpa nama').replace(/[\\/]/g, '-');
}

function findEventRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

/** Cari folder kegiatan (tanpa membuat). */
function findEventFolder_(id) {
  const sh = getSheet_().getSheetByName('Kegiatan');
  const row = findEventRow_(sh, id);
  if (row < 0) return null;
  const fid = sh.getRange(row, KEG_HEAD.length).getValue();
  if (!fid) return null;
  try { const f = DriveApp.getFolderById(fid); return f.isTrashed() ? null : f; } catch (e) { return null; }
}

/** Ambil / buat folder kegiatan, sekaligus menyesuaikan namanya. */
function eventFolder_(id, ev) {
  let f = findEventFolder_(id);
  if (f) {
    if (ev && ev.acara && ev.acara.kegiatan) { const nm = folderName_(ev); if (f.getName() !== nm) f.setName(nm); }
    return f;
  }
  f = getRoot_().createFolder(folderName_(ev));
  const sh = getSheet_().getSheetByName('Kegiatan');
  const row = findEventRow_(sh, id);
  if (row > 0) sh.getRange(row, KEG_HEAD.length).setValue(f.getId());
  else {
    const r = KEG_HEAD.map(function () { return ''; });
    r[0] = id; r[1] = (ev && ev.acara && ev.acara.kegiatan) || ''; r[KI('Folder Drive')] = f.getUrl(); r[KI('Folder ID')] = f.getId();
    sh.appendRow(r);
  }
  return f;
}

function sub_(folder, path) {
  let f = folder;
  (path || []).forEach(function (n) {
    const it = f.getFoldersByName(n);
    f = it.hasNext() ? it.next() : f.createFolder(n);
  });
  return f;
}

function readText_(folder, name) {
  const it = folder.getFilesByName(name);
  return it.hasNext() ? it.next().getBlob().getDataAsString() : null;
}
function writeText_(folder, name, text) {
  const it = folder.getFilesByName(name);
  if (it.hasNext()) it.next().setContent(text);
  else folder.createFile(name, text, 'application/json');
}
function readMap_(folder) { const t = readText_(folder, '_files.json'); return t ? JSON.parse(t) : {}; }
function writeMap_(folder, map) { writeText_(folder, '_files.json', JSON.stringify(map)); }
function fileUrl_(id) { return 'https://drive.google.com/file/d/' + id + '/view'; }

/* =========================== AKSI =========================== */

/** Simpan 1 file (foto / tanda tangan). File lama dengan key yang sama dipindah ke sampah. */
function uploadFile_(req) {
  const folder = eventFolder_(req.eventId, req.event);
  const m = /^data:([^;]+);base64,(.*)$/.exec(req.dataUrl || '');
  if (!m) throw new Error('Format file tidak valid');
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], req.name);
  const map = readMap_(folder);
  if (map[req.key]) { try { DriveApp.getFileById(map[req.key].id).setTrashed(true); } catch (e) { } }
  const f = sub_(folder, req.path).createFile(blob);
  f.setDescription('lpmi-key=' + req.key);
  map[req.key] = { id: f.getId(), name: req.name };
  writeMap_(folder, map);
  return { ok: true, id: f.getId(), url: f.getUrl() };
}

/** Simpan data kegiatan + perbarui spreadsheet Database Induk. */
function saveEvent_(req) {
  const ev = req.event;
  if (!ev || !ev.id) throw new Error('Data kegiatan kosong');
  const folder = eventFolder_(ev.id, ev);

  // buang file yang dihapus di perangkat pengirim (foto/TTD dihapus, peserta dihapus).
  // File yang diunggah perangkat lain tidak disentuh.
  const map = readMap_(folder);
  (req.removed || []).forEach(function (k) {
    if (map[k]) { try { DriveApp.getFileById(map[k].id).setTrashed(true); } catch (e) { } delete map[k]; }
  });
  writeMap_(folder, map);

  ev.savedAt = new Date().toISOString();
  writeText_(folder, 'data.json', JSON.stringify(ev, null, 1));

  const ss = getSheet_(), a = ev.acara || {}, days = (ev.days && ev.days.length) ? ev.days : [a.tanggal || ''];
  const pes = (ev.peserta || []).filter(function (p) { return String(p.nama || '').trim(); });
  const fotoN = pes.filter(function (p) { return map['foto:' + p.id]; }).length;
  let ttdN = 0;
  pes.forEach(function (p) { days.forEach(function (d) { if (map['ttd:' + p.id + ':' + d]) ttdN++; }); });
  const now = new Date();

  // sheet Kegiatan (1 baris per kegiatan)
  const ks = ss.getSheetByName('Kegiatan');
  const vals = [ev.id, a.kegiatan || '', days[0] || '', days[days.length - 1] || '', days.length, days.join(', '), a.tempat || '', a.narasumber || '',
    pes.length, fotoN + '/' + pes.length, ttdN + '/' + (pes.length * days.length), map['ttd-org'] ? 'Sudah' : 'Belum',
    folder.getUrl(), now, folder.getId()];
  const row = findEventRow_(ks, ev.id);
  if (row < 0) ks.appendRow(vals); else ks.getRange(row, 1, 1, vals.length).setValues([vals]);

  // sheet Peserta (baris kegiatan ini ditulis ulang)
  const ps = ss.getSheetByName('Peserta');
  const last = ps.getLastRow();
  const rows = last > 1 ? ps.getRange(2, 1, last - 1, PES_HEAD.length).getValues().filter(function (r) { return String(r[0]) !== String(ev.id); }) : [];
  pes.forEach(function (p, i) {
    const r = [ev.id, a.kegiatan || '', days[0] || '', i + 1, p.nama, p.instansi || '', map['foto:' + p.id] ? fileUrl_(map['foto:' + p.id].id) : ''];
    for (let k = 0; k < MAX_DAYS; k++) r.push(k < days.length ? (map['ttd:' + p.id + ':' + days[k]] ? '✓ ' + days[k] : '– ' + days[k]) : '');
    r.push(now, p.id);
    rows.push(r);
  });
  if (last > 1) ps.getRange(2, 1, last - 1, PES_HEAD.length).clearContent();
  if (rows.length) ps.getRange(2, 1, rows.length, PES_HEAD.length).setValues(rows);

  return { ok: true, folderUrl: folder.getUrl() };
}

function fmtDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v || '');
}

function listEvents_() {
  const sh = getSheet_().getSheetByName('Kegiatan');
  const last = sh.getLastRow();
  if (last < 2) return { ok: true, events: [] };
  const rows = sh.getRange(2, 1, last - 1, KEG_HEAD.length).getValues();
  return {
    ok: true,
    events: rows.filter(function (r) { return r[0]; }).map(function (r) {
      const upd = r[KI('Diperbarui')];
      return {
        id: String(r[0]), kegiatan: r[1], tanggal: fmtDate_(r[2]), tanggal2: fmtDate_(r[3]), jumlahHari: r[4],
        hari: String(r[KI('Daftar Tanggal')] || '').split(/\s*,\s*/).filter(String),
        tempat: r[KI('Tempat')], n: r[KI('Jumlah Peserta')], foto: r[KI('Foto Terisi')], ttdPeserta: r[KI('TTD Peserta Terisi')],
        ttdOrg: r[KI('TTD Penyelenggara')], folderUrl: r[KI('Folder Drive')],
        updated: upd instanceof Date ? upd.getTime() : upd
      };
    })
  };
}

function getEvent_(req) {
  const folder = findEventFolder_(req.id);
  if (!folder) throw new Error('Kegiatan tidak ditemukan di Drive');
  const t = readText_(folder, 'data.json');
  if (!t) throw new Error('data.json tidak ditemukan');
  return { ok: true, event: JSON.parse(t), files: readMap_(folder), folderUrl: folder.getUrl() };
}

function getFile_(req) {
  const f = DriveApp.getFileById(req.id);
  if (String(f.getDescription() || '').indexOf('lpmi-key=') !== 0) throw new Error('File tidak diizinkan');
  const b = f.getBlob();
  return { ok: true, dataUrl: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) };
}
