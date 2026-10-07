/**
 * Backend Google Drive – Aplikasi Riksa Uji (RuangK3)
 * ---------------------------------------------------------------------
 * Apps Script KHUSUS Riksa Uji (terpisah dari Daftar Hadir). Menyimpan foto dokumentasi, data laporan
 * dan file Word laporan APAR, Hidran dan Fire Alarm ke Google Drive milik akun yang men-deploy:
 *
 *   📂 (folder Riksa Uji yang Anda tentukan di fungsi setup)
 *    └─ 📁 PT Maju Jaya - 2026-10-07            (1 folder per berkas = perusahaan + tanggal berkas dibuat)
 *        ├─ 📁 APAR | 📁 Hidran | 📁 Fire Alarm  (1 folder per jenis laporan)
 *            ├─ data.json                       (isi lengkap laporan)
 *            ├─ Laporan_Riksa_Uji_….docx        (laporan Word)
 *            └─ 📁 Foto                         (foto dokumentasi, mis. "Zona Z-01__<id>.jpg")
 *
 * Siapa boleh apa:
 *   - Petugas riksa uji (aplikasi di HP) : kirim foto & laporan. Bukti = token login Firebase petugas
 *     (kolom "token", diperiksa ke Google; akun harus terdaftar & aktif di riksa_petugas).
 *   - Admin ruangk3.com                  : unduh / hapus laporan. Bukti = KODE AKSES (kolom "kode"),
 *     dibuat oleh setup(), disimpan hanya di Script Properties dan di browser admin.
 *
 * Cara pasang: lihat PANDUAN-GOOGLE-DRIVE.md
 */

/* =========================== SETUP =========================== */

/**
 * Jalankan SEKALI dari editor Apps Script. Menyimpan folder tujuan & membuat kode akses admin.
 * Ganti TEMPEL_LINK_FOLDER_DI_SINI dengan link folder Google Drive tujuan (boleh link lengkap atau ID saja)
 * langsung di editor Apps Script. JANGAN di-commit ke repo supaya link Drive tetap privat.
 * Akun yang men-deploy harus punya akses Editor ke folder itu.
 */
function setup() {
  const LINK_FOLDER = 'TEMPEL_LINK_FOLDER_DI_SINI';
  const m = String(LINK_FOLDER).match(/folders\/([-\w]{15,})/) || String(LINK_FOLDER).match(/^([-\w]{15,})$/);
  if (String(LINK_FOLDER).indexOf('TEMPEL_LINK') >= 0 || !m) throw new Error('Link/ID folder belum diisi. Ganti TEMPEL_LINK_FOLDER_DI_SINI dengan link folder Google Drive tujuan.');
  const folder = DriveApp.getFolderById(m[1]); // gagal di sini = akun ini belum punya akses ke folder itu
  if (folder.isTrashed()) throw new Error('Folder tujuan ada di Sampah.');
  const props = PropertiesService.getScriptProperties();
  props.setProperty('RK_ROOT_ID', folder.getId());
  let kode = props.getProperty('TOKEN');
  if (!kode) { kode = Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase(); props.setProperty('TOKEN', kode); }
  // UrlFetchApp dipakai untuk memeriksa login petugas ke Google/Firebase (izin ini diminta saat fungsi ini dijalankan)
  const cek = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FB_API_KEY, { method: 'post', contentType: 'application/json', payload: '{"idToken":"x"}', muteHttpExceptions: true });
  Logger.log('Folder Riksa Uji : ' + folder.getName() + ' → ' + folder.getUrl());
  Logger.log('Cek Firebase     : HTTP ' + cek.getResponseCode() + ' (400 = normal, artinya Google terjangkau)');
  Logger.log('KODE AKSES ADMIN : ' + kode + '   (isi di panel admin ruangk3.com → Laporan Riksa Uji)');
  return { folder: folder.getUrl(), kode: kode };
}

/** Opsional: buat kode akses admin baru (kode lama tidak berlaku lagi). */
function gantiKodeAkses() {
  PropertiesService.getScriptProperties().deleteProperty('TOKEN');
  return setup();
}

/* =========================== HTTP =========================== */

function doGet() {
  return out_({ ok: true, app: 'riksa-uji-drive', ver: API_VER, message: 'Backend Riksa Uji aktif.' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Permintaan tidak valid' }); }
  return rkPost_(req);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

const API_VER = 1; // dibaca panel admin lewat aksi 'ping'
// Kunci Web Firebase memang publik (sama dengan yang ada di riksa/js/firebase.js).
const FB_API_KEY = 'AIzaSyA2ow2lR4Z3lX7zBcZC5Xg3eWlDm7KNAAg';
const FB_DB = 'https://portal-k3-bidang-kebakaran-default-rtdb.asia-southeast1.firebasedatabase.app';
const FB_ROOT = 'artifacts/k3-kebakaran-app-v5/public/data';
const JENIS_NAMA = { apar: 'APAR', hyd: 'Hidran', fa: 'Fire Alarm' };
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function rkPost_(req) {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('RK_ROOT_ID')) return out_({ ok: false, error: 'Backend belum di-setup. Jalankan fungsi setup() sekali di editor Apps Script.' });
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const au = rkAuth_(req, props);
    const act = String(req.action || '');
    const PETUGAS = { ping: 1, prepare: 1, uploadPhoto: 1, saveData: 1, uploadDocx: 1 };
    const ADMIN = { ping: 1, getData: 1, getPhoto: 1, getDocx: 1, deleteReport: 1 };
    if (!(au.role === 'petugas' ? PETUGAS : ADMIN)[act]) return out_({ ok: false, error: 'Aksi tidak diizinkan: ' + act });
    if (act === 'prepare' || act === 'saveData' || act === 'uploadDocx' || act === 'deleteReport') { lock.waitLock(30000); locked = true; }
    switch (act) {
      case 'ping': return out_({ ok: true, ver: API_VER, role: au.role, rootUrl: au.role === 'admin' ? rkRoot_(props).getUrl() : '' });
      case 'prepare': return out_(rkPrepare_(au, req, props));
      case 'uploadPhoto': return out_(rkUploadPhoto_(au, req, props));
      case 'saveData': return out_(rkSaveData_(au, req, props));
      case 'uploadDocx': return out_(rkUploadDocx_(au, req, props));
      case 'getData': return out_(rkGetData_(req, props));
      case 'getPhoto': return out_(rkGetPhoto_(req, props));
      case 'getDocx': return out_(rkGetDocx_(req, props));
      case 'deleteReport': return out_(rkDelete_(req, props));
    }
    return out_({ ok: false, error: 'Aksi tidak dikenal: ' + act });
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (e2) { } }
  }
}

/* ---- autentikasi ---- */

function rkAuth_(req, props) {
  if (req.kode) { // admin ruangk3.com: kode akses yang sama dengan Daftar Hadir
    if (String(req.kode) !== String(props.getProperty('TOKEN') || '')) throw new Error('Kode akses salah');
    return { role: 'admin' };
  }
  if (req.token) return rkVerify_(String(req.token)); // petugas: token login Firebase
  throw new Error('Tidak berwenang');
}

function rkMd5_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s).map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

/** Memastikan token login Firebase sah dan pemiliknya petugas riksa uji yang aktif. Hasil di-cache 5 menit. */
function rkVerify_(idToken) {
  const cache = CacheService.getScriptCache();
  const ck = 'rkp' + rkMd5_(idToken);
  const hit = cache.get(ck);
  if (hit) return JSON.parse(hit);
  const r1 = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FB_API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  if (r1.getResponseCode() !== 200) throw new Error('Sesi login tidak valid. Keluar lalu masuk lagi di aplikasi.');
  const u = (JSON.parse(r1.getContentText()).users || [])[0];
  if (!u || !u.email) throw new Error('Akun ini bukan akun petugas riksa uji.');
  const r2 = UrlFetchApp.fetch(FB_DB + '/' + FB_ROOT + '/riksa_petugas/' + encodeURIComponent(u.localId) + '.json?auth=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (r2.getResponseCode() !== 200) throw new Error('Tidak bisa memeriksa akun petugas (kode ' + r2.getResponseCode() + ').');
  const p = JSON.parse(r2.getContentText());
  if (!p) throw new Error('Akun ini tidak terdaftar sebagai petugas riksa uji.');
  if (p.aktif === false) throw new Error('Akun petugas Anda dinonaktifkan. Hubungi Admin Pusat ruangk3.com.');
  const res = { role: 'petugas', uid: u.localId, nama: p.nama || u.email };
  cache.put(ck, JSON.stringify(res), 300);
  return res;
}

/* ---- Drive ---- */

function rkRoot_(props) {
  return DriveApp.getFolderById(props.getProperty('RK_ROOT_ID'));
}

function rkClean_(s, max) {
  const t = String(s == null ? '' : s).replace(/[\\\/:*?"<>|#%\r\n\t]+/g, '-').replace(/\s+/g, ' ').replace(/^[\s.\-]+|[\s.\-]+$/g, '');
  return t.slice(0, max || 80);
}

function rkChild_(parent, name) {
  const it = parent.getFoldersByName(name);
  while (it.hasNext()) { const f = it.next(); if (!f.isTrashed()) return f; }
  return parent.createFolder(name);
}

function rkFolderOk_(id) {
  if (!id) return null;
  try { const f = DriveApp.getFolderById(id); return f.isTrashed() ? null : f; } catch (e) { return null; }
}

function rkJson_(props, key) {
  try { return JSON.parse(props.getProperty(key) || 'null'); } catch (e) { return null; }
}
function rkInfo_(props, reportId) { return rkJson_(props, 'R:' + reportId); }

/**
 * Menyiapkan folder berkas (perusahaan), folder jenis laporan & subfolder Foto. Aman dipanggil berulang.
 * meta: { reportId, berkasId, perusahaan, jenis, nomor, tgl (tanggal berkas dibuat, yyyy-mm-dd) }
 */
function rkPrepare_(au, req, props) {
  const m = req.meta || {};
  if (!m.reportId) throw new Error('ID laporan kosong');
  const reportId = String(m.reportId);
  const berkasId = String(m.berkasId || reportId.replace(/-(apar|hyd|fa)$/, ''));
  const info = rkInfo_(props, reportId);
  if (info && info.u && info.u !== au.uid && rkFolderOk_(info.f)) throw new Error('Laporan ini sudah dikirim oleh petugas lain.');

  // 1) folder berkas: "<Perusahaan> - <tanggal>"  (kunci = id berkas, jadi nama perusahaan boleh diubah petugas)
  const tgl = /^\d{4}-\d{2}-\d{2}$/.test(String(m.tgl || '')) ? ' - ' + m.tgl : '';
  const bname = (rkClean_(m.perusahaan, 80) || 'Tanpa Nama Perusahaan') + tgl;
  const binfo = rkJson_(props, 'B:' + berkasId);
  let bfolder = binfo ? rkFolderOk_(binfo.f) : null;
  if (!bfolder) bfolder = rkRoot_(props).createFolder(bname);
  else if (bfolder.getName() !== bname) bfolder.setName(bname);
  props.setProperty('B:' + berkasId, JSON.stringify({ f: bfolder.getId() }));

  // 2) folder jenis laporan (APAR / Hidran / Fire Alarm) + Foto
  let jfolder = info ? rkFolderOk_(info.f) : null;
  if (!jfolder) jfolder = rkChild_(bfolder, JENIS_NAMA[m.jenis] || 'Laporan');
  else {
    const par = jfolder.getParents();
    if (!par.hasNext() || par.next().getId() !== bfolder.getId()) jfolder.moveTo(bfolder);
  }
  jfolder.setDescription('riksa:' + reportId);
  const foto = rkChild_(jfolder, 'Foto');
  props.setProperty('R:' + reportId, JSON.stringify({ f: jfolder.getId(), p: foto.getId(), b: bfolder.getId(), u: (info && info.u) || au.uid }));
  return { ok: true, folderId: jfolder.getId(), url: jfolder.getUrl(), berkasUrl: bfolder.getUrl() };
}

function rkNeed_(au, props, reportId) {
  const info = rkInfo_(props, reportId);
  if (!info || !rkFolderOk_(info.f)) throw new Error('Folder laporan belum disiapkan. Coba kirim ulang.');
  if (au.role === 'petugas' && info.u && info.u !== au.uid) throw new Error('Laporan ini sudah dikirim oleh petugas lain.');
  return info;
}

function rkUploadPhoto_(au, req, props) {
  const info = rkNeed_(au, props, req.reportId);
  const du = String(req.dataUrl || '');
  const comma = du.indexOf(',');
  if (du.indexOf('data:') !== 0 || comma < 0) throw new Error('Format foto tidak dikenal');
  const mime = du.slice(5, du.indexOf(';')) || 'image/jpeg';
  const ext = mime.indexOf('png') >= 0 ? 'png' : 'jpg';
  const pid = rkClean_(req.photoId, 60) || Utilities.getUuid();
  const folder = DriveApp.getFolderById(info.p);
  const ex = folder.searchFiles("title contains '" + pid.replace(/'/g, '') + "'");
  while (ex.hasNext()) { const f = ex.next(); if (!f.isTrashed()) return { ok: true, skipped: true }; }
  const label = rkClean_(req.label, 40);
  const name = (label ? label + '__' : '') + pid + '.' + ext;
  folder.createFile(Utilities.newBlob(Utilities.base64Decode(du.slice(comma + 1)), mime, name));
  return { ok: true };
}

function rkSaveData_(au, req, props) {
  const info = rkNeed_(au, props, req.reportId);
  if (!req.json) throw new Error('Isi laporan kosong');
  const folder = DriveApp.getFolderById(info.f);
  const it = folder.getFilesByName('data.json');
  if (it.hasNext()) { const f = it.next(); f.setContent(String(req.json)); }
  else folder.createFile('data.json', String(req.json), MimeType.PLAIN_TEXT);
  return { ok: true };
}

function rkUploadDocx_(au, req, props) {
  const info = rkNeed_(au, props, req.reportId);
  const name = rkClean_(String(req.name || 'Laporan_Riksa_Uji').replace(/\.docx$/i, ''), 100) + '.docx';
  const folder = DriveApp.getFolderById(info.f);
  // hapus file Word lama di folder ini supaya hanya ada versi terbaru
  const old = folder.getFilesByType(MIME_DOCX);
  while (old.hasNext()) { old.next().setTrashed(true); }
  folder.createFile(Utilities.newBlob(Utilities.base64Decode(String(req.b64 || '')), MIME_DOCX, name));
  return { ok: true, name: name };
}

/* ---- khusus admin ---- */

function rkGetData_(req, props) {
  const info = rkInfo_(props, req.reportId);
  const folder = info ? rkFolderOk_(info.f) : null;
  if (!folder) throw new Error('Folder laporan tidak ditemukan di Google Drive.');
  const it = folder.getFilesByName('data.json');
  if (!it.hasNext()) throw new Error('data.json tidak ada di folder laporan.');
  const json = it.next().getBlob().getDataAsString();
  const photos = [];
  const pf = rkFolderOk_(info.p);
  if (pf) {
    const fi = pf.getFiles();
    while (fi.hasNext()) {
      const f = fi.next(); if (f.isTrashed()) continue;
      const n = f.getName().replace(/\.(jpe?g|png)$/i, '');
      const k = n.lastIndexOf('__');
      photos.push({ id: k >= 0 ? n.slice(k + 2) : n, fid: f.getId() });
    }
  }
  return { ok: true, json: json, photos: photos, url: folder.getUrl() };
}

function rkGetPhoto_(req, props) {
  const info = rkInfo_(props, req.reportId);
  if (!info) throw new Error('Laporan tidak dikenal');
  const f = DriveApp.getFileById(String(req.fid || ''));
  let ok = false; const ps = f.getParents();
  while (ps.hasNext()) { if (ps.next().getId() === info.p) ok = true; }
  if (!ok) throw new Error('Foto bukan milik laporan ini');
  const b = f.getBlob();
  return { ok: true, dataUrl: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) };
}

function rkGetDocx_(req, props) {
  const info = rkInfo_(props, req.reportId);
  const folder = info ? rkFolderOk_(info.f) : null;
  if (!folder) throw new Error('Folder laporan tidak ditemukan di Google Drive.');
  const it = folder.getFilesByType(MIME_DOCX);
  if (!it.hasNext()) return { ok: true, b64: '' };
  const f = it.next();
  return { ok: true, name: f.getName(), b64: Utilities.base64Encode(f.getBlob().getBytes()) };
}

/** Hapus laporan: folder jenisnya ke Sampah Drive (bisa dipulihkan ±30 hari). Folder berkas ikut ke Sampah bila sudah kosong. */
function rkDelete_(req, props) {
  const id = String(req.reportId || '');
  const info = rkInfo_(props, id);
  const folder = info ? rkFolderOk_(info.f) : null;
  if (folder) folder.setTrashed(true);
  props.deleteProperty('R:' + id);
  let berkasDihapus = false;
  const b = info ? rkFolderOk_(info.b) : null;
  if (b && !b.getFolders().hasNext() && !b.getFiles().hasNext()) { b.setTrashed(true); berkasDihapus = true; }
  return { ok: true, dihapus: !!folder, berkasDihapus: berkasDihapus };
}
