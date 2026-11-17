/**
 * CADANGAN OTOMATIS RUANGK3 -> GOOGLE DRIVE
 *
 * Menyalin data ruangk3.com (peserta, hasil ujian, materi, berita, gambar, dll.) ke folder Google Drive
 * setiap hari. Ini CADANGAN: website tetap membaca dari Firebase supaya cepat. Folder Drive tidak
 * dipakai website secara langsung.
 *
 * Hasil di Drive (di dalam folder FOLDER_ID):
 *   Backup-2026-10-04/        <- satu folder per hari (berisi file .json per kelompok data + _ringkasan.txt)
 *   media/                    <- semua PDF & gambar asli, satu file per isi (tidak diunggah ulang bila sama)
 * Di dalam file .json, PDF/gambar besar diganti rujukan "@media/nama-file.ext".
 *
 * CARA PASANG (sekali saja, ±5 menit) -- lihat juga PETUNJUK-PASANG.txt:
 *   1. Buka https://script.google.com -> Proyek baru -> hapus isi bawaan -> tempel seluruh kode ini.
 *      Ganti TEMPEL_ID_FOLDER_DI_SINI di CONFIG dengan ID folder Drive cadangan (salinan di GitHub sengaja tanpa ID).
 *   2. Simpan, pilih fungsi "setup" di menu atas, klik Jalankan, setujui izin (Drive & koneksi eksternal).
 *   3. Selesai: cadangan pertama langsung berjalan, lalu otomatis tiap hari sekitar jam 02.00.
 */

var CONFIG = {
  FOLDER_ID: 'TEMPEL_ID_FOLDER_DI_SINI', // ID folder Drive cadangan (JANGAN di-commit ke GitHub; isi hanya di editor Apps Script)
  DB_URL: 'https://portal-k3-bidang-kebakaran-default-rtdb.asia-southeast1.firebasedatabase.app',
  API_KEY: 'AIzaSyA2ow2lR4Z3lX7zBcZC5Xg3eWlDm7KNAAg',
  ROOT: 'artifacts/k3-kebakaran-app-v5/public/data',
  KEEP_BACKUPS: 14,                 // simpan 14 folder harian terakhir, yang lebih lama dibuang ke Sampah Drive
  MIN_MEDIA_CHARS: 20000,           // string data:... lebih panjang dari ini disimpan sebagai file terpisah
  PER_ANAK: ['modul', 'modul_dokumen', 'berita', 'berita_foto', 'pjk3_mitra', 'riksa_foto', 'riksa_laporan_data', 'dh_info_foto'], // node berat: diambil per item (dh_info_foto = foto Informasi Umum otomatis dari APK PIC, 2026-11-17)
  SKIP: [],                         // nama node yang ingin dilewati
  BATAS_WAKTU_MS: 5 * 60 * 1000     // batas aman (Apps Script maksimal 6 menit)
};

function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'backupSekarang') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('backupSekarang').timeBased().everyDays(1).atHour(2).create();
  backupSekarang();
}

function backupSekarang() {
  var mulai = Date.now();
  var token = getIdToken_();
  var root = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  var mediaFolder = getOrCreateFolder_(root, 'media');
  var tanggal = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  var hariIni = getOrCreateFolder_(root, 'Backup-' + tanggal);
  var ringkasan = [];
  var mediaBaru = { n: 0, ada: 0 };

  var topKeys = Object.keys(fbGet_(CONFIG.ROOT, token, true) || {});
  for (var i = 0; i < topKeys.length; i++) {
    var key = topKeys[i];
    if (CONFIG.SKIP.indexOf(key) >= 0) continue;
    if (Date.now() - mulai > CONFIG.BATAS_WAKTU_MS) {
      ringkasan.push('DILEWATI (kehabisan waktu): ' + key);
      continue;
    }
    try {
      var data;
      if (CONFIG.PER_ANAK.indexOf(key) >= 0) {
        data = {};
        var anak = Object.keys(fbGet_(CONFIG.ROOT + '/' + key, token, true) || {});
        for (var j = 0; j < anak.length; j++) {
          if (Date.now() - mulai > CONFIG.BATAS_WAKTU_MS) { ringkasan.push('DILEWATI sebagian (waktu): ' + key); break; }
          data[anak[j]] = fbGet_(CONFIG.ROOT + '/' + key + '/' + anak[j], token, false);
        }
      } else {
        data = fbGet_(CONFIG.ROOT + '/' + key, token, false);
      }
      var bersih = ekstrakMedia_(data, key, function (nama, mime, b64) {
        var ada = mediaFolder.getFilesByName(nama);
        if (ada.hasNext()) { mediaBaru.ada++; return; }
        mediaFolder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, nama));
        mediaBaru.n++;
      });
      tulisJson_(hariIni, key + '.json', bersih);
      ringkasan.push('OK: ' + key);
    } catch (e) {
      ringkasan.push('GAGAL: ' + key + ' -> ' + e.message);
    }
  }

  ringkasan.push('Media baru: ' + mediaBaru.n + ', sudah ada: ' + mediaBaru.ada);
  ringkasan.push('Durasi: ' + Math.round((Date.now() - mulai) / 1000) + ' detik');
  tulisTeks_(hariIni, '_ringkasan.txt', ringkasan.join('\n'));
  buangBackupLama_(root);
  Logger.log(ringkasan.join('\n'));
}

/* ---------- Firebase ---------- */

function getIdToken_() {
  var props = PropertiesService.getScriptProperties();
  var refresh = props.getProperty('FB_REFRESH_TOKEN');
  var headers = { Referer: 'https://ruangk3.com/' };
  if (refresh) {
    var r = UrlFetchApp.fetch('https://securetoken.googleapis.com/v1/token?key=' + CONFIG.API_KEY, {
      method: 'post', contentType: 'application/x-www-form-urlencoded', headers: headers, muteHttpExceptions: true,
      payload: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(refresh)
    });
    if (r.getResponseCode() === 200) {
      var j = JSON.parse(r.getContentText());
      props.setProperty('FB_REFRESH_TOKEN', j.refresh_token);
      return j.id_token;
    }
  }
  var s = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + CONFIG.API_KEY, {
    method: 'post', contentType: 'application/json', headers: headers, muteHttpExceptions: true,
    payload: JSON.stringify({ returnSecureToken: true })
  });
  if (s.getResponseCode() !== 200) {
    throw new Error('Gagal masuk ke Firebase (login anonim): ' + s.getContentText());
  }
  var sj = JSON.parse(s.getContentText());
  props.setProperty('FB_REFRESH_TOKEN', sj.refreshToken);
  return sj.idToken;
}

function fbGet_(path, token, shallow) {
  var url = CONFIG.DB_URL + '/' + path + '.json?auth=' + encodeURIComponent(token) + (shallow ? '&shallow=true' : '');
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { Referer: 'https://ruangk3.com/' } });
  if (r.getResponseCode() !== 200) throw new Error('HTTP ' + r.getResponseCode() + ' pada ' + path);
  return JSON.parse(r.getContentText());
}

/* ---------- Media: pisahkan PDF/gambar besar dari JSON ---------- */

// Mengganti setiap string "data:<mime>;base64,..." yang panjang dengan rujukan "@media/<file>"
// dan memanggil simpan(nama, mime, base64) untuk file aslinya. Mengembalikan salinan data yang sudah bersih.
function ekstrakMedia_(nilai, jalur, simpan) {
  if (typeof nilai === 'string') {
    if (nilai.length >= CONFIG.MIN_MEDIA_CHARS && nilai.indexOf('data:') === 0) {
      var koma = nilai.indexOf(',');
      var m = koma > 0 && koma < 200 ? /^data:([^;,]+)(;[^,]*)?$/.exec(nilai.slice(0, koma)) : null;
      if (m && /;base64/.test(m[2] || '')) {
        var mime = m[1];
        var b64 = nilai.slice(koma + 1);
        var nama = 'file_' + md5_(b64) + '.' + ekstensi_(mime); // nama dari isi file -> salinan identik tidak dobel
        simpan(nama, mime, b64);
        return '@media/' + nama;
      }
    }
    return nilai;
  }
  if (Array.isArray(nilai)) {
    return nilai.map(function (v, i) { return ekstrakMedia_(v, jalur + '-' + i, simpan); });
  }
  if (nilai && typeof nilai === 'object') {
    var out = {};
    Object.keys(nilai).forEach(function (k) { out[k] = ekstrakMedia_(nilai[k], jalur + '-' + k, simpan); });
    return out;
  }
  return nilai;
}

function md5_(teks) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, teks);
  return bytes.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('').slice(0, 12);
}
function ekstensi_(mime) {
  var peta = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4' };
  return peta[mime] || (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
}

/* ---------- Drive ---------- */

function getOrCreateFolder_(parent, nama) {
  var it = parent.getFoldersByName(nama);
  return it.hasNext() ? it.next() : parent.createFolder(nama);
}
function tulisJson_(folder, nama, objek) { tulisTeks_(folder, nama, JSON.stringify(objek, null, 1)); }
function tulisTeks_(folder, nama, teks) {
  var it = folder.getFilesByName(nama);
  if (it.hasNext()) { it.next().setContent(teks); } else { folder.createFile(nama, teks, MimeType.PLAIN_TEXT); }
}
function buangBackupLama_(root) {
  var daftar = [];
  var it = root.getFolders();
  while (it.hasNext()) { var f = it.next(); if (/^Backup-\d{4}-\d{2}-\d{2}$/.test(f.getName())) daftar.push(f); }
  daftar.sort(function (a, b) { return a.getName() < b.getName() ? 1 : -1; }); // terbaru dulu
  for (var i = CONFIG.KEEP_BACKUPS; i < daftar.length; i++) daftar[i].setTrashed(true); // ke Sampah (bisa dipulihkan)
}
