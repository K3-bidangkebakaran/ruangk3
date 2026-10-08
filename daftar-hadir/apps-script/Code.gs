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
const API_VER = 5; // dibaca aplikasi lewat aksi 'ping' untuk memastikan Code.gs sudah versi terbaru
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

/**
 * PINDAH FOLDER PENYIMPANAN: memindahkan SEMUA data Daftar Hadir (folder "Daftar Hadir & Dokumentasi - LPMI"
 * berikut spreadsheet & folder tiap kegiatan) ke folder Google Drive lain, lalu semua simpanan berikutnya
 * otomatis masuk ke sana. ID file/folder tidak berubah, jadi data lama tetap utuh & tautan di spreadsheet tetap benar.
 *
 * Cara pakai (di editor Apps Script, TIDAK perlu di-commit ke repo):
 *   1. Ganti tulisan TEMPEL_LINK_FOLDER_DI_SINI di bawah dengan link folder tujuan (boleh link lengkap atau ID saja)
 *   2. Pilih fungsi pindahKeFolderBaru → klik Jalankan → lihat hasilnya di Log eksekusi
 * Folder tujuan harus bisa diedit oleh akun yang men-deploy script ini.
 */
function pindahKeFolderBaru() {
  const LINK_TUJUAN = 'TEMPEL_LINK_FOLDER_DI_SINI';
  if (String(LINK_TUJUAN).indexOf('TEMPEL_LINK') >= 0) throw new Error('Link/ID folder tujuan belum diisi. Ganti TEMPEL_LINK_FOLDER_DI_SINI dengan link folder Google Drive tujuan.');
  const m = String(LINK_TUJUAN).match(/folders\/([-\w]{15,})/) || String(LINK_TUJUAN).match(/^([-\w]{15,})$/);
  if (!m) throw new Error('Link/ID folder tujuan belum diisi. Ganti TEMPEL_LINK_FOLDER_DI_SINI dengan link folder Google Drive tujuan.');
  const tujuan = DriveApp.getFolderById(m[1]); // gagal di sini = akun ini belum punya akses ke folder tujuan
  if (tujuan.isTrashed()) throw new Error('Folder tujuan ada di Sampah.');
  const props = PropertiesService.getScriptProperties();

  // 1) folder Daftar Hadir lama (dibuat bila belum pernah dipakai)
  let root = null;
  const rid = props.getProperty('ROOT_ID');
  if (rid) { try { const f = DriveApp.getFolderById(rid); if (!f.isTrashed()) root = f; } catch (e) { } }
  if (root && root.getId() === tujuan.getId()) throw new Error('Folder tujuan tidak boleh sama dengan folder Daftar Hadir itu sendiri.');

  // 2) jadikan folder tujuan sebagai folder induk, lalu pindahkan folder Daftar Hadir ke dalamnya
  props.setProperty('PARENT_ID', tujuan.getId());
  if (!root) {
    root = tujuan.createFolder(ROOT_NAME);
    props.setProperty('ROOT_ID', root.getId());
  } else {
    root.moveTo(tujuan); // semua isi (spreadsheet, folder kegiatan, foto, TTD) ikut pindah
  }
  props.setProperty('ROOT_PARENT', tujuan.getId());

  // 3) pastikan spreadsheet induk ada di dalam folder Daftar Hadir
  const ss = getSheet_();
  const sf = DriveApp.getFileById(ss.getId());
  let disini = false; const ps = sf.getParents();
  while (ps.hasNext()) { if (ps.next().getId() === root.getId()) disini = true; }
  if (!disini) sf.moveTo(root);

  // 4) ringkasan
  let nKeg = 0; const it = root.getFolders(); while (it.hasNext()) { it.next(); nKeg++; }
  Logger.log('SELESAI. Folder Daftar Hadir sekarang ada di: ' + tujuan.getUrl());
  Logger.log('Folder Daftar Hadir : ' + root.getUrl());
  Logger.log('Spreadsheet         : ' + ss.getUrl());
  Logger.log('Jumlah folder kegiatan di dalamnya: ' + nKeg);
  return { tujuan: tujuan.getUrl(), root: root.getUrl(), sheet: ss.getUrl(), folderKegiatan: nKeg };
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
      case 'ping': return out_({ ok: true, ver: API_VER, rootUrl: getRoot_().getUrl(), sheetUrl: getSheet_().getUrl(), pic: picOtomatisInfo_() });
      case 'uploadFile': return out_(uploadFile_(req));
      case 'uploadFiles': return out_(uploadFiles_(req));
      case 'saveEvent': return out_(saveEvent_(req));
      case 'listEvents': return out_(listEvents_());
      case 'getEvent': return out_(getEvent_(req));
      case 'getFile': return out_(getFile_(req));
      case 'deleteEvent': return out_(deleteEvent_(req));
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

/**
 * Simpan BANYAK file sekaligus (foto / tanda tangan / berkas Word) dalam satu permintaan.
 * Jauh lebih cepat daripada uploadFile satu per satu: folder kegiatan, spreadsheet dan peta file (_files.json)
 * hanya dibuka & ditulis sekali per paket, bukan sekali per file. Bila ada file yang gagal di tengah jalan,
 * file yang sudah terlanjur tersimpan tetap dicatat di peta supaya tidak jadi file ganda saat diulang.
 */
function uploadFiles_(req) {
  const list = req.files || [];
  if (!list.length) return { ok: true, n: 0 };
  const folder = eventFolder_(req.eventId, req.event);
  const map = readMap_(folder), subs = {};
  let n = 0;
  try {
    list.forEach(function (f) {
      const m = /^data:([^;]+);base64,(.*)$/.exec(f.dataUrl || '');
      if (!m) throw new Error('Format file tidak valid: ' + f.name);
      const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], f.name);
      if (map[f.key]) { try { DriveApp.getFileById(map[f.key].id).setTrashed(true); } catch (e) { } }
      const pk = (f.path || []).join('/');
      const dir = subs[pk] || (subs[pk] = sub_(folder, f.path));
      const file = dir.createFile(blob);
      file.setDescription('lpmi-key=' + f.key);
      map[f.key] = { id: file.getId(), name: f.name };
      n++;
    });
  } finally { writeMap_(folder, map); }
  return { ok: true, n: n };
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

/**
 * Hapus kegiatan: folder kegiatan (data.json, berkas Word, foto, tanda tangan) dipindah ke Sampah Drive
 * (atau dihapus permanen bila layanan Drive API aktif, lihat hapusFolder_), dan barisnya dibuang dari spreadsheet Database Induk.
 * Aman dipanggil berulang: kegiatan yang sudah tidak ada dianggap berhasil.
 */
function deleteEvent_(req) {
  const id = String(req.id || '');
  if (!id) throw new Error('ID kegiatan kosong');
  const ss = getSheet_();
  const ks = ss.getSheetByName('Kegiatan');
  const ditemukan = [];
  const f1 = findEventFolder_(id);
  if (f1) ditemukan.push(f1);
  else { // baris sheet hilang / ID folder kosong: cari folder yatim lewat data.json di dalam folder induk
    const it = getRoot_().getFolders(); let n = 0;
    while (it.hasNext() && n++ < 300) {
      const f = it.next();
      try { const t = readText_(f, 'data.json'); if (t && String(JSON.parse(t).id) === id) ditemukan.push(f); } catch (e) { }
    }
  }
  let permanen = 0, sampah = 0;
  ditemukan.forEach(function (f) { if (hapusFolder_(f)) permanen++; else sampah++; });
  const row = findEventRow_(ks, id);
  if (row > 0) ks.deleteRow(row);
  const ps = ss.getSheetByName('Peserta');
  const last = ps.getLastRow();
  let barisPeserta = 0;
  if (last > 1) {
    const rows = ps.getRange(2, 1, last - 1, PES_HEAD.length).getValues();
    const keep = rows.filter(function (r) { return String(r[0]) !== id; });
    barisPeserta = rows.length - keep.length;
    if (barisPeserta) {
      ps.getRange(2, 1, rows.length, PES_HEAD.length).clearContent();
      if (keep.length) ps.getRange(2, 1, keep.length, PES_HEAD.length).setValues(keep);
    }
  }
  return { ok: true, folder: ditemukan.length, permanen: permanen, sampah: sampah, baris: row > 0, peserta: barisPeserta };
}

/** Hapus folder. Jika layanan lanjutan "Drive API" diaktifkan di Apps Script, folder dihapus PERMANEN;
 *  jika tidak, dipindah ke Sampah Drive (bisa dipulihkan ±30 hari). Mengembalikan true bila permanen. */
function hapusFolder_(folder) {
  try {
    if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.remove) { Drive.Files.remove(folder.getId()); return true; }
  } catch (e) { }
  folder.setTrashed(true);
  return false;
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

/* =========================== OTOMATIS: HASIL APK PORTAL PIC → GOOGLE DRIVE ===========================
 * Hasil kerja PIC di APK (TTD peserta, foto, peserta batal, TTD PIC, TTD narasumber, foto dokumentasi harian)
 * dikirim APK ke Firebase. Bagian ini mengambilnya SENDIRI tiap 5 menit (pemicu waktu Apps Script) lalu
 * menyimpannya ke folder kegiatan di Google Drive – walau web ruangk3.com tidak sedang dibuka / login.
 * File memakai key, folder & nama yang sama dengan aplikasi Daftar Hadir, jadi saat web dibuka semuanya sudah ada
 * dan tidak ada file ganda. data.json & berkas Word TIDAK diubah di sini (itu tetap dibuat oleh web saat dibuka).
 *
 * Cara menyalakan: jalankan fungsi picOtomatisAktifkan() SEKALI di editor Apps Script (izinkan akses bila diminta).
 * Mematikan: picOtomatisMatikan(). Memeriksa: picOtomatisStatus().
 */
const FB_API_KEY = 'AIzaSyA2ow2lR4Z3lX7zBcZC5Xg3eWlDm7KNAAg'; // kunci web Firebase (publik, sama dengan yang ada di aplikasi)
const FB_DB = 'https://portal-k3-bidang-kebakaran-default-rtdb.asia-southeast1.firebasedatabase.app';
const FB_ROOT = 'artifacts/k3-kebakaran-app-v5/public/data';
const FB_HDR = { Referer: 'https://ruangk3.com/' }; // bila kunci API dibatasi ke situs ruangk3.com
const PIC_HANDLER = 'picOtomatisJalan';
const PIC_BATAS_HARI = 60;      // kegiatan yang sudah >60 hari tidak ada aktivitas PIC tidak diperiksa lagi
const PIC_ANGGARAN_MS = 270000; // 4,5 menit per putaran; sisanya dilanjutkan di putaran berikutnya
const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Jalankan SEKALI: pasang pemicu tiap 5 menit, lalu langsung coba satu putaran. */
function picOtomatisAktifkan() {
  setup();
  picOtomatisMatikan();
  ScriptApp.newTrigger(PIC_HANDLER).timeBased().everyMinutes(5).create();
  Logger.log('Pengambilan hasil APK otomatis AKTIF (dicek tiap 5 menit).');
  const r = picOtomatisJalan();
  Logger.log('Putaran pertama: ' + JSON.stringify(r));
  return r;
}

function picOtomatisMatikan() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === PIC_HANDLER) ScriptApp.deleteTrigger(t); });
  Logger.log('Pengambilan hasil APK otomatis dimatikan.');
}

/** Paksa semua kegiatan diperiksa ulang pada putaran berikutnya. */
function picOtomatisPeriksaUlang() {
  const props = PropertiesService.getScriptProperties(), all = props.getProperties();
  Object.keys(all).forEach(function (k) { if (k.indexOf('PS:') === 0) props.deleteProperty(k); });
  Logger.log('Siap: semua kegiatan akan diperiksa ulang.');
}

function picOtomatisStatus() {
  const on = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === PIC_HANDLER; });
  const t = PropertiesService.getScriptProperties().getProperty('PIC_LAST');
  const s = { aktif: on, terakhir: t ? JSON.parse(t) : null };
  Logger.log(JSON.stringify(s));
  return s;
}

function picLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Script sedang sibuk, dicoba lagi di putaran berikutnya');
  try { return fn(); } finally { try { lock.releaseLock(); } catch (e) { } }
}

function safeName_(s) { return String(s || '').replace(/[\\/:*?"<>|#%]+/g, '-').replace(/\s+/g, ' ').trim() || 'Tanpa nama'; }
function hariNama_(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? HARI_ID[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()] : '';
}
function md5_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s).map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

/* ---- Firebase (REST, login anonim – sama seperti aplikasi PIC) ---- */
function fbToken_(force) {
  const cache = CacheService.getScriptCache(), props = PropertiesService.getScriptProperties();
  if (!force) { const c = cache.get('FB_IDT'); if (c) return c; }
  let r = null;
  const rt = props.getProperty('FB_RT');
  if (rt) {
    const resp = UrlFetchApp.fetch('https://securetoken.googleapis.com/v1/token?key=' + FB_API_KEY, {
      method: 'post', contentType: 'application/x-www-form-urlencoded', headers: FB_HDR, muteHttpExceptions: true,
      payload: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(rt)
    });
    if (resp.getResponseCode() === 200) { const j = JSON.parse(resp.getContentText()); r = { idToken: j.id_token, refreshToken: j.refresh_token, expiresIn: j.expires_in }; }
  }
  if (!r) {
    const resp = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + FB_API_KEY, {
      method: 'post', contentType: 'application/json', headers: FB_HDR, muteHttpExceptions: true, payload: JSON.stringify({ returnSecureToken: true })
    });
    if (resp.getResponseCode() !== 200) throw new Error('Login anonim Firebase gagal (' + resp.getResponseCode() + '). Pastikan Authentication → Anonymous aktif. ' + String(resp.getContentText()).slice(0, 150));
    const j = JSON.parse(resp.getContentText()); r = { idToken: j.idToken, refreshToken: j.refreshToken, expiresIn: j.expiresIn };
  }
  props.setProperty('FB_RT', r.refreshToken);
  cache.put('FB_IDT', r.idToken, Math.max(60, Math.min(3000, (+r.expiresIn || 3600) - 300)));
  return r.idToken;
}

function fbUrl_(path, extra) {
  return FB_DB + '/' + FB_ROOT + '/' + path + '.json?auth=' + encodeURIComponent(fbToken_(false)) + (extra ? '&' + extra : '');
}

function fbGet_(path, extra) {
  for (let i = 0; i < 2; i++) {
    const r = UrlFetchApp.fetch(fbUrl_(path, extra), { muteHttpExceptions: true, headers: FB_HDR });
    const c = r.getResponseCode();
    if (c === 200) return JSON.parse(r.getContentText());
    if (c === 401 && i === 0) { fbToken_(true); continue; }
    if (c === 401) throw new Error('Firebase menolak akses ke ' + path + ' (periksa aturan Firebase untuk dh_*, lihat pic/README.md)');
    throw new Error('Firebase ' + c + ' pada ' + path);
  }
}

/* ---- putaran utama ---- */
function picOtomatisJalan() {
  const t0 = Date.now(), props = PropertiesService.getScriptProperties();
  const res = { at: new Date().toISOString(), kegiatan: 0, file: 0, sisa: 0, error: '' };
  try {
    if (!props.getProperty('TOKEN')) throw new Error('setup() belum dijalankan');
    const hasil = fbGet_('dh_hasil') || {}, cands = [];
    Object.keys(hasil).forEach(function (kid) {
      const nodes = Object.keys(hasil[kid] || {}).map(function (u) { return hasil[kid][u]; }).filter(function (x) { return x && typeof x === 'object'; });
      const upd = nodes.reduce(function (m, x) { return Math.max(m, +x.upd || 0); }, 0);
      if (upd) cands.push({ kid: kid, nodes: nodes, upd: upd, sig: upd + ':' + nodes.length });
    });
    cands.sort(function (a, b) { return b.upd - a.upd; });
    const errs = [];
    cands.forEach(function (c) {
      const ps = props.getProperty('PS:' + c.kid);
      if (ps === c.sig) return;
      if (!ps && c.upd < t0 - PIC_BATAS_HARI * 864e5) return;
      if (Date.now() - t0 > PIC_ANGGARAN_MS) { res.sisa++; return; }
      try {
        const k = fbGet_('dh_kegiatan/' + c.kid);
        if (!k || !k.nama) return; // kegiatan sudah dihapus dari aplikasi PIC
        const r = picKid_(c.kid, k, c.nodes, t0);
        res.file += r.file;
        if (r.selesai) { props.setProperty('PS:' + c.kid, c.sig); res.kegiatan++; } else res.sisa++;
      } catch (e) { res.sisa++; if (errs.length < 3) errs.push(c.kid.slice(0, 6) + ': ' + String((e && e.message) || e)); }
    });
    res.error = errs.join(' | ');
  } catch (e) { res.error = String((e && e.message) || e); }
  res.detik = Math.round((Date.now() - t0) / 100) / 10;
  props.setProperty('PIC_LAST', JSON.stringify(res));
  return res;
}

/** Simpan hasil PIC satu kegiatan ke Drive. Mengembalikan {file: jumlah file baru/berubah, selesai: bool}. */
function picKid_(kid, k, nodes, t0) {
  const hari = (k.tgl || []).filter(String);
  const peserta = (k.peserta || []).filter(function (p) { return p && String(p.nama || '').trim(); });
  const lp0 = k.lap || {};
  const batal = {}; peserta.forEach(function (p) { batal[p.id] = !!p.batal; });
  const foto = {}, foto2 = {}, hadir = {}, nrNama = {};
  let s1n = lp0.s1nama || '', s2n = lp0.s2nama || '', last = null;
  Object.keys(lp0.nr || {}).forEach(function (d) { nrNama[d] = (lp0.nr[d] || {}).nama || ''; });
  nodes.slice().sort(function (a, b) { return (a.upd || 0) - (b.upd || 0); }).forEach(function (h) {
    const hb = h.batal || {};
    Object.keys(hb).forEach(function (pid) { batal[pid] = !!hb[pid]; });
    Object.keys(h.hadir || {}).forEach(function (pid) { Object.keys(h.hadir[pid] || {}).forEach(function (d) { hadir[pid + '|' + d] = 1; }); });
    Object.keys(h.foto || {}).forEach(function (pid) { foto[pid] = 1; });
    Object.keys(h.foto2 || {}).forEach(function (pid) { foto2[pid] = 1; });
    const lp = h.lap || {};
    if (lp.s1 && 'nama' in lp.s1) s1n = lp.s1.nama || '';
    if (lp.s2 && 'nama' in lp.s2) s2n = lp.s2.nama || '';
    Object.keys(lp.nr || {}).forEach(function (d) { if (lp.nr[d] && 'nama' in lp.nr[d]) nrNama[d] = lp.nr[d].nama || ''; });
    if (h.ttdPic) last = h;
  });

  const mk = fbGet_('dh_media/' + kid, 'shallow=true') || {}, mkeys = Object.keys(mk);
  const want = [];
  peserta.forEach(function (p) {
    if (batal[p.id]) return;
    const tag = ' [' + String(p.id).slice(0, 5) + ']', nm = safeName_(p.nama);
    if (foto[p.id]) want.push({ key: 'foto:' + p.id, mk: 'f_' + p.id, path: ['Foto Dokumentasi'], name: nm + tag + (k.damkar ? ' (1)' : '') + '.jpg' });
    if (foto2[p.id] && k.damkar) want.push({ key: 'foto2:' + p.id, mk: 'f2_' + p.id, path: ['Foto Dokumentasi'], name: nm + tag + ' (2).jpg' });
    hari.forEach(function (d) {
      if (hadir[p.id + '|' + d]) want.push({ key: 'ttd:' + p.id + ':' + d, mk: 's_' + p.id + '_' + d, path: ['Tanda Tangan Peserta', d + ' (' + hariNama_(d) + ')'], name: nm + tag + '.png' });
    });
  });
  if (last) want.push({ key: 'ttd-org', mk: 'pic', path: ['Tanda Tangan Penyelenggara'], name: safeName_(last.ttdPicNama || last.picNama || 'PIC Kegiatan') + '.png' });
  want.push({ key: 'ttd-s1', mk: 'n1', path: ['Tanda Tangan Penyelenggara'], name: safeName_('Pengawas - ' + (s1n || 'TTD')) + '.png' });
  want.push({ key: 'ttd-s2', mk: 'n2', path: ['Tanda Tangan Penyelenggara'], name: safeName_('Ahli - ' + (s2n || 'TTD')) + '.png' });
  mkeys.filter(function (m) { return m.indexOf('nr_') === 0; }).sort().forEach(function (m) {
    const d = m.slice(3), mm = /^(\d{4}-\d{2}-\d{2})(?:_(\d+))?$/.exec(d);
    if (mm && hari.indexOf(mm[1]) >= 0) want.push({ key: 'nr:' + d, mk: m, path: ['Tanda Tangan Narasumber'], name: safeName_('Narasumber ' + d + ' - ' + (nrNama[d] || 'TTD')) + '.png' });
  });
  hari.forEach(function (d) {
    mkeys.filter(function (m) { return m.indexOf('d_' + d + '_') === 0; }).sort().forEach(function (m, i) {
      want.push({ key: 'hari:' + d + ':' + i, mk: m, path: ['Dokumentasi Harian', d], name: 'Foto ' + (i + 1) + '.jpg' });
    });
  });
  const todoAll = want.filter(function (w) { return mk[w.mk]; });

  const folder = picLock_(function () {
    return findEventFolder_(kid) || eventFolder_(kid, { acara: { tanggal: hari[0] || '', kegiatan: k.nama } });
  });

  let nFile = 0, selesai = true;
  for (let i = 0; i < todoAll.length; i += 6) {
    if (Date.now() - t0 > PIC_ANGGARAN_MS) { selesai = false; break; }
    const chunk = todoAll.slice(i, i + 6), map0 = readMap_(folder);
    const resp = UrlFetchApp.fetchAll(chunk.map(function (w) {
      const en = map0[w.key], hd = { 'X-Firebase-ETag': 'true', Referer: FB_HDR.Referer };
      if (en && en.e && en.h && en.name === w.name) hd['If-None-Match'] = en.e;
      return { url: fbUrl_('dh_media/' + kid + '/' + encodeURIComponent(w.mk)), method: 'get', headers: hd, muteHttpExceptions: true };
    }));
    const baru = [];
    resp.forEach(function (r, j) {
      const c = r.getResponseCode();
      if (c === 304) return;
      if (c !== 200) throw new Error('Firebase ' + c + ' saat mengambil gambar ' + chunk[j].mk);
      let du = null; try { du = JSON.parse(r.getContentText()); } catch (e) { }
      if (typeof du !== 'string' || !/^data:[^;]+;base64,/.test(du)) return;
      const hd = r.getHeaders() || {};
      baru.push({ w: chunk[j], du: du, e: hd.ETag || hd.Etag || hd.etag || '', h: md5_(chunk[j].name + '|' + du) });
    });
    if (!baru.length) continue;
    picLock_(function () {
      const map = readMap_(folder), subs = {};
      try {
        baru.forEach(function (t) {
          const en = map[t.w.key], m = /^data:([^;]+);base64,(.*)$/.exec(t.du);
          if (!m) return;
          const bytes = Utilities.base64Decode(m[2]);
          let sama = false;
          if (en && en.name === t.w.name) {
            if (en.h) sama = en.h === t.h;
            else { try { const f0 = DriveApp.getFileById(en.id); sama = !f0.isTrashed() && f0.getSize() === bytes.length; } catch (e) { } } // diunggah web: samakan lewat ukuran
          }
          if (sama) { map[t.w.key] = { id: en.id, name: en.name, h: t.h, e: t.e }; return; }
          if (en) { try { DriveApp.getFileById(en.id).setTrashed(true); } catch (e) { } }
          const pk = t.w.path.join('/');
          const dir = subs[pk] || (subs[pk] = sub_(folder, t.w.path));
          const file = dir.createFile(Utilities.newBlob(bytes, m[1], t.w.name));
          file.setDescription('lpmi-key=' + t.w.key);
          map[t.w.key] = { id: file.getId(), name: t.w.name, h: t.h, e: t.e };
          nFile++;
        });
      } finally { writeMap_(folder, map); }
    });
  }
  if (selesai) {
    picLock_(function () {
      const map = readMap_(folder);
      let ubah = nFile > 0;
      peserta.forEach(function (p) { // peserta yang kemudian ditandai batal: file-nya dibuang, sama seperti di web
        if (!batal[p.id]) return;
        Object.keys(map).forEach(function (key) {
          if (key === 'foto:' + p.id || key === 'foto2:' + p.id || key.indexOf('ttd:' + p.id + ':') === 0) {
            try { DriveApp.getFileById(map[key].id).setTrashed(true); } catch (e) { }
            delete map[key]; ubah = true;
          }
        });
      });
      if (ubah) { writeMap_(folder, map); picSheet_(kid, folder, map, hari, peserta); }
    });
  }
  return { file: nFile, selesai: selesai };
}

/** Perbarui hitungan di spreadsheet (kolom Foto/TTD terisi + tautan foto) tanpa menyentuh data.json. */
function picSheet_(kid, folder, map, hari, pes) {
  const ss = getSheet_(), ks = ss.getSheetByName('Kegiatan'), row = findEventRow_(ks, kid), now = new Date();
  if (row < 0) return;
  const fotoN = pes.filter(function (p) { return map['foto:' + p.id]; }).length;
  let ttdN = 0;
  pes.forEach(function (p) { hari.forEach(function (d) { if (map['ttd:' + p.id + ':' + d]) ttdN++; }); });
  ks.getRange(row, KI('Foto Terisi') + 1, 1, 3).setValues([[fotoN + '/' + pes.length, ttdN + '/' + (pes.length * hari.length), map['ttd-org'] ? 'Sudah' : 'Belum']]);
  ks.getRange(row, KI('Diperbarui') + 1).setValue(now);
  const ps = ss.getSheetByName('Peserta'), last = ps.getLastRow();
  if (last < 2) return;
  const rng = ps.getRange(2, 1, last - 1, PES_HEAD.length), vals = rng.getValues(), idCol = PES_HEAD.length - 1;
  let chg = false;
  vals.forEach(function (r) {
    if (String(r[0]) !== String(kid)) return;
    const pid = String(r[idCol]); if (!pid) return;
    r[6] = map['foto:' + pid] ? fileUrl_(map['foto:' + pid].id) : '';
    for (let i = 0; i < MAX_DAYS; i++) r[7 + i] = i < hari.length ? (map['ttd:' + pid + ':' + hari[i]] ? '✓ ' + hari[i] : '– ' + hari[i]) : '';
    r[idCol - 1] = now; chg = true;
  });
  if (chg) rng.setValues(vals);
}

/** Ringkasan untuk aksi ping: apakah pengambilan otomatis aktif + hasil putaran terakhir. */
function picOtomatisInfo_() {
  try {
    const on = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === PIC_HANDLER; });
    const t = PropertiesService.getScriptProperties().getProperty('PIC_LAST');
    return { aktif: on, terakhir: t ? JSON.parse(t) : null };
  } catch (e) { return { aktif: false, terakhir: null, error: String((e && e.message) || e) }; }
}
