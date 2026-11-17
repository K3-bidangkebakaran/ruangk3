# Penilaian Praktik (ruangk3.com/penilaian/)

Dashboard penilaian praktik & kuis training K3 Penanggulangan Kebakaran: batch, Kelas D / C (praktik) dan
Kelas B / A (laporan PKL Rencana Tanggap Darurat), aspek berbobot per kelas (+ Kehadiran & Keaktifan di semua kelas), nilai akhir 70% praktik + 30% kuis,
predikat, status LULUS/REMEDIAL, PDF rekap & lembar per peserta (jsPDF di `vendor/`, dimuat saat dibutuhkan).

## Akses & data
- Penilai masuk dengan **kode akses** bersama (min. 8 karakter, tidak peka huruf besar/kecil).
  Kunci data = SHA-256(`"rk3-praktik|" + kode.toLowerCase()`), jadi kode tidak pernah disimpan di server.
- Firebase: login anonim, data di `artifacts/k3-kebakaran-app-v5/public/data/praktik_nilai/<kunci>/`:
  - `pengaturan/utama` — rubrik (aspek per kelas, bobot, skala, pedoman), `bobotPraktik`, `bobotKuis`
  - `batch/<id>` — `{nama, kegiatan, tanggal, lokasi, pjk3, penilai, dibuat, _t}`
  - `peserta/<id>` — `{nama, kelas: "D"|"C", batch, no, nilai: {<kodeAspek>: "BS"|"B"|"C"|"K"|""}, kuis, catatan, _t}`
- Offline-first: salinan di localStorage (`rk3-pn-cache-<kunci>`), perubahan yang belum terkirim di
  `rk3-pn-antre-<kunci>` dan dikirim ulang saat online. Perangkat tetap masuk (`rk3-pn-kunci`) sampai tombol Keluar.
- Rubrik baru untuk ruang penilaian baru diambil dari salinan bawaan di `index.html` (`DEF_CFG`). Ruang lama yang
  belum punya kelas baru di `DEF_CFG` ditambah otomatis saat dibuka (`migrasiRubrik`, hanya menambah).

## Aturan Firebase (WAJIB dipasang Adrian)
Tambahkan di Firebase Console → Realtime Database → Rules, di dalam
`artifacts → k3-kebakaran-app-v5 → public → data` (gabungkan, jangan menimpa aturan lain).
Tidak ada `.read` di tingkat `praktik_nilai`, jadi daftar ruang penilaian tidak bisa dibaca; hanya yang tahu kodenya
yang bisa membuka ruangnya.

```json
"praktik_nilai": {
  "$kunci": {
    ".read": "auth != null && $kunci.length === 64",
    ".write": "auth != null && $kunci.length === 64"
  }
}
```

## Mengubah halaman
`index.html` disusun dari dashboard yang sama dengan versi artifact/offline. Bila mengubah berkas di folder ini,
naikkan `VERSION` di `sw.js`.
