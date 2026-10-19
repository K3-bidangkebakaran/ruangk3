# Portal PIC (ruangk3.com/pic/)

Aplikasi lapangan untuk PIC kegiatan LPMI (semua PIC melihat semua kegiatan yang diinput admin utama): **absensi TTD peserta** (dengan kolom **Batal**), **TTD PIC**, dan
**dokumentasi foto peserta**. Bisa dipakai tanpa sinyal; begitu ada sinyal hasilnya terkirim otomatis ke website
ruangk3.com dan disimpan ke Google Drive. Admin utama tinggal mencetak.

## Alur

```
Admin utama (panel ruangk3.com → Daftar Hadir)
  tab "Portal PIC"     : hanya membuat akun PIC                         → dh_pic/{uid}
  tab "Input Kegiatan" : input kegiatan seperti biasa (nama, tanggal, PIC/penyelenggara, peserta)
        │   aplikasi Daftar Hadir mengirim kegiatan otomatis        → dh_kegiatan/{kid}
        ▼   (tombol "📲 PIC" di bilah atas aplikasi menunjukkan statusnya)
HP PIC  (ruangk3.com/pic/ atau APK "Portal PIC", offline-first, IndexedDB "portal-pic")
  - SEMUA akun PIC melihat SEMUA kegiatan (yang akan/sedang berlangsung di atas, bisa dicari)
  - Absensi TTD Peserta · TTD PIC · Dokumentasi Peserta
  - kolom Batal: peserta batal → namanya dicoret sampai kolom TTD di daftar hadir
  - hasil dikirim otomatis saat ada sinyal → dh_media/{kid}/*, lalu dh_hasil/{kid}/{uid PIC}
        │
        ▼
Aplikasi Daftar Hadir (terbuka di panel admin, juga di latar saat panel Daftar Hadir dibuka)
  - menarik hasil PIC dan menggabungkannya ke kegiatan yang sama:
    TTD peserta, foto, tanda Batal, TTD PIC (nama PIC jadi penandatangan)
  - pratinjau, Cetak/PDF, Word, dan penyimpanan otomatis ke Google Drive memakai alur yang sudah ada
```

Tidak ada input kegiatan terpisah untuk PIC. Kegiatan yang dihapus di Input Kegiatan ikut dihapus dari aplikasi PIC
(data hasil + gambarnya di Firebase juga dibersihkan).

## Data di Realtime Database (`artifacts/k3-kebakaran-app-v5/public/data`)

| Node | Isi |
|---|---|
| `dh_pic/{uid}` | profil PIC `{nama, user, hp, aktif, dibuat}` (uid = Firebase Auth email/kata sandi) |
| `dh_kegiatan/{kid}` | dari Input Kegiatan: `{nama, tgl[], tempat, kota, jamMulai, jamSelesai, zona, peserta[{id,nama,instansi,batal}], dibuat, upd}` |
| `dh_hasil/{kid}/{uid}` | hasil satu akun PIC (tanda saja): `{batal{pid:true/false}, hadir{pid:{tanggal:1}}, foto{pid:1}, ttdPic, ttdPicNama, picNama, upd, rev, picUid}` |
| `dh_media/{kid}/{kunci}` | gambar (dataURL): `s_<pid>_<tanggal>` TTD peserta, `f_<pid>` foto, `pic` TTD PIC |

Hasil dikirim **gambar dulu, ringkasan terakhir**, jadi admin tidak pernah melihat tanda tanpa gambarnya.
Bila dua PIC mengisi peserta yang sama, gambar terakhir yang masuk dipakai; `batal` diambil dari ringkasan yang paling baru.

## WAJIB: pasang aturan Firebase

Tanpa ini tombol "📲 PIC" di aplikasi Daftar Hadir menampilkan "aturan Firebase?" dan PIC tidak bisa masuk/mengirim.
Firebase Console → Realtime Database → **Rules**. Tambahkan blok berikut di dalam node
`artifacts → k3-kebakaran-app-v5 → public → data` (gabungkan dengan aturan yang sudah ada, jangan menimpa).
**Ganti seluruh blok `dh_pic`, `dh_kegiatan`, `dh_hasil`, `dh_media` lama bila sebelumnya sudah dipasang** (model lama: kegiatan per PIC).
`.indexOn` untuk `picUid` tidak diperlukan lagi.

```json
"dh_pic": {
  ".read": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  ".write": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  "$uid": { ".read": "auth != null && auth.uid == $uid" }
},
"dh_kegiatan": {
  ".read": "auth != null && (auth.token.firebase.sign_in_provider == 'anonymous' || (root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid).exists() && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid + '/aktif').val() != false))",
  ".write": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'"
},
"dh_hasil": {
  ".read": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  ".write": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  "$kid": {
    "$uid": {
      ".read": "auth != null && auth.uid == $uid && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid).exists()",
      ".write": "auth != null && auth.uid == $uid && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid + '/aktif').val() != false && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid).exists()"
    }
  }
},
"dh_media": {
  ".read": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  ".write": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  "$kid": {
    ".read": "auth != null && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid).exists()",
    ".write": "auth != null && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid + '/aktif').val() != false && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid).exists()"
  }
}
```

Catatan keamanan: sesi admin di ruangk3.com memakai login anonim Firebase (PIN admin diperiksa di sisi browser), jadi
aturan tidak bisa membedakan admin dari pengunjung anonim lain. Yang dijaga aturan: sesama PIC tidak bisa menulis/menghapus
hasil PIC lain, PIC tidak bisa mengubah kegiatan atau akun, dan akun yang dinonaktifkan/tidak terdaftar tidak bisa membaca atau mengirim.
Karena semua PIC melihat semua kegiatan, mereka juga bisa membaca gambar (TTD/foto) kegiatan mana pun; pengamanan penuh
baru tercapai bila admin nanti dipindah ke login Firebase sungguhan.

Juga pastikan **Authentication → Sign-in method → Email/Password** aktif (sudah dipakai Riksa Uji).

## Akun PIC

- Dibuat di panel admin → Daftar Hadir → tab **Portal PIC** (hanya berisi akun PIC): nama, email (atau username tanpa @, otomatis
  `username@pic.ruangk3.com`), kata sandi awal (min. 6 karakter).
- PIC masuk sekali saat ada sinyal; sesi tersimpan sehingga aplikasi bisa dipakai offline.
- PIC bisa mengganti kata sandi sendiri di aplikasi. Reset lewat email hanya untuk akun berEmail asli.
- Akun dinonaktifkan → tidak bisa mengirim dan otomatis keluar dari aplikasi begitu HP mendapat sinyal.

## Berkas

| Berkas | Isi |
|---|---|
| `index.html`, `js/app.js` | aplikasi PIC (offline-first, antrean kirim, tanda tangan, foto ber-watermark) |
| `js/firebase.js` | login PIC & akses data (app Firebase terpisah `portal-pic`) |
| `admin.html` | halaman admin (tab "Portal PIC" di menu Daftar Hadir): hanya akun PIC |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA, bisa di-install dan dibuka tanpa sinyal |

**Setiap mengubah berkas di folder ini, naikkan `VERSION` di `sw.js`** (mis. `pic-v3`).

## Pasang di HP / buat APK

1. Buka `https://ruangk3.com/pic/` di Chrome HP → ⋮ → **Install aplikasi**.
2. APK "Portal PIC": masukkan `https://ruangk3.com/pic/` ke pwabuilder.com → Android (Google Play / Signing key baru,
   Package ID mis. `com.ruangk3.pic`), lalu gabungkan entri baru ke `/.well-known/assetlinks.json` (jangan menimpa
   entri `com.ruangk3.twa` yang sudah ada). Simpan keystore di tempat aman, jangan di repo.

## Kamera & watermark foto

Dokumentasi diambil **langsung dari kamera di dalam aplikasi** (bukan memilih file): pratinjau langsung, tombol ambil, lalu
"Ulangi" / "Pakai foto". Watermark di bagian bawah foto: **nama peserta**, kegiatan + tempat, **titik lokasi Maps**
(koordinat GPS + akurasi), serta **tanggal dan jam** (dari jam HP). Tombol ambil menunggu GPS terkunci (maks. 8 detik; bila
GPS tidak ada, foto bertanda "tidak tersedia"). Bila kamera langsung gagal (izin ditolak, dsb.), tersedia cadangan kamera bawaan HP
dengan watermark yang sama. Nama tempat di watermark diambil dari kolom Tempat (+ Kota) yang diisi admin di Input Kegiatan.

**Pasang untuk PIC: lewat Chrome (Instal aplikasi), bukan APK.** Di APK hasil PWABuilder (TWA) GPS ditolak di HP uji walau Location delegation menyala; di Chrome (menu ⋮ → Instal aplikasi) lokasi bekerja normal. Buka `https://ruangk3.com/pic/` di Chrome, izinkan Kamera + Lokasi (akurat), lalu Instal.

## Kapasitas

Foto ±100–250 KB (maks 1280 px), TTD ±10–20 KB. Satu kegiatan 30 peserta × 2 hari ≈ 8–10 MB di Realtime Database
(paket gratis 1 GB). Kegiatan lama dapat dihapus dari tab Input Kegiatan (ikut membersihkan Firebase dan, bila terhubung, folder Drive-nya).

## Penyimpanan otomatis ke Google Drive (tanpa web dibuka)

Hasil PIC (`dh_hasil` + `dh_media`) juga diambil oleh Apps Script Daftar Hadir tiap 5 menit dan disimpan ke Drive. Pasang sekali: lihat bagian "Hasil APK Portal PIC tersimpan otomatis" di `daftar-hadir/apps-script/PANDUAN-GOOGLE-DRIVE.md` (fungsi `picOtomatisAktifkan`). Apps Script login anonim, jadi aturan `dh_*` di atas harus mengizinkan baca untuk `auth != null`.

## Bidang PAPA (kelas alat)

`dh_kegiatan/{kid}` membawa `papa` (bool), `kelas` (daftar nama kelas) dan `peserta[].kelas`. APK hanya menampilkan lencana kelas di daftar peserta dan mengurutkan per kelas; hasil PIC (`dh_hasil`, `dh_media`) tetap per peserta sehingga tidak berubah. Laporan dipecah per kelas di aplikasi Daftar Hadir.


## Absen Selfie Peserta (halaman `ruangk3.com/selfie/`)

Fitur opsional per kegiatan: di Daftar Hadir → tab **Laporan**, centang **Absen Selfie Peserta**. Aplikasi menerbitkan `dh_selfie/{kid}`;
PIC melihat tile **Link Absen Selfie Peserta** di kegiatan itu (aplikasi Portal PIC) dan membagikan link `https://ruangk3.com/selfie/?k={kid}` ke peserta.
Peserta (tanpa login, Firebase anonim) memilih nama (+ perusahaan), selfie kamera depan; foto 720×960 ber-watermark nama, perusahaan, tanggal/jam, lokasi.
Pagi = sebelum 12.00, siang = 12.00 ke atas, menurut zona waktu kegiatan (jam server Firebase). Hanya bisa pada hari kegiatan, sekali per peserta per sesi.
Aplikasi Daftar Hadir (admin) menarik foto ke `p.sf[tanggal].p|s`, menyimpannya ke Drive (`Selfie Absensi/<tanggal>`), dan membuat lembar **Absen Selfie Peserta**
(tabel per hari: No, Nama, Perusahaan, Absen Pagi, Absen Siang) tepat setelah Daftar Hadir (pratinjau, Cetak/PDF, Word `2. Absen Selfie Peserta - …`).
Admin bisa menghapus satu selfie (tab Laporan → "Lihat / hapus selfie per peserta") agar peserta mengulang.

| Node | Isi |
|---|---|
| `dh_selfie/{kid}` | info untuk halaman peserta: `{nama, tgl[], tempat, kota, zona, peserta[{id,nama,instansi}]}` (hanya diterbitkan bila Absen Selfie dicentang) |
| `dh_selfie_foto/{kid}/{pid~tanggal~p|s}` | foto selfie (dataURL JPEG), sekali tulis |
| `dh_selfie_st/{kid}/{pid~tanggal~p|s}` | penanda waktu server (angka) bahwa foto sudah ada |

### WAJIB: tambahkan aturan Firebase untuk selfie
Firebase Console → Realtime Database → Rules, di dalam `artifacts → k3-kebakaran-app-v5 → public → data` (gabungkan, jangan menimpa aturan lain):

```json
"dh_selfie": {
  "$kid": { ".read": "auth != null", ".write": "auth != null" }
},
"dh_selfie_st": {
  ".read": "auth != null",
  "$kid": { "$k": { ".write": "auth != null && (!data.exists() || !newData.exists())", ".validate": "newData.isNumber()" } }
},
"dh_selfie_foto": {
  "$kid": {
    ".read": "auth != null",
    "$k": { ".write": "auth != null && (!data.exists() || !newData.exists())", ".validate": "newData.isString() && newData.val().length < 400000 && newData.val().matches(/^data:image\\/jpeg;base64,/)" }
  }
}
```

Catatan: peserta dan admin sama-sama login anonim, jadi aturan tidak bisa membedakan; yang dijaga: foto tidak bisa ditimpa (hanya ditulis sekali, boleh dihapus),
ukuran dibatasi, dan daftar kegiatan tidak bisa dicacah (tidak ada `.read` di `dh_selfie`/`dh_selfie_foto` tingkat atas). Link berisi ID kegiatan acak; siapa pun yang memegang link bisa melihat nama peserta kegiatan itu.

## Link Tanda Tangan Narasumber (halaman `ruangk3.com/narasumber/`)

Di aplikasi Portal PIC → **Absensi Narasumber**, tiap baris narasumber (yang sudah punya nama) punya tombol **Bagikan link ke narasumber** dan **Salin link**.
Tombol itu menerbitkan `dh_nara/{kid}/{kunciBaris}` (nama, instansi, materi, kegiatan, tanggal, tempat; kunciBaris = `tanggal`, `tanggal_N`, atau `kunciProgram~tanggal` untuk B3)
dan membuat link `https://ruangk3.com/narasumber/?k={kid}&r={kunciBaris}`. Saat narasumber membuka link, halaman menyapa otomatis
(Selamat pagi/siang/sore/malam menurut jam HP: pagi 04.00-10.59, siang 11.00-14.59, sore 15.00-17.59, malam 18.00-03.59), menampilkan nama narasumber hari itu,
lalu kotak tanda tangan. TTD (PNG 600x240) ditulis ke `dh_nara_ttd/{kid}/{kunciBaris}` dan penanda waktu ke `dh_nara_st/{kid}/{kunciBaris}`; setelah terkirim, link terkunci (hanya sekali).
Aplikasi PIC (pendengar `dh_nara_st`) dan Daftar Hadir admin (`Pic.pullNara`) langsung memasang TTD itu ke baris narasumber yang sama (`lap.nr` / `lap.nrk`), jadi tampil di pratinjau dan Word Absensi Narasumber.
Bila PIC menghapus TTD, node `dh_nara_ttd` + `dh_nara_st` baris itu ikut dikosongkan supaya link bisa dipakai lagi. Perubahan nama/materi setelah link dibagikan otomatis memperbarui `dh_nara`.
Teks "Training K3 Kemenaker RI" di kalimat pembuka ada di `narasumber/index.html` (fungsi `helloHtml`). Aturan Firebase tidak perlu diubah (cukup `auth != null` seperti fitur lain). Menghapus kegiatan juga membuang ketiga node ini.

## Link Tanda Tangan Peserta (halaman `ruangk3.com/ttd/`)

Di aplikasi Portal PIC → **Absensi TTD Peserta** ada kartu **Link TTD peserta** dengan tombol **Bagikan link** dan **Salin link**.
Link: `https://ruangk3.com/ttd/?k={kid}` (kegiatan biasa) atau `...&kl={kunciAlat}` (PAPA / B3: satu link per alat/program, hanya memuat nama peserta alat itu).
Tombol menerbitkan `dh_ttdp/{kid}/{kunciAlat|_}` = `{kegiatan, kelas, tgl[], tempat, kota, zona, peserta[{id,nama,instansi,hr[]}]}`; `hr` = hari wajib TTD
(peserta cancel tidak ikut, remedial hanya hari terakhir). Perubahan status peserta setelah link dibagikan otomatis memperbarui daftar nama.
Peserta membuka link (tanpa login), memilih namanya (ada pencarian), lalu **langsung muncul kotak tanda tangan** untuk HARI INI menurut jam server & zona kegiatan.
TTD (PNG 600x240) ditulis ke `dh_ttdp_ttd/{kid}/{kunciAlat|_}/{pid~tanggal}` + penanda waktu `dh_ttdp_st/...`; satu kali per nama per hari (nama yang sudah TTD terkunci "✓ Sudah TTD").
Aplikasi PIC (pendengar `dh_ttdp_st`) memasangnya ke `h.hadir[pid][tanggal]` (tidak menimpa TTD yang sudah ada) sehingga ikut terkirim ke admin lewat jalur biasa;
Daftar Hadir admin juga menariknya langsung (`Pic.pullTtdp`, penanda terlihat di `ev.pic.tp`) ke `p.ttd[tanggal]`. Menghapus kegiatan membuang ketiga node ini.
Aturan Firebase tidak perlu diubah (cukup `auth != null` seperti fitur narasumber).
