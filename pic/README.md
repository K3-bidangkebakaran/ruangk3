# Portal PIC (ruangk3.com/pic/)

Aplikasi lapangan untuk PIC kegiatan LPMI: **absensi TTD peserta** (dengan kolom **Batal**), **TTD PIC**, dan
**dokumentasi foto peserta**. Bisa dipakai tanpa sinyal; begitu ada sinyal hasilnya terkirim otomatis ke website
ruangk3.com dan disimpan ke Google Drive. Admin utama tinggal mencetak.

## Alur

```
Admin utama (panel ruangk3.com → Daftar Hadir → tab "Portal PIC")
  1. buat akun PIC                       → dh_pic/{uid}
  2. input kegiatan: nama, tanggal, tempat, PIC, peserta → dh_kegiatan/{kid}
        │
        ▼  (HP PIC mendapat sinyal)
HP PIC  (ruangk3.com/pic/ atau APK "Portal PIC", offline-first, IndexedDB "portal-pic")
  - hanya melihat kegiatan miliknya: Absensi TTD Peserta · TTD PIC · Dokumentasi Peserta
  - kolom Batal: peserta yang batal ikut → namanya dicoret sampai kolom TTD di daftar hadir
  - hasil dikirim otomatis saat ada sinyal → dh_media/{kid}/*, lalu dh_hasil/{kid}
        │
        ▼
Panel admin (tab Portal PIC)
  - menarik hasil, menampilkan pratinjau yang sama persis dengan cetakan
  - Cetak/PDF, Unduh Word, dan otomatis menyimpan Word + foto + TTD ke Google Drive
    (lewat aplikasi Daftar Hadir mode jembatan `/daftar-hadir/?bridge=1`, jalur Drive yang sama)
```

## Data di Realtime Database (`artifacts/k3-kebakaran-app-v5/public/data`)

| Node | Isi |
|---|---|
| `dh_pic/{uid}` | profil PIC `{nama, user, hp, aktif, dibuat}` (uid = Firebase Auth email/kata sandi) |
| `dh_kegiatan/{kid}` | `{nama, tgl[], tempat, kota, jamMulai, jamSelesai, picUid, picNama, peserta[{id,nama,instansi}], upd}` |
| `dh_hasil/{kid}` | ringkasan kerja PIC (tanda saja): `{batal{pid:true}, hadir{pid:{tanggal:1}}, foto{pid:1}, ttdPic, ttdPicNama, upd, rev, picUid}` |
| `dh_media/{kid}/{kunci}` | gambar (dataURL): `s_<pid>_<tanggal>` TTD peserta, `f_<pid>` foto, `pic` TTD PIC |

Hasil dikirim **gambar dulu, ringkasan terakhir**, jadi admin tidak pernah melihat tanda tanpa gambarnya.

## WAJIB: pasang aturan Firebase

Tanpa ini panel admin menampilkan "Aturan Firebase belum dipasang" dan PIC tidak bisa mengirim.
Firebase Console → Realtime Database → **Rules**. Tambahkan blok berikut di dalam node
`artifacts → k3-kebakaran-app-v5 → public → data` (gabungkan dengan aturan yang sudah ada, jangan menimpa):

```json
"dh_pic": {
  ".read": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  ".write": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  "$uid": { ".read": "auth != null && auth.uid == $uid" }
},
"dh_kegiatan": {
  ".indexOn": ["picUid"],
  ".read": "auth != null && (auth.token.firebase.sign_in_provider == 'anonymous' || (query.orderByChild == 'picUid' && query.equalTo == auth.uid && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid + '/aktif').val() != false && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid).exists()))",
  ".write": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'"
},
"dh_hasil": {
  ".read": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  ".write": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  "$kid": {
    ".read": "auth != null && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_kegiatan/' + $kid + '/picUid').val() == auth.uid",
    ".write": "auth != null && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_kegiatan/' + $kid + '/picUid').val() == auth.uid && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid + '/aktif').val() != false"
  }
},
"dh_media": {
  ".read": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  ".write": "auth != null && auth.token.firebase.sign_in_provider == 'anonymous'",
  "$kid": {
    ".read": "auth != null && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_kegiatan/' + $kid + '/picUid').val() == auth.uid",
    ".write": "auth != null && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_kegiatan/' + $kid + '/picUid').val() == auth.uid && root.child('artifacts/k3-kebakaran-app-v5/public/data/dh_pic/' + auth.uid + '/aktif').val() != false"
  }
}
```

Catatan keamanan: sesi admin di ruangk3.com memakai login anonim Firebase (PIN admin diperiksa di sisi browser), jadi
aturan tidak bisa membedakan admin dari pengunjung anonim lain. Foto/TTD peserta memakai node terpisah dan tidak bisa
dibaca PIC lain, tetapi pengamanan penuh baru tercapai bila admin nanti dipindah ke login Firebase sungguhan.

Juga pastikan **Authentication → Sign-in method → Email/Password** aktif (sudah dipakai Riksa Uji).

## Akun PIC

- Dibuat di panel admin → Daftar Hadir → **Portal PIC → Akun PIC**: nama, email (atau username tanpa @, otomatis
  `username@pic.ruangk3.com`), kata sandi awal (min. 6 karakter).
- PIC masuk sekali saat ada sinyal; sesi tersimpan sehingga aplikasi bisa dipakai offline.
- PIC bisa mengganti kata sandi sendiri di aplikasi. Reset lewat email hanya untuk akun berEmail asli.
- Akun dinonaktifkan → tidak bisa mengirim dan otomatis keluar dari aplikasi begitu HP mendapat sinyal.

## Berkas

| Berkas | Isi |
|---|---|
| `index.html`, `js/app.js` | aplikasi PIC (offline-first, antrean kirim, tanda tangan, foto ber-watermark) |
| `js/firebase.js` | login PIC & akses data (app Firebase terpisah `portal-pic`) |
| `admin.html` | halaman admin (tab "Portal PIC" di menu Daftar Hadir): akun, kegiatan, hasil, cetak, Word, Drive |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA, bisa di-install dan dibuka tanpa sinyal |

**Setiap mengubah berkas di folder ini, naikkan `VERSION` di `sw.js`** (mis. `pic-v2`).

## Pasang di HP / buat APK

1. Buka `https://ruangk3.com/pic/` di Chrome HP → ⋮ → **Install aplikasi**.
2. APK "Portal PIC": masukkan `https://ruangk3.com/pic/` ke pwabuilder.com → Android (Google Play / Signing key baru,
   Package ID mis. `com.ruangk3.pic`), lalu gabungkan entri baru ke `/.well-known/assetlinks.json` (jangan menimpa
   entri `com.ruangk3.twa` yang sudah ada). Simpan keystore di tempat aman, jangan di repo.

## Kapasitas

Foto ±100–250 KB (maks 1280 px), TTD ±10–20 KB. Satu kegiatan 30 peserta × 2 hari ≈ 8–10 MB di Realtime Database
(paket gratis 1 GB). Kegiatan lama dapat dihapus dari panel admin (hasil di Google Drive tidak ikut terhapus bila
dihapus langsung dari Drive; menghapus dari panel ikut menghapus folder Drive).
