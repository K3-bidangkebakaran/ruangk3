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
  ".read": "auth != null && (auth.token.firebase.sign_in_provider == 'anonymous' || (root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid).exists() && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid + '/aktif').val() != false))",
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

## Sinkron antar akun PIC (v37)
Semua akun PIC melihat kegiatan yang sama. APK memantau seluruh `dh_hasil` (hanya tanda/teks kecil; gambar tetap di `dh_media`) dan menampilkan hasil akun PIC lain langsung (TTD peserta, foto, TTD PIC, cancel/remedial, nilai, kelulusan, isian laporan & narasumber) tanpa menunggu website admin dibuka. Bila dua akun mengisi hal yang sama, isian yang waktunya (`upd`) lebih baru menang, sama seperti penggabungan di website. Sejak v44 aturan `dh_hasil` (baca seluruh node) harus mengizinkan PIC terdaftar & aktif (lihat blok aturan di atas); bila belum diganti, APK menampilkan kartu peringatan di layar utama dan hanya menampilkan hasil akun sendiri.

## Pratinjau Laporan (v40)

Di menu kegiatan (dan di layar alat/program) ada tombol **Pratinjau Laporan**. Layar ini menampilkan persen kelengkapan laporan dan daftar bagian laporan: Daftar Hadir (TTD peserta), Dokumentasi Peserta, Dokumentasi Harian, Absensi Narasumber, Nilai & Kelulusan, Penandatangan Daftar Nilai, dan TTD PIC. Kegiatan Pesawat Angkat & B3 dipisah per alat/program. Ketuk satu bagian untuk melihat rinciannya (baris merah = masih kurang; foto bisa diketuk untuk diperbesar), lalu ketuk **Lengkapi** untuk langsung ke layar pengisiannya; tombol kembali membawa PIC ke pratinjau lagi. Isian yang sudah diisi di website atau oleh akun PIC lain ikut dihitung. Bagian hanya muncul bila diaktifkan admin pada laporan kegiatan itu.

## Pratinjau Word & link TTD Daftar Nilai (v41)

**Pratinjau Word:** tombol di menu kegiatan (dan di layar Pratinjau Laporan) menampilkan tampilan seperti berkas Word: Daftar Hadir, Dokumentasi Peserta, Daftar Nilai, Lulus / Tidak Lulus, Dokumentasi Harian, dan Absensi Narasumber, lengkap dengan kop surat. Untuk Pesawat Angkat & B3 ada pilihan alat/program. Tanda ✔ berarti TTD atau foto itu sudah ada di website atau akun PIC lain. Susunan halaman Word asli bisa sedikit berbeda.

**Link TTD Daftar Nilai:** di layar *Penandatangan Daftar Nilai*, setelah nama Pengawas / Ahli K3 diisi, ketuk **Bagikan link TTD** (atau Salin link). Penandatangan membuka link di HP-nya dan menandatangani; hasilnya masuk otomatis ke APK, ke Daftar Nilai, dan ke website. Bila TTD dihapus di APK, link bisa dipakai lagi.

## Link darurat TTD / selfie & layar tidak lagi tergulir sendiri (v42)

**Layar tergulir ke atas sendiri (diperbaiki):** saat mengisi data, pembaruan dari server (TTD peserta, narasumber, hasil akun PIC lain) atau memilih isian dulu memuat ulang layar dan membuatnya kembali ke atas. Sekarang posisi gulir dipertahankan (termasuk di Pratinjau Word), dan pembaruan di latar menunggu sampai Anda selesai mengetik.

**Link darurat:** setelah tanggal kegiatan lewat, layar *Absensi TTD Peserta* dan *Absen Selfie Peserta* menampilkan kartu **Darurat: peserta belum TTD / selfie** dengan tombol Bagikan dan Salin link darurat (link biasa ditambah `&darurat=1`). Peserta membuka link, memilih namanya (tampil nama yang masih punya hari/sesi kosong), lalu tanda tangan atau selfie **satu kali**; hasilnya otomatis dicatat ke semua tanggal yang belum diselesaikan. Selfie darurat diberi watermark "ABSEN DARURAT" beserta waktu foto sebenarnya. Link darurat tidak aktif selama kegiatan masih berjalan. Halaman TTD dan selfie yang dibuka tanpa `&darurat=1` setelah kegiatan selesai juga menampilkan tombol darurat.

**Perbaikan link darurat (v43):** daftar nama di halaman darurat hanya memuat peserta yang masih punya tanggal kosong, dengan tanggalnya. Peserta Remedial hanya diminta tanda tangan di hari terakhir (tanggal ujian); hari berwarna kuning tidak perlu. Selfie darurat dihitung per tanggal: satu foto otomatis menjadi satu foto untuk tiap tanggal yang belum selfie, dengan watermark nama, perusahaan, "ABSEN DARURAT" + tanggal itu, dan lokasi baku "Morowali, IMIP".

**Sinkron antar HP/akun (v44):** (1) Dua HP dengan akun PIC yang sama tidak lagi saling menimpa: sebelum mengirim, APK menggabungkan dulu isian yang sudah ada di server (hanya menambah). (2) Website Daftar Hadir tidak lagi melewatkan penarikan data bila ada penarikan lain yang sedang berjalan, tidak lagi salah menilai HP yang jamnya lambat, dan hanya mengunduh gambar yang berubah. (3) Layar *Narasumber* dan *Penandatangan Nilai* memberi keterangan **✓ Sudah TTD** (diisi di HP ini / diisi PIC lain / sudah ada di website) atau **Belum TTD**, supaya PIC lain tahu. (4) Sinkron lebih cepat: kirim ±0,4 detik setelah isian, tarik berkala 20 detik di APK dan 60 detik di website, unggah gambar 4 sekaligus. (5) Aturan Firebase `dh_hasil` perlu diganti (lihat blok aturan di atas).

## v45
- Foto, TTD, dan tanda tangan narasumber dari akun PIC lain diunduh dan disimpan di cache (IDB `x:<kid>`), tampil dengan label "Oleh: <nama akun>".
- Pratinjau Word APK memakai kode laporan web sendiri: `pic/js/wrd.js` DIHASILKAN oleh `pic/tools/build-wrd.js` (butuh `npm i acorn`; jalankan `node pic/tools/build-wrd.js`). Jalankan ulang tiap kali kode laporan web (renderSet/kelasGroups/rundown) berubah.
- Gambar yang hanya ada di web (diketik/digambar di web, bukan dari PIC) tampil sebagai placeholder ✔ karena web hanya mengirim penanda/jumlah.
- `Pic.node` bertambah: `jenis`, `kegiatan`, `bk`, `lap.rundown`, `lap.hn`.
- Kegiatan yang diunduh dari Drive (mis. admin LPMI01) ikut dikirim ke APK (`storeEv` -> `Pic.mark`, reseed sekali `pic-lpmi1`).
- Aturan Firebase sebenarnya terbuka (`auth != null`); tidak perlu ubah aturan.
- APP_VER v45, sw.js VERSION pic-v45.

## v46
- Gambar yang hanya ada di WEBSITE (foto/TTD peserta, TTD PIC, TTD pengawas/ahli, TTD narasumber, foto dokumentasi harian) diunggah web ke node baru `dh_wmedia/{kid}/{kunci}` + sidik di `dh_wmedia_st/{kid}` (`Pic.pubWeb`). Kunci sama dengan `dh_media` (`s_{pid}_{tgl}`, `f_/f2_{pid}`, `pic`, `n1`, `n2`, `nr_{kunci}`) + `wd_{tgl}_{i}` untuk foto harian. Gambar kiriman PIC (sidik ada di `mh` dh_hasil) dilewati. Hanya kunci yang diunggah perangkat itu yang bisa dihapusnya (admin utama & LPMI01 tidak saling menghapus). Tanda `wm` (sidik gabungan) ada di `dh_kegiatan/{kid}`; APK mengunduh hanya yang berubah (`wmLoad`, cache IDB `w:<kid>`), tampil di Word, foto peserta, dokumentasi harian ("Dari website"). Tanda ✔ tinggal untuk gambar yang belum sempat terkirim.
- Aturan Firebase tetap `auth != null` (tidak perlu diubah); node baru: `dh_wmedia`, `dh_wmedia_st`, `pengaturan_drive_dh`.
- APP_VER v46, sw.js VERSION pic-v46.

## v47
- Web: hasil PIC lebih tahan hilang. (1) `Cloud.refresh` (kegiatan diganti dari Drive) mencabut tanda "sudah digabung" (`ev.pic.msig`) agar foto/TTD PIC digabung ulang. (2) `mediaFor`: gambar tercatat tetapi kosong di server tidak dianggap sudah diunduh. (3) `Pic.picGaps`: sekali per sesi per kegiatan, foto/TTD yang tercatat PIC tetapi tidak ada di kegiatan digabung ulang. (4) `merge` menghitung gambar belum terbaca (`mMiss`, dicoba lagi maks. 4x) dan flag tanpa peserta cocok (`mOrphan`, ditampilkan oleh tombol 📲 PIC).
- APP_VER v47, sw.js VERSION pic-v47.

## v48
- Selfie / TTD lewat link (peserta & narasumber) tahan hilang di web: `pullSelfie1`, `pullNara1`, `pullTtdp1` kini memeriksa ISI kegiatan (bukan hanya tanda "sudah dilihat"): yang tercatat di server tetapi tidak ada di kegiatan (mis. tertimpa versi Drive lama) ditarik lagi (maks. 3-4x per sesi per item); hanya gambar yang benar-benar terbaca ditandai selesai. Bila `lap.selfie` mati di salinan kegiatan tetapi `dh_selfie/{kid}` aktif di server, Absen Selfie dinyalakan kembali.
- `Pic.lock(kid, fn)`: baca-ubah-simpan kegiatan oleh `pullAll`, selfie, TTD link, dan narasumber dijalankan satu per satu per kegiatan (sebelumnya bisa saling menimpa sehingga foto/TTD yang baru digabung hilang).
- APP_VER v48, sw.js VERSION pic-v48.

## v49
- APK PIC: layar baru **Hasil Selfie Peserta** (menu di kegiatan yang Absen Selfie-nya aktif, juga tombol di layar link selfie). Per hari: daftar peserta (tanpa yang batal) dengan foto selfie Pagi/Siang, ketuk foto untuk preview (bisa geser, zoom), tombol **Hapus** (dengan konfirmasi) di daftar dan di preview. Hanya akun PIC yang login yang bisa menghapus. Ringkasan Pagi x/y, Siang x/y; tombol Muat ulang (selfie yang dihapus pihak lain hilang, selfie ulang peserta muncul).
- Hapus = `PicFB.selfieDel(kid, key)`: tulis catatan `dh_selfie_del/{kid}/{pid~tgl~p|s}`, lalu hapus `dh_selfie_st` (peserta langsung bisa selfie ulang di link yang sama) dan `dh_selfie_foto`. Node baru: `dh_selfie_del` (aturan Firebase tetap `auth != null`).
- Web: `Pic.pullSelfie1` membaca `dh_selfie_del`; selfie yang dulu ditarik dari server (`ev.pic.sf`), kini tidak ada lagi di `dh_selfie_st` (dicek ulang langsung ke server) ikut dihapus dari Daftar Hadir (dan terkirim ke Drive). Selfie manual admin & selfie ulang peserta tidak ikut terhapus. `Pic.hapusSelfie` (web) juga menulis catatan hapus; `hapusSelfieSemua` membuang `dh_selfie_del`.
- Word APK tab Absen Selfie: gambar selfie yang diulang ikut diperbarui (SFT).
- APP_VER v49, sw.js VERSION pic-v49.

## v50-v51
- Materi **Teknisi K3 Deteksi Gas** (katalog `tdg1`-`tdg3`, judul "Deteksi Gas 1" dst., `grp "*"`): Gas 1 = Dasar-Dasar K3, Kebijakan K3, Peraturan Perundang-Undangan K3 Ruang Terbatas; Gas 2 = Prosedur Ijin Kerja RT, Karakteristik Gas Atmosfir, Pengenalan Alat Deteksi Gas, Metode Deteksi Gas Atmosfir; Gas 3 = Evaluasi Online, Evaluasi Praktek. Ada `sesi` per jam; kolom Aplikasi dikosongkan. Tombol "Isi dari rundown" (`RD_FILL.tdg`) hanya mengisi materi; narasumber dikosongkan (diisi lewat pilihan nama). Katalog sama di `pic/js/app.js` (tanpa `sesi`); `pic/js/wrd.js` dibuat ulang.
- APP_VER v52, sw.js VERSION pic-v52.

## Panel admin: kegiatan Selesai & pop up progres (index.html, tanpa ubah APK)
- Di ruangk3.com > Daftar Hadir & Dokumentasi > Rekap: tabel kini punya tab **Berjalan | Selesai**. Selesai = salah satu akun PIC sudah menekan "Selesai" di APK (`dh_hasil/{id}/{uid}.selesai`, dibaca dengan `dhMuatHasil`).
- Klik baris kegiatan (atau tombol **Progres**) membuka pop up progres: persen + rincian tiap bagian, sama dengan layar Pratinjau Laporan di APK, memakai isian semua akun PIC (`dh_kegiatan/{id}` + `dh_hasil/{id}`).
- Hitungannya = `pic/js/prog.js`, DIBUAT OTOMATIS dari `lapCek` di `pic/js/app.js` oleh `node pic/tools/build-prog.js`. Jalankan ulang setiap kali `lapCek` atau fungsi yang dipakainya di app.js berubah.

## v54 – Daftar nama link absen selfie selalu sama dengan daftar peserta di web
- Penyebab: halaman `selfie/` membaca daftar nama (`dh_selfie/{kid}`) hanya satu kali saat dibuka. Nama tambahan (mis. dari upload Excel/PDF) yang masuk sesudahnya baru tampil setelah halaman dimuat ulang manual.
- `selfie/index.html`: daftar nama + status dibaca ulang otomatis tiap 30 detik, saat tab kembali dibuka, dan saat pergantian hari/sesi. Tampilan hanya digambar ulang bila ada perubahan; tidak mengganggu peserta yang sedang mengetik pencarian, memilih nama, atau memotret. Gagal baca = pakai daftar terakhir.
- `daftar-hadir/index.html` (`Pic.flush`): daftar nama selfie diterbitkan lebih dulu (ringan), tidak menunggu unggah gambar; satu kegiatan yang gagal tidak menghentikan kegiatan lain.
- `masukkanPeserta`: pada pilihan "GANTI seluruh daftar", id peserta lama (dan data selfie yang sudah masuk) dipertahankan untuk nama yang sama, supaya selfie lama tetap cocok.

## v55 – Peserta tidak hilang bila kegiatan Pesawat Angkat hanya punya satu alat
- Gejala: nama peserta lama "hilang" di APK, hanya nama yang diinput manual yang tampil di alat (mis. Conveyor).
- Penyebab: di kegiatan Pesawat Angkat, peserta dipisah per alat (`peserta.kelas`). Peserta yang alatnya belum dipilih / tidak cocok masuk kartu "Tanpa kelas", sehingga tidak tampil di daftar alat Conveyor. Nama yang dipilihkan alatnya manual di web masuk ke Conveyor.
- Perbaikan: bila kegiatan PAPA hanya punya SATU alat (bukan B3), semua peserta otomatis ikut alat itu: web (`kelasTunggal` saat data dibuka, saat diubah, baris baru default alat itu, data ke APK `Pic.node`), APK (`applyKegs`) dan pop up progres di panel admin. Bila alat lebih dari satu, kartu "Tanpa kelas" tetap ada, kini dengan petunjuk memilih alat di website.

## v56 – Pulihkan peserta yang hilang + upload tidak lagi menghapus nama lama
- Penyebab nama hilang: saat upload Excel/PDF yang namanya sebagian sudah ada, web menawarkan "GANTI seluruh daftar". Pilihan itu (OK) menghapus semua nama lama yang tidak ada di file, dan peserta yang baru punya selfie dianggap "bersih" sehingga ikut terhapus (berkas selfie mereka tetap ada di Drive).
- Sekarang: OK = hanya menambah nama yang belum ada (aman). Mengganti seluruh daftar butuh konfirmasi kedua yang menyebut nama yang akan dihapus, ada tombol Batalkan, dan tidak ditawarkan bila ada peserta dengan selfie/nilai/TTD/foto.
- Tombol baru "♻️ Pulihkan peserta dari Drive" (tab Kegiatan & Peserta): membaca data kegiatan + peta berkas di Google Drive, mencari peserta yang berkasnya (foto/TTD/selfie) ada di Drive tetapi tidak ada di daftar, lalu mengembalikan nama (id sama, jadi selfie di server cocok lagi) beserta foto/TTD/selfie. Perusahaan hanya terisi bila tercatat di data.json Drive.

## v57 – Pemulihan peserta dari Drive jadi OTOMATIS (tombol dihapus)
- Web Daftar Hadir mencocokkan daftar peserta tiap kegiatan dengan Google Drive (data.json + peta berkas `_files.json`). Peserta yang berkasnya (foto/TTD/selfie) ada di Drive tetapi tidak ada di daftar dikembalikan sendiri (id sama), lengkap dengan foto/TTD/selfie, lalu otomatis terkirim ke APK dan link selfie.
- Kegiatan yang sedang dibuka dicek segera (lalu tiap 20 menit); kegiatan lain 30 hari terakhir dicek bergantian di latar belakang (paling sering 3 jam sekali). Perlu Drive terhubung + internet.
- Peserta yang sengaja dihapus (tombol 🗑 atau "ganti daftar") dicatat di `ev.hapus` dan tidak dihidupkan lagi; peserta dengan nama yang sudah ada di daftar tidak digandakan.

## v58 – Singkatan perusahaan (Database Tenant) dilengkapi otomatis
- Penyebab singkatan tidak berubah: (1) singkatan yang sama dipakai dua perusahaan di Database Tenant dianggap ambigu dan dibiarkan; (2) pelengkapan hanya jalan saat kolom Perusahaan selesai diketik atau tombol ditekan.
- Sekarang: singkatan berstatus "Terkonfirmasi" menang atas "Perlu dicek"; nama lengkap menang atas singkatan; kolom Singkatan boleh berisi beberapa singkatan dipisah koma / titik koma / "/". Bila masih sama kuat, tidak ditebak dan web memberi tahu singkatan mana yang harus dipilih manual.
- Web melengkapi otomatis (tiap 15 detik & setelah Database Tenant dimuat) peserta kegiatan yang sedang dibuka, dengan tombol Batalkan; tidak mengganggu saat mengetik.
- Code.gs `tenants_` kini mengirim status singkatan (`k`). Tanpa deploy ulang Code.gs, perilaku lama berlaku untuk urutan prioritas status (nama & alias tetap bekerja).

## v59 – Pembukaan kegiatan lebih tahan gangguan + pemulihan aman antar tab
- Membuka kegiatan (klik di daftar) kini menampilkan pesan bila gagal (sebelumnya diam saja), tidak menunggu tanpa batas, dan membuang baris peserta rusak. Kesalahan JavaScript tak terduga juga ditampilkan sebagai pesan "Terjadi kesalahan: …".
- Pemulihan otomatis dari Drive membaca ulang data terbaru tepat sebelum menulis (tidak menimpa perubahan dari tab lain, mis. tab Daftar Hadir + bingkai di panel admin).


## v60 — Input Kegiatan: kegiatan lama bisa dibuka & pesan galat pasti terlihat
- Pesan (toast) di dalam halaman admin sekarang tampil di **atas** layar (sebelumnya di bawah iframe sehingga bisa tidak kelihatan).
- Klik kegiatan lama: langsung muncul "Membuka kegiatan…" dan status di bar atas; kalau gagal, alasannya ditampilkan.
- Kegiatan yang tercatat di daftar tetapi isinya tidak ada di perangkat: diunduh otomatis dari Google Drive (bila terhubung).
- Daftar dropdown tidak ditulis ulang bila isinya sama (tombol yang sedang diklik tidak diganti di tengah klik).
- Klik kegiatan yang sudah terisi di memori saat layar awal masih tampil: layar awal ditutup.

## v61 — Input Kegiatan: membuka kegiatan saat penyimpanan browser sibuk
- Penyebab "tidak bisa dibuka": penyimpanan browser (IndexedDB) sedang sibuk menulis data besar dari sinkron Drive/PIC di latar belakang, sehingga membaca kegiatan menunggu >10 detik dan sebelumnya langsung menyerah.
- Sekarang aplikasi menunggu sampai 2,5 menit dengan status "Menunggu penyimpanan… N dtk" dan menyebut pekerjaan yang sedang sibuk.
- Selama kegiatan dibuka, pekerjaan latar (samakan Drive, sinkron berkala, kirim PIC, pemulihan Drive, lengkapi tenant) berhenti sementara.
- Klik ganda saat sedang membuka diabaikan dengan pesan.

## v62 — Kalender Kegiatan: ekspor ke Kalender Mac / iCloud (.ics)
- Tombol "📅 Tambah ke Kalender Mac / iCloud" di Panel Admin → Kalender Kegiatan.
- Menghasilkan file RuangK3-Kegiatan.ics (acara sehari penuh per tanggal; isi sama dengan yang tampil di panel sesuai peran).
- UID tetap per kegiatan+tanggal, jadi impor ulang ke kalender yang sama memperbarui acara (tidak menggandakan).

## v63 — Kalender Kegiatan: langganan otomatis ke Kalender Mac / iCloud
- Tombol "🔄 Langganan Otomatis (iCloud)" di Kalender Kegiatan (khusus Admin Utama): jadwal dikirim ke Apps Script (aksi `agendaSimpan`, disimpan sebagai file di folder Drive) dan disajikan lewat alamat rahasia `?agenda=TOKEN` (Code.gs versi 9). Kalender Mac berlangganan alamat itu dan menyegarkan tiap jam.
- Setelah langganan diaktifkan, setiap data kegiatan berubah (Panel Admin terbuka) jadwal dikirim ulang otomatis bila isinya berubah. Jadwal kosong tidak pernah dikirim otomatis.
- Code.gs tidak disimpan di repo ini; tempel manual di Apps Script lalu Deploy → Kelola deployment → Versi baru.
- Tombol ekspor .ics manual tetap ada sebagai cadangan.

## v64 — Tugas baru: tombol WhatsApp satu klik
- Penyebab WA tidak terkirim: `sendWA_Fonnte` hanya kerangka (console.log); Fonnte sudah tidak dipakai (webhook pindah ke Telegram).
- Setelah Admin Utama menyimpan kegiatan baru untuk sebuah tim, muncul kartu "Kirim WhatsApp" (wa.me, nomor tim & pesan terisi). Nomor 08…/+62…/8… dinormalkan ke 62…; tim tanpa nomor mendapat peringatan.

## v65 — Input Kegiatan Baru: tombol tidak lagi menggantung "Menyimpan…"
- Penulisan ke Firebase (kegiatan baru / ubah) kini diberi batas 10 detik (`window.tungguTulis`). Bila server belum membalas, tombol berubah "Tersimpan (menunggu server)" dan muncul peringatan; hasil akhirnya (berhasil / gagal) dilaporkan lewat pesan. Peringatan tampil 10 detik.

## v66 — Input Kegiatan Baru (jadwal): tidak hilang saat koneksi lambat
- Penyebab jadwal "kadang hilang": penulisan ke Firebase hanya ada di memori halaman sampai server membalas; bila koneksi lambat lalu halaman ditutup/dimuat ulang, jadwal tidak pernah sampai.
- Sekarang tiap simpan/ubah jadwal masuk "kotak keluar" di perangkat (localStorage `rk3_kegiatan_outbox`), memakai kunci tetap (dibuat dulu lewat `push().key` + `set`), dan dikirim ulang otomatis saat Panel Admin dibuka lagi sampai server membalas (tidak bisa dobel). Penolakan izin server tidak dikirim ulang terus.

## v67 — Draft Pengeluaran Telegram: tombol "Simpan ke Pengeluaran" memberi tanda & tidak dobel; pita status koneksi
- Tombol langsung berubah "Menyimpan…" (dinonaktifkan), kolom kosong ditandai merah, simpan memakai kunci tetap `wa_<id>` (klik berulang tidak membuat pengeluaran dobel), dan memakai batas 10 detik (`tungguTulis`) seperti Input Kegiatan.
- Pita kuning "Belum terhubung ke server RuangK3" muncul bila Firebase terputus >6 detik (`.info/connected`), supaya jelas kenapa tombol simpan menunggu.

## v68 — Huruf A/B untuk kegiatan PAPA & Damkar yang berjalan bersamaan
- Sebelumnya huruf pembeda (A, B, C…) hanya muncul bila nama & tanggal kegiatan sama (praktis hanya B3). Kini kegiatan **Damkar** dan **PAPA (Pesawat Angkat/Angkut)** sejenis yang berjalan bersamaan (ada hari yang sama, nama boleh berbeda, mis. Operator Conveyor & Operator Crane) juga diberi huruf, urutan mengikuti urutan di Drive. B3 tidak berubah.
- Huruf tampil di APK (node `sfx`), daftar Kegiatan Tersimpan / tombol cepat, dan Rekap Kegiatan di Panel Admin (`dhSufiks`). Hanya tampilan: nama kegiatan di laporan/Word tidak berubah. Kegiatan yang hurufnya berubah otomatis dikirim ulang ke APK.

## v55 (APK) — Nama PIC pada lencana status kegiatan
- Di daftar kegiatan APK, lencana status ("Berjalan", "Lengkap", …) kini diikuti nama PIC yang diisi admin di web (kolom Nama pada TTD Penyelenggara / `namaTtd`), mis. "Berjalan · Rachmad Rafli A.D". Kosong = tampil seperti sebelumnya. Lencana boleh turun ke dua baris bila namanya panjang.
- APP_VER v55, service worker `pic-v55`, `prog.js` dibangun ulang.

## v56 (APK) — Status kegiatan mengikuti Pratinjau Laporan
- Lencana di daftar kegiatan sekarang dihitung dari Pratinjau Laporan (`lapCek`), bukan hanya TTD/foto/TTD PIC:
  - **Lengkap**: semua bagian laporan lengkap (100%).
  - **Belum mulai**: hari ini sebelum hari pertama kegiatan.
  - **Sedang berjalan**: hari ini di antara hari pertama & terakhir kegiatan (laporan belum lengkap).
  - **Belum lengkap** (merah): kegiatan sudah lewat tetapi laporan belum lengkap.
- Hasil cek di-cache selama data tidak berubah (`lapSemua`). APP_VER v56, service worker `pic-v56`, `prog.js` dibangun ulang.

## v57 (APK) + v69 (web) — Download laporan, Nilai Evaluasi Teori, label remedial, urutan Rekap
- **Download Laporan (APK)**: di layar kegiatan ada kartu *Download Laporan* dengan 2 tombol: *Download Seluruh Laporan (ZIP)* (semua berkas Word yang aktif: rundown, daftar hadir, selfie, nilai, narasumber, dok. harian, dok. peserta, lulus/tidak lulus; PAPA/B3 = satu subfolder per alat/program) dan *Download Daftar Nilai Peserta* (Daftar Nilai + Lulus/Tidak Lulus). Tombol baru aktif bila **Pratinjau Laporan 100% lengkap DAN kegiatan sudah ditekan Selesai**; bila belum, tombol abu-abu + keterangan. Setelah menekan Selesai pada laporan lengkap, layar tetap di kegiatan (tidak langsung ke daftar) supaya PIC bisa langsung download. Berkas Word dibuat di HP memakai kode Word website yang sama (`Word` di `pic/js/wrd.js`, dihasilkan `tools/build-wrd.js`); gambar dari website/PIC lain harus sudah termuat (bukan tanda ✔), jika belum muncul pesan "gambar belum termuat".
- **Nilai Evaluasi Teori**: opsi baru per kegiatan di tab Laporan website (*Tambah kolom Nilai Evaluasi Teori*, `lap.evalT`). Tiap peserta: ketik nilai manual ATAU ketuk **Lulus / Tidak lulus** (isi `p.et` = angka / "LULUS" / "TIDAK LULUS"). Tampil sebagai kolom ke-6 di Daftar Nilai (halaman pratinjau & Word) dan di layar *Nilai & Kelulusan* APK (field `nilai[pid].et`, ikut sinkron seperti ut/up). Bila opsi aktif, kolom ini ikut dihitung di kelengkapan APK.
- **"DI BATCH SEBELUMNYA"**: peserta Remedial di Dokumentasi Peserta (halaman web, Word, layar APK, pratinjau Word APK) diberi tulisan itu pada kotak foto; foto peserta remedial tidak lagi wajib (APK & web menganggap lengkap).
- **Urutan Rekap**: Rekap Kegiatan (admin) dan daftar Kegiatan Tersimpan (Daftar Hadir) diurutkan menurut **waktu pembuatan** (dari `created` / id kegiatan), bukan yang terakhir dibuka/diubah. Id lama tanpa waktu memakai tanggal kegiatan.
- APP_VER v57, service worker `pic-v57`, `wrd.js` & `prog.js` dibangun ulang.

## v58 (APK) + web — Download laporan jadi PDF, urutan menurut tanggal mulai
- **Download Laporan (APK) kini PDF, satu berkas** (bukan ZIP/Word): *Download Laporan (PDF)* = seluruh laporan (rundown, daftar hadir, selfie, nilai, narasumber, dok. harian, dok. peserta, lulus/tidak lulus; PAPA/B3 berurutan per alat/program) dan *Download Daftar Nilai (PDF)* = Daftar Nilai + Lulus/Tidak Lulus. Aktif hanya bila laporan lengkap & kegiatan sudah ditekan Selesai. Halaman A4 sama dengan Pratinjau Word (HTML -> gambar JPEG per halaman -> PDF, dibuat di HP, tanpa pustaka luar; teks di PDF berupa gambar).
- **Urutan**: Rekap Kegiatan (admin), daftar Kegiatan Tersimpan (Daftar Hadir) dan daftar kegiatan APK diurutkan menurut **tanggal mulai kegiatan** (terbaru di atas); tidak lagi memakai id/waktu dibuka. Untuk membalik (terlama di atas) ubah arah `localeCompare` di `dhRapikan` (root index.html), `Ev.render` (daftar-hadir) dan `.sort` daftar APK (`awal(b).localeCompare(awal(a))`).
- APP_VER v58, service worker `pic-v58`.

## v59 (APK)
- *Download Daftar Nilai (PDF)* kini HANYA berisi halaman Daftar Nilai (tanpa halaman Lulus/Tidak Lulus). APP_VER v59, service worker `pic-v59`.

## Perbaikan kolom Foto di Rekap
- Kolom Foto "11/11" otomatis diubah Google Sheets jadi tanggal (tampil 2026-11-10T16:00:00.000Z). Rekap kini mengembalikannya ke pecahan (`dhFrac`); Apps Script (Code.gs) menulis kolom Foto/TTD Peserta sebagai teks dan membaca kembali tanggal salah itu (`frac_`).

## v60 (APK)
- *Download Daftar Nilai (PDF)* aktif kapan saja (tidak perlu laporan lengkap / Selesai), selama kegiatan memakai Daftar Nilai. *Download Laporan (PDF)* tetap hanya saat laporan lengkap & Selesai. APP_VER v60, sw `pic-v60`.

## v61 — layar tidak lagi menggulir sendiri + label "Lengkap" di Rekap
- APK: layar Absensi kembali ke posisi gulir semula setelah data dari server masuk (sebelumnya melompat ke atas karena isi daftar disusun SETELAH posisi dikembalikan). Pembaruan latar belakang juga ditunda selama jari masih menggulir.
- Website (Rekap Kegiatan): label hijau "Lengkap" dan filter Lengkap/Belum kini memakai hitungan yang sama dengan Pratinjau Laporan di APK (semua bagian 100%), bukan hanya kolom Foto/TTD di Drive.

## v62 — materi Ahli K3 Muda Lingkungan Kerja + TTD "Online" untuk Kemnaker
- Katalog materi baru (7 hari sesuai rundown, tanpa nama pemateri): "Ahli K3 Muda LK 1…7". Di website tersedia tombol "Isi dari rundown Ahli K3 Muda Lingkungan Kerja" (tab Laporan); narasumber dibiarkan kosong untuk diisi sendiri.
- Narasumber yang diisi Kemnaker (pilihan "Kemnaker – RI" atau tulisan Kemnaker di nama/instansi): kolom Tanda Tangan otomatis tertulis "Online" di pratinjau web, Word, dan APK; tidak perlu tanda tangan dan dihitung lengkap di progres laporan.

## v63 — semua materi terbuka untuk narasumber mana pun
- Pilihan Materi di Absensi Narasumber (website & APK) tidak lagi dibatasi per narasumber: semua materi bisa dipilih.

## v64 — nama materi Ahli K3 Muda LK dibuat jelas per hari
- Judul materi menjadi "Ahli K3 Muda LK Hari 1 – … Hari 7 – …" supaya mudah dicari di pilihan Materi.

## v65 — daftar narasumber bisa diedit/dihapus, materi terbuka kecuali Wasnaker
- Instansi nama narasumber yang sudah ada kini bisa diubah (website & APK); di website perubahan tersimpan untuk nama itu.
- Pilihan materi menampilkan semua materi untuk narasumber mana pun; narasumber ber-instansi Wasnaker hanya melihat materi Wasnaker + materi umum.
- Website: tombol "Hapus nama dari daftar pilihan" untuk nama tersimpan maupun bawaan (bisa dipulihkan lewat tombol Pulihkan).
- Judul kolom rundown "NARSUM" menjadi "NARASUMBER" (pratinjau & Word).

## v66 — Nilai Evaluasi Teori selalu ada
- Kolom "Nilai Evaluasi Teori" (angka manual atau Lulus / Tidak Lulus) kini otomatis ada di Daftar Nilai, website maupun APK; pilihan centang di tab Laporan dihapus.
- Deploy ulang (picu build Pages dari branch main).

## v67 — Kolom Nilai Evaluasi Teori dihapus
- Daftar Nilai kembali ke kolom NO, NAMA, INSTANSI, NILAI UJIAN TEORI, NILAI UJIAN PRAKTEK. Nilai Evaluasi Teori = Nilai Ujian Teori, jadi tidak ada kolom tambahan lagi (website, APK, Word, dan hitungan progres).

## v68 — Nilai Ujian Teori: tombol Lulus / Tidak lulus + angka manual
- Di kolom Nilai Ujian Teori (APK dan website) ada tombol Lulus dan Tidak lulus di bawah kotak nilai; angka tetap bisa diketik manual. Ketuk tombol yang sama lagi untuk mengosongkan.

## v69 — Foto dari APK lebih tahan sinyal lemah
- Gambar dikirim 2 sekaligus (sebelumnya 4), dan satu gambar yang gagal tidak lagi menghentikan gambar lain (berhenti bila 3 kali gagal).
- `putMedia`: kiriman yang kena batas waktu tidak diulang dari nol; percobaan berikutnya memakai kiriman yang sama, dan batas waktu mengikuti ukuran gambar (90–300 detik). Mencegah antrean kiriman menumpuk dan saling memperlambat.
- Pesan "belum terkirim" kini memuat sebab singkat; mengetuk tulisan merah menampilkan kendala sebelumnya.
