# Aplikasi Riksa Uji Kebakaran (ruangk3.com/riksa/)

Aplikasi lapangan untuk petugas riksa uji **APAR** (PER.04/MEN/1980) dan **instalasi hidran**
(INS.11/M/BW/1997 butir IV.8). Satu berkas = satu perusahaan, berisi laporan APAR dan/atau hidran.
Hasilnya file Word sesuai format laporan PJK3.

## Alur data

```
HP petugas (offline-first)                    Firebase proyek ruangk3                 Panel admin ruangk3.com
IndexedDB "riksa-uji-apar"   --Kirim-->   artifacts/k3-kebakaran-app-v5/public/data   --> menu "Laporan Riksa Uji"
 - berkas, foto, antrean                   riksa_laporan/{id}        ringkasan              (unduh Word, hapus)
 - bisa dipakai tanpa sinyal               riksa_laporan_data/{id}   isi lengkap (JSON)  --> menu "Petugas Riksa Uji"
                                           riksa_foto/{id}/{fotoId}  foto (dataURL)          (buat akun, nonaktifkan,
                                           riksa_petugas/{uid}       profil petugas           reset password, aktivitas)
                                           riksa_log/{pushId}        jejak aktivitas
```

- `{id}` laporan = `<idBerkas>-apar` atau `<idBerkas>-hyd`. Kirim ulang menimpa laporan yang sama (revisi +1).
- Tanpa sinyal, tombol **Kirim** memasukkan laporan ke antrean. Antrean terkirim otomatis saat sinyal
  kembali, saat aplikasi dibuka, dan setiap 5 menit.
- Foto yang sudah terkirim dicatat per laporan, jadi tidak dikirim ulang.

## Akun petugas

- Dibuat Admin Pusat di panel admin ruangk3.com → **Petugas Riksa Uji** (Firebase Auth email/password).
- Petugas masuk sekali saat ada sinyal; sesi tersimpan, aplikasi bisa dipakai offline sesudahnya.
- Akun yang dinonaktifkan tidak bisa masuk atau mengirim laporan.
- Aplikasi memakai nama app Firebase terpisah (`riksa-uji`) supaya sesinya tidak bercampur dengan
  sesi peserta/admin di halaman utama (satu origin).

## Berkas

| Berkas | Isi |
|---|---|
| `index.html` | Tampilan aplikasi |
| `js/app.js` | Logika aplikasi (berkas, editor, foto, unduh Word, antrean kirim) |
| `js/firebase.js` | Login petugas & pengiriman ke Firebase (modul ES) |
| `js/panduan.js` | Teks petunjuk cara mengisi/memeriksa/menghitung tiap kolom & butir (tombol "Petunjuk" di editor) |
| `js/report.js` | Generator Word laporan APAR (dipakai juga oleh panel admin) |
| `js/hydrant-report.js` | Generator Word laporan hidran (dipakai juga oleh panel admin) |
| `vendor/docx.iife.js` | Pustaka `docx` 9.7.1 (disimpan lokal supaya Word bisa dibuat offline) |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA: bisa di-install & dibuka tanpa sinyal |

**Setiap mengubah berkas di folder ini, naikkan `VERSION` di `sw.js`** (mis. `riksa-v2`) supaya HP
petugas mengambil versi baru.

## Pasang di HP Android (tanpa Play Store)

1. Buka `https://ruangk3.com/riksa/` di Chrome.
2. Menu ⋮ → **Install aplikasi** / **Tambahkan ke layar utama**.

Untuk file APK: masukkan URL di atas ke pwabuilder.com → Android, lalu taruh `assetlinks.json` hasilnya
di `/.well-known/assetlinks.json` repo ini.

## Kapasitas

Foto disimpan di Realtime Database (paket gratis: 1 GB). Satu foto ±100–200 KB, jadi ±5.000–10.000
foto. Pantau pemakaian di Firebase Console → Realtime Database → Usage. Bila mendekati batas, foto
lama bisa dipindah ke Google Drive (skrip cadangan di `backup-drive` sudah ikut menyalin `riksa_foto`).
