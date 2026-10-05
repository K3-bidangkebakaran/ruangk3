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
dengan watermark yang sama. Untuk APK (PWABuilder) aktifkan **Location delegation** agar GPS berfungsi di dalam aplikasi.

## Kapasitas

Foto ±100–250 KB (maks 1280 px), TTD ±10–20 KB. Satu kegiatan 30 peserta × 2 hari ≈ 8–10 MB di Realtime Database
(paket gratis 1 GB). Kegiatan lama dapat dihapus dari tab Input Kegiatan (ikut membersihkan Firebase dan, bila terhubung, folder Drive-nya).
