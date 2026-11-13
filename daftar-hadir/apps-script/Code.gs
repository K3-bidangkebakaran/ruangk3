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
const API_VER = 10; // dibaca aplikasi lewat aksi 'ping' untuk memastikan Code.gs sudah versi terbaru
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
  const LINK_TUJUAN = 'https://drive.google.com/drive/folders/1zgLNRM25O-BYf_5HeWfWOJaMF9eDK8Uq?usp=sharing';
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

function doGet(e) {
  const t = e && e.parameter && e.parameter.agenda;
  if (t) { // langganan Kalender Mac/iCloud: alamat rahasia (?agenda=TOKEN) mengembalikan file jadwal .ics
    const asli = PropertiesService.getScriptProperties().getProperty('AGENDA_TOKEN');
    const f = asli && String(t) === asli ? agendaFile_(false) : null;
    const isi = f ? f.getBlob().getDataAsString('UTF-8') : 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//RuangK3//Kalender Kegiatan//ID\r\nEND:VCALENDAR\r\n';
    return ContentService.createTextOutput(isi).setMimeType(ContentService.MimeType.ICAL);
  }
  return out_({ ok: true, app: 'lpmi-daftar-hadir', message: 'Backend aktif. Data dikirim dari aplikasi Daftar Hadir & Dokumentasi.' });
}

/* ---- Agenda: jadwal Kalender Kegiatan RuangK3 untuk langganan Kalender Mac/iCloud ---- */
function agendaToken_() {
  const p = PropertiesService.getScriptProperties();
  let t = p.getProperty('AGENDA_TOKEN');
  if (!t) { t = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); p.setProperty('AGENDA_TOKEN', t); }
  return t;
}
function agendaFile_(buat) {
  const p = PropertiesService.getScriptProperties();
  const id = p.getProperty('AGENDA_FILE');
  if (id) { try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) return f; } catch (e) { } }
  if (!buat) return null;
  const f = getRoot_().createFile('Agenda RuangK3.ics', 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n', 'text/calendar');
  p.setProperty('AGENDA_FILE', f.getId());
  return f;
}
function agendaSimpan_(req) {
  const ics = String(req.ics || '');
  if (!/^BEGIN:VCALENDAR/.test(ics) || ics.length > 3000000) return { ok: false, error: 'Data agenda tidak valid' };
  agendaFile_(true).setContent(ics);
  return { ok: true, token: agendaToken_(), n: Number(req.n) || 0 };
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Permintaan tidak valid' }); }
  const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!token) return out_({ ok: false, error: 'Backend belum di-setup. Jalankan fungsi setup() sekali di editor Apps Script.' });
  if (String(req.token || '') !== token) return out_({ ok: false, error: 'Kode akses salah' });

  const lock = LockService.getScriptLock();
  try {
    // aksi baca-saja (ping, getFile, listEvents, getEvent, fileSizes) tidak perlu antre di kunci: Rekap & pengecekan tidak ikut macet saat ada unggahan besar
    if (!/^(ping|getFile|getFiles|listEvents|getEvent|fileSizes|tenants)$/.test(String(req.action))) lock.waitLock(60000);
    switch (req.action) {
      case 'ping': return out_({ ok: true, ver: API_VER, rootUrl: getRoot_().getUrl(), sheetUrl: getSheet_().getUrl(), pic: picOtomatisInfo_() });
      case 'uploadFile': return out_(uploadFile_(req));
      case 'uploadFiles': return out_(uploadFiles_(req));
      case 'saveEvent': return out_(saveEvent_(req));
      case 'listEvents': return out_(listEvents_());
      case 'getEvent': return out_(getEvent_(req));
      case 'getFile': return out_(getFile_(req));
      case 'getFiles': return out_(getFiles_(req));
      case 'deleteEvent': return out_(deleteEvent_(req));
      case 'fileSizes': return out_(fileSizes_(req));
      case 'tenants': return out_(tenants_());
      case 'agendaSimpan': return out_(agendaSimpan_(req));
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
  return (a.tanggal || 'tanpa-tanggal') + ' - ' + String(a.folderNama || a.kegiatan || 'Kegiatan tanpa nama').replace(/[\\/]/g, '-');
}

/** "11/11" yang terlanjur diubah Sheets jadi tanggal dikembalikan ke teks bulan/hari */
function frac_(v) {
  if (v instanceof Date) return (v.getMonth() + 1) + '/' + v.getDate();
  return v == null ? '' : String(v);
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
/** Sidik jari ringan sebuah gambar (panjang + 3 cuplikan base64). Rumus sama persis dengan di aplikasi web (sigData). */
function sig_(b64) {
  const n = b64.length, m = n >> 1;
  const s = n + '|' + b64.substr(0, 300) + b64.substr(m, 300) + b64.substr(Math.max(0, n - 300));
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
  return h.toString(36);
}

/**
 * Daftar file yang sudah ada di Drive untuk satu kegiatan: nama, subfolder, ukuran & sidik jari.
 * Aplikasi memakainya untuk TIDAK mengunggah ulang file yang sama (mis. foto/TTD yang sudah dikirim otomatis dari APK).
 * Hanya membaca peta file; tidak membuat folder.
 */
function fileSizes_(req) {
  const folder = findEventFolder_(String(req.eventId || ''));
  const out = {};
  if (!folder) return { ok: true, files: out };
  let map = {}; try { map = readMap_(folder); } catch (e) { }
  Object.keys(map).forEach(function (k) {
    const en = map[k];
    if (en && en.sz != null && en.g) out[k] = { n: en.name, p: en.p === undefined ? '' : en.p, s: en.sz, g: en.g };
  });
  return { ok: true, files: out };
}

/* =========================== DATABASE TENANT IMIP ===========================
 * Spreadsheet "Database Tenant IMIP" (di folder Daftar Hadir di Drive) = daftar perusahaan tenant kawasan IMIP.
 * Aplikasi Daftar Hadir memakainya untuk mengubah singkatan perusahaan peserta (mis. "BDM") menjadi nama lengkap
 * ("PT BintangDelapan Mineral"). Isi bisa diubah / ditambah langsung di Google Sheets:
 *  - tambah tenant baru = tambah baris (kolom "Nama Perusahaan" dan "Singkatan" wajib terisi)
 *  - singkatan lain untuk perusahaan yang sama = isi kolom "Alias" (pisahkan dengan koma)
 *  - singkatan yang dipakai dua perusahaan sekaligus TIDAK diubah otomatis (ambigu); beri alias yang berbeda.
 * Sheet dibuat otomatis (dari daftar bawaan di bawah) saat pertama kali diminta aplikasi; setelah itu isinya tidak ditimpa lagi.
 */
const TENANT_NAME = 'Database Tenant IMIP';
const TENANT_HEAD = ['No', 'Nama Perusahaan', 'Singkatan', 'Alias (pisahkan koma)', 'Status Singkatan', 'Kategori', 'Sumber', 'Keterangan'];
const TENANT_SEED = [ // [nama, singkatan, status singkatan, kategori, sumber, keterangan]
  ["PT BintangDelapan Mineral", "BDM", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "Pendiri kawasan IMIP (bersama Tsingshan Group)"],
  ["PT Sulawesi Mining Investment", "SMI", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "JV BDM–Tsingshan; Nickel Pig Iron & stainless steel"],
  ["PT Indonesia Guang Ching Nickel and Stainless Steel Industry", "GCNS", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "Nickel Pig Iron, Steel Slab, Hot Rolling Coil"],
  ["PT Indonesia Tsingshan Stainless Steel", "ITSS", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "NPI, Stainless/Carbon Steel Slab, Ferrosilicon, Sulfuric Acid, dll."],
  ["PT Indonesia Ruipu Nickel and Chrome Alloy", "IRNC", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Tsingshan Steel Indonesia", "TSI", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Dexin Steel Indonesia", "DSI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Hengjaya Nickel Industry", "HNI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Ranger Nickel Industry", "RNI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Cahaya Smelter Indonesia", "CSI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Bukit Smelter Indonesia", "BSI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Lestari Smelter Indonesia", "LSI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Huayue Nickel Cobalt", "HNC", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "Klaster material baterai"],
  ["PT QMB New Energy Materials", "QMB", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "Smelter HPAL; sudah berproduksi (Mar 2026)"],
  ["PT Lestari Hua Metal Indonesia", "LHMI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Walsin Nickel Industrial Indonesia", "WNII", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Ocean Sky Metal Industry", "OSMI", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Kinrui New Technologies Indonesia", "KNTI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "ANTARA menulis: Kinrui New Energy Technologies Indonesia"],
  ["PT Hua Chin Aluminum Indonesia", "HCAI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Qing Feng Ferrochrome", "QFF", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Zhao Hui Nickel", "ZHN", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Yong Wang Indonesia", "YWI", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Huaneng Metal Industry", "HMI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "Inisial sama dengan PT Hongli Metal Industry"],
  ["PT Qing Shui Eco Material", "QSEM", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Risun Wei Shan Indonesia", "RWSI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Oracle Nickel Indonesia", "ONI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT CNGR Ding Xing New Energy", "CDXNE", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Detian Coking Indonesia", "DCI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Merdeka Tsingshan Indonesia", "MTI", "Terkonfirmasi", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Zhongtsing New Energy", "ZNE", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Chengtok Lithium Indonesia", "CLI", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Kinxiang New Energy Technologies Indonesia", "KNETI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Qing Kota Metal Indonesia", "QKM", "Terkonfirmasi", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", "Menerapkan Supercritical Boiler (ANTARA, Jul 2026)"],
  ["PT BTR New Energy Materials", "BTR", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Sulawesi Nickel Cobalt", "SNC", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Sulawesi Manganese Recycle", "SMR", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Fajar Metal Industry", "FMI", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Teluk Metal Industry", "TMI", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Mars Metal Industry", "MMI", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Hongli Metal Industry", "HMI", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", "Inisial sama dengan PT Huaneng Metal Industry"],
  ["PT Cantostar Air Indonesia", "CAI", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Green Eco Nickel", "GEN", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", "Smelter HPAL; masih konstruksi (Mar 2026)"],
  ["PT Seawing New Energy", "SNE", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Honch New Energy", "HNE", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Decho New Energy", "DNE", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Chengseng New Energy", "CNE", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT ESG New Energy Material", "ESG", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", "Smelter HPAL; masih konstruksi (Mar 2026)"],
  ["PT Indonesia Qingmei Energy Materials", "IQEM", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", "Produk MHP (bahan baku baterai); di bawah GEM Co., Ltd."],
  ["PT Meiming New Energy Material", "MNEM", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", "Smelter HPAL; masih konstruksi (Mar 2026)"],
  ["PT Xinheng Metal Indonesia", "XMI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "Produk Stainless Steel Slab"],
  ["PT Dinson Lithium Indonesia", "DLI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "Produk Lithium Hydroxide; grup Tsingshan"],
  ["PT Guangchingde Metal Rolling", "GMR", "Perlu dicek", "Konstruksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Tsingcheng Technology Indonesia", "TTI", "Perlu dicek", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", ""],
  ["PT Anlun New Material Technology", "YNAL", "Terkonfirmasi", "Produksi", "Situs resmi IMIP (imip.co.id/tenant)", "Situs IMIP menyebutnya PT YNAL"],
  ["PT Morowali Power Mandiri", "MPM", "Perlu dicek", "Produksi", "ANTARA Sulteng (Des 2024)", "Tidak ada di daftar situs resmi"],
  ["PT Indonesia Puqing Recycling Technology", "IPRT", "Perlu dicek", "Produksi", "ANTARA Sulteng (Des 2024)", "Tidak ada di daftar situs resmi"],
  ["PT Indopower Cahaya Nusantara", "ICN", "Perlu dicek", "Konstruksi", "ANTARA Sulteng (Des 2024)", "Tidak ada di daftar situs resmi"],
  ["PT Landseadoor International Shipping", "LIS", "Perlu dicek", "Pendukung", "ANTARA Sulteng (Des 2024)", "Pelayaran domestik–internasional"],
  ["PT Tsinda Shipyard Indonesia", "TSYI", "Perlu dicek", "Pendukung", "ANTARA Sulteng (Des 2024)", "Galangan kapal / docking"],
  ["PT Berkah Morowali", "BM", "Perlu dicek", "Pendukung", "ANTARA Sulteng (Des 2024)", ""],
  ["PT Dila Samudera Indah", "DSI", "Perlu dicek", "Pendukung", "ANTARA Sulteng (Des 2024)", "Inisial sama dengan PT Dexin Steel Indonesia"],
  ["PT Logistics Angin Selatan", "LAS", "Terkonfirmasi", "Pendukung", "Laporan Trend Asia", "Logistik/kontraktor di kawasan"],
  ["PT Logistika Utama Jaya", "LUJ", "Terkonfirmasi", "Pendukung", "Laporan Trend Asia", "Logistik/kontraktor di kawasan"],
  ["PT Perintis Makmur Indonesia", "PMI", "Terkonfirmasi", "Pendukung", "Laporan Trend Asia", "Dikenal juga sebagai PMKI"]
];

function tenantOpen_(id) {
  if (!id) return null;
  try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) return SpreadsheetApp.openById(id); } catch (e) { }
  return null;
}

function tenantSheet_() {
  const props = PropertiesService.getScriptProperties();
  let ss = tenantOpen_(props.getProperty('TENANT_SS'));
  if (ss) return ss;
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    ss = tenantOpen_(props.getProperty('TENANT_SS')); // dicek ulang: mungkin sudah dibuat permintaan lain
    if (ss) return ss;
    const root = getRoot_();
    const it = root.getFilesByName(TENANT_NAME); // properti hilang tetapi filenya masih ada: pakai lagi, jangan buat ganda
    while (it.hasNext()) {
      const f = it.next();
      if (!f.isTrashed() && f.getMimeType() === MimeType.GOOGLE_SHEETS) { props.setProperty('TENANT_SS', f.getId()); return SpreadsheetApp.openById(f.getId()); }
    }
    ss = SpreadsheetApp.create(TENANT_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(root);
    const sh = ss.getSheets()[0]; sh.setName('Tenant');
    const rows = TENANT_SEED.map(function (r, i) { return [i + 1, r[0], r[1], '', r[2], r[3], r[4], r[5]]; });
    sh.getRange(1, 1, 1, TENANT_HEAD.length).setValues([TENANT_HEAD]).setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
    if (rows.length) sh.getRange(2, 1, rows.length, TENANT_HEAD.length).setValues(rows);
    sh.setFrozenRows(1);
    [50, 330, 90, 170, 130, 100, 260, 360].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    const pt = ss.insertSheet('Petunjuk');
    pt.getRange(1, 1, 7, 1).setValues([
      ['Database Tenant IMIP — dipakai aplikasi Daftar Hadir untuk melengkapi nama perusahaan peserta'],
      ['1. Peserta yang kolom perusahaannya hanya singkatan (mis. BDM) otomatis diganti nama lengkap sesuai sheet "Tenant".'],
      ['2. Tambah tenant baru: tambah baris di bawah pada sheet "Tenant" (kolom Nama Perusahaan dan Singkatan wajib diisi).'],
      ['3. Singkatan lain untuk perusahaan yang sama: isi kolom "Alias (pisahkan koma)", contoh: PT BDM, BDM Tbk.'],
      ['4. Singkatan yang dipakai dua perusahaan (mis. DSI, HMI) tidak diganti otomatis. Beri salah satunya alias yang berbeda.'],
      ['5. Perubahan terbaca aplikasi saat aplikasi dibuka, atau tekan tombol "Lengkapi nama perusahaan" di tab Kegiatan & Peserta.'],
      ['6. Jangan mengubah judul kolom pada baris pertama sheet "Tenant". Kolom lain (Status, Kategori, Sumber, Keterangan) bebas.']
    ]);
    pt.setColumnWidth(1, 760); pt.getRange(1, 1).setFontWeight('bold');
    props.setProperty('TENANT_SS', ss.getId());
    return ss;
  } finally { lock.releaseLock(); }
}

/** Baca database tenant: [{ n: nama lengkap, s: singkatan, a: [alias...] }] */
function tenants_() {
  const ss = tenantSheet_();
  const sh = ss.getSheetByName('Tenant') || ss.getSheets()[0];
  const last = sh.getLastRow();
  const out = [];
  if (last >= 2) {
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h || '').toLowerCase().trim(); });
    const col = function (rx) { for (let i = 0; i < head.length; i++) if (rx.test(head[i])) return i; return -1; };
    const cn = col(/^nama/), cs = col(/^singkatan/), ca = col(/^alias/), ct = col(/^status/); // ct: kolom "Status Singkatan" (Terkonfirmasi / Perlu dicek)
    if (cn < 0) throw new Error('Sheet "Tenant": kolom "Nama Perusahaan" tidak ditemukan (jangan ubah judul kolom).');
    sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues().forEach(function (r) {
      const n = String(r[cn] || '').replace(/\s+/g, ' ').trim();
      if (!n) return;
      const s = cs >= 0 ? String(r[cs] || '').trim() : '';
      const a = ca >= 0 ? String(r[ca] || '').split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(String) : [];
      out.push({ n: n, s: s, a: a, k: ct >= 0 && /^terkonfirmasi/i.test(String(r[ct] || '').trim()) ? 1 : 0 }); // k=1: singkatan terkonfirmasi (menang bila singkatan sama dipakai dua perusahaan)
    });
  }
  return { ok: true, tenants: out, url: ss.getUrl(), n: out.length };
}

function fileUrl_(id) { return 'https://drive.google.com/file/d/' + id + '/view'; }

/* =========================== AKSI =========================== */

/** Simpan 1 file (foto / tanda tangan). File lama dengan key yang sama dipindah ke sampah. */
function uploadFile_(req) {
  const folder = eventFolder_(req.eventId, req.event);
  const m = /^data:([^;]+);base64,(.*)$/.exec(req.dataUrl || '');
  if (!m) throw new Error('Format file tidak valid');
  const bytes = Utilities.base64Decode(m[2]);
  const blob = Utilities.newBlob(bytes, m[1], req.name);
  const map = readMap_(folder);
  if (map[req.key]) { try { DriveApp.getFileById(map[req.key].id).setTrashed(true); } catch (e) { } }
  const f = sub_(folder, req.path).createFile(blob);
  f.setDescription('lpmi-key=' + req.key);
  map[req.key] = { id: f.getId(), name: req.name, p: (req.path || []).join('/'), sz: bytes.length, g: sig_(m[2]) };
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
      const bytes = Utilities.base64Decode(m[2]);
      const blob = Utilities.newBlob(bytes, m[1], f.name);
      if (map[f.key]) { try { DriveApp.getFileById(map[f.key].id).setTrashed(true); } catch (e) { } }
      const pk = (f.path || []).join('/');
      const dir = subs[pk] || (subs[pk] = sub_(folder, f.path));
      const file = dir.createFile(blob);
      file.setDescription('lpmi-key=' + f.key);
      map[f.key] = { id: file.getId(), name: f.name, p: pk, sz: bytes.length, g: sig_(m[2]) };
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
  const rw = row < 0 ? ks.getLastRow() + 1 : row; // kolom "x/y" ditulis sebagai TEKS (jika tidak, Sheets mengubah mis. 11/11 jadi tanggal)
  ks.getRange(rw, KI('Foto Terisi') + 1, 1, 2).setNumberFormat('@');
  ks.getRange(rw, 1, 1, vals.length).setValues([vals]);

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

  return { ok: true, folderUrl: folder.getUrl(), updated: now.getTime() };
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
        tempat: r[KI('Tempat')], n: r[KI('Jumlah Peserta')], foto: frac_(r[KI('Foto Terisi')]), ttdPeserta: frac_(r[KI('TTD Peserta Terisi')]),
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

/** Ambil BANYAK file sekaligus (satu permintaan) supaya mengunduh satu kegiatan ke perangkat lain jauh lebih cepat. */
function getFiles_(req) {
  const ids = (req.ids || []).slice(0, 12), out = {};
  ids.forEach(function (id) {
    try {
      const f = DriveApp.getFileById(id);
      if (String(f.getDescription() || '').indexOf('lpmi-key=') !== 0) { out[id] = null; return; }
      const b = f.getBlob();
      out[id] = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    } catch (e) { out[id] = null; }
  });
  return { ok: true, files: out };
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

/** Kunci kelas = "k" + fnv32 base36 dari label (rumus sama dengan kelasKey() di web Daftar Hadir & aplikasi PIC). */
function kelasKey_(label) {
  const str = String(label); let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return 'k' + (h >>> 0).toString(36);
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
  const foto = {}, foto2 = {}, fotoX = { foto3: {}, foto4: {}, foto5: {} }, hadir = {}, nrNama = {};
  const papa = !!k.papa, kls = (k.kelas ? (Array.isArray(k.kelas) ? k.kelas : Object.keys(k.kelas).map(function (x) { return k.kelas[x]; })) : []).filter(String);
  // pengecualian: K3 LKBB Teknisi Ruang Terbatas 29 Okt - 2 Nov, Teknisi K3 Deteksi Gas 24-26 Okt, Petugas K3 Kimia 27 Okt - 1 Nov 2026 hanya 1 foto per peserta (sama dengan website & APK)
  const tgS = (Array.isArray(k.tgl) ? k.tgl : Object.keys(k.tgl || {}).map(function (x) { return k.tgl[x]; })).filter(String).sort(), fotoSatu = !!k.b3 && tgS.length > 0 && [['teknisi ruang terbatas', '2026-10-29', '2026-11-02'], ['deteksi gas', '2026-10-24', '2026-10-26'], ['petugas k3 kimia', '2026-10-27', '2026-11-01']].some(function (r) { return tgS[0] >= r[1] && tgS[tgS.length - 1] <= r[2] && kls.some(function (x) { return String(x).replace(/\s+/g, ' ').trim().toLowerCase().indexOf(r[0]) >= 0; }); });
  const kfOf = function (lbl) { return papa ? [safeName_(kls.indexOf(lbl) >= 0 ? lbl : 'Tanpa kelas')] : []; }; // PAPA: tiap alat punya subfolder sendiri
  const kkMap = {}; kls.forEach(function (l) { kkMap[kelasKey_(l)] = l; });
  let s1n = lp0.s1nama || '', s2n = lp0.s2nama || '', last = null;
  Object.keys(lp0.nr || {}).forEach(function (d) { nrNama[d] = (lp0.nr[d] || {}).nama || ''; });
  Object.keys(lp0.nrk || {}).forEach(function (kk) { Object.keys(lp0.nrk[kk] || {}).forEach(function (d) { nrNama[kk + '~' + d] = (lp0.nrk[kk][d] || {}).nama || ''; }); });
  nodes.slice().sort(function (a, b) { return (a.upd || 0) - (b.upd || 0); }).forEach(function (h) {
    const hb = h.batal || {};
    Object.keys(hb).forEach(function (pid) { batal[pid] = !!hb[pid]; });
    Object.keys(h.hadir || {}).forEach(function (pid) { Object.keys(h.hadir[pid] || {}).forEach(function (d) { hadir[pid + '|' + d] = 1; }); });
    Object.keys(h.foto || {}).forEach(function (pid) { foto[pid] = 1; });
    Object.keys(h.foto2 || {}).forEach(function (pid) { foto2[pid] = 1; });
    ['foto3', 'foto4', 'foto5'].forEach(function (fk) { Object.keys(h[fk] || {}).forEach(function (pid) { fotoX[fk][pid] = 1; }); });
    const lp = h.lap || {};
    if (lp.s1 && 'nama' in lp.s1) s1n = lp.s1.nama || '';
    if (lp.s2 && 'nama' in lp.s2) s2n = lp.s2.nama || '';
    Object.keys(lp.nr || {}).forEach(function (d) { if (lp.nr[d] && 'nama' in lp.nr[d]) nrNama[d] = lp.nr[d].nama || ''; });
    Object.keys(lp.nrk || {}).forEach(function (kk) { Object.keys(lp.nrk[kk] || {}).forEach(function (d) { if (lp.nrk[kk][d] && 'nama' in lp.nrk[kk][d]) nrNama[kk + '~' + d] = lp.nrk[kk][d].nama || ''; }); });
    if (h.ttdPic) last = h;
  });

  const mk = fbGet_('dh_media/' + kid, 'shallow=true') || {}, mkeys = Object.keys(mk);
  const want = [];
  peserta.forEach(function (p) {
    if (batal[p.id]) return;
    const tag = ' [' + String(p.id).slice(0, 5) + ']', nm = safeName_(p.nama), kf = kfOf(p.kelas);
    const klp = String(p.kelas || '').replace(/\s+/g, ' ').trim() || (kls.length === 1 ? kls[0] : ''), nf = fotoSatu ? 1 : (k.b3 && klp.toLowerCase() === 'ahli k3 muda lingkungan kerja') ? 5 : ((k.damkar || k.b3) ? 2 : 1);
    if (foto[p.id]) want.push({ key: 'foto:' + p.id, mk: 'f_' + p.id, path: kf.concat(['Foto Dokumentasi']), kf: papa, name: nm + tag + (nf > 1 ? ' (1)' : '') + '.jpg' });
    if (foto2[p.id] && nf >= 2) want.push({ key: 'foto2:' + p.id, mk: 'f2_' + p.id, path: kf.concat(['Foto Dokumentasi']), kf: papa, name: nm + tag + ' (2).jpg' });
    [3, 4, 5].forEach(function (n) { if (nf >= n && fotoX['foto' + n][p.id]) want.push({ key: 'foto' + n + ':' + p.id, mk: 'f' + n + '_' + p.id, path: kf.concat(['Foto Dokumentasi']), kf: papa, name: nm + tag + ' (' + n + ').jpg' }); });
    hari.forEach(function (d) {
      if (hadir[p.id + '|' + d]) want.push({ key: 'ttd:' + p.id + ':' + d, mk: 's_' + p.id + '_' + d, path: kf.concat(['Tanda Tangan Peserta', d + ' (' + hariNama_(d) + ')']), kf: papa, name: nm + tag + '.png' });
    });
  });
  if (last) want.push({ key: 'ttd-org', mk: 'pic', path: ['Tanda Tangan Penyelenggara'], name: safeName_(last.ttdPicNama || last.picNama || 'PIC Kegiatan') + '.png' });
  want.push({ key: 'ttd-s1', mk: 'n1', path: ['Tanda Tangan Penyelenggara'], name: safeName_('Pengawas - ' + (s1n || 'TTD')) + '.png' });
  want.push({ key: 'ttd-s2', mk: 'n2', path: ['Tanda Tangan Penyelenggara'], name: safeName_('Ahli - ' + (s2n || 'TTD')) + '.png' });
  mkeys.filter(function (m) { return m.indexOf('nr_') === 0; }).sort().forEach(function (m) {
    const m0 = /^nr_(?:(k[0-9a-z]+)~)?(.+)$/.exec(m); if (!m0) return;
    const kk = m0[1] || '', d = m0[2], mm = /^(\d{4}-\d{2}-\d{2})(?:_(\d+))?$/.exec(d);
    if (!mm || hari.indexOf(mm[1]) < 0) return;
    if (kk) { // narasumber milik satu alat: masuk subfolder alat itu; key sama dengan aplikasi web (nr:<kunciKelas>:<hari>)
      if (!kkMap[kk]) return;
      want.push({ key: 'nr:' + kk + ':' + d, mk: m, path: kfOf(kkMap[kk]).concat(['Tanda Tangan Narasumber']), kf: papa, name: safeName_('Narasumber ' + d + ' - ' + (nrNama[kk + '~' + d] || 'TTD')) + '.png' });
    } else want.push({ key: 'nr:' + d, mk: m, path: ['Tanda Tangan Narasumber'], name: safeName_('Narasumber ' + d + ' - ' + (nrNama[d] || 'TTD')) + '.png' });
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
      if (en && en.e && en.h && en.name === w.name && (en.p === undefined ? !w.kf : en.p === w.path.join('/'))) hd['If-None-Match'] = en.e;
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
          const pk = t.w.path.join('/'), pathOk = en && (en.p === undefined ? !t.w.kf : en.p === pk); // berkas lama di folder yang salah (mis. sebelum ada folder per alat) diunggah ulang ke folder yang benar
          if (en && en.name === t.w.name && pathOk) {
            if (en.h) sama = en.h === t.h;
            else if (en.sz != null && en.g) sama = en.sz === bytes.length && en.g === sig_(m[2]); // diunggah web (versi baru): cukup bandingkan ukuran + sidik jari, tanpa membuka Drive
            else { try { const f0 = DriveApp.getFileById(en.id); sama = !f0.isTrashed() && f0.getSize() === bytes.length; } catch (e) { } } // diunggah web (versi lama): samakan lewat ukuran
          }
          if (sama) { map[t.w.key] = { id: en.id, name: en.name, h: t.h, e: t.e, p: en.p === undefined ? pk : en.p, sz: bytes.length, g: sig_(m[2]) }; return; }
          if (en) { try { DriveApp.getFileById(en.id).setTrashed(true); } catch (e) { } }
          const dir = subs[pk] || (subs[pk] = sub_(folder, t.w.path));
          const file = dir.createFile(Utilities.newBlob(bytes, m[1], t.w.name));
          file.setDescription('lpmi-key=' + t.w.key);
          map[t.w.key] = { id: file.getId(), name: t.w.name, h: t.h, e: t.e, p: pk, sz: bytes.length, g: sig_(m[2]) };
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
          if (key === 'foto:' + p.id || key === 'foto2:' + p.id || key === 'foto3:' + p.id || key === 'foto4:' + p.id || key === 'foto5:' + p.id || key.indexOf('ttd:' + p.id + ':') === 0) {
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
  ks.getRange(row, KI('Foto Terisi') + 1, 1, 2).setNumberFormat('@');
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
