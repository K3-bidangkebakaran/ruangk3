# Catatan bersama untuk semua sesi Claude di proyek ruangk3.com

Dibaca otomatis oleh sesi Claude mana pun yang bekerja di folder ini. Pemilik: Adrian (bahasa Indonesia).
Tujuan: beberapa sesi mengerjakan fitur berbeda, tapi hasilnya harus menyatu dan tetap ringan di sinyal lemah.

## Peta proyek
- `index.html` (satu berkas, GitHub Pages) = situs utama + panel admin. `tailwind.css` = hasil build (lihat README).
- `daftar-hadir/` = aplikasi Daftar Hadir & Dokumentasi (satu berkas, IndexedDB + Google Drive via Apps Script `daftar-hadir/apps-script/Code.gs`, TANPA Firebase). Menu di panel admin (khusus Admin Pusat); halaman mengalihkan ke `/` bila penanda `rk3_admin_at` (localStorage, 12 jam) tidak ada. Pengaman data sebenarnya = Kode Akses Apps Script.
- `riksa/` = aplikasi PWA petugas riksa uji (offline-first), memakai Firebase yang sama, nama app `riksa-uji`.
- `../ruangk3-wa-webhook/` (Vercel): `api/cek-lisensi.js` (perantara TemanK3 + cek hak LPMI), webhook WA.
- `../backup-drive/backup-ruangk3-ke-drive.gs` = skrip cadangan harian ke Google Drive (dipasang manual di Apps Script).
- Data: Firebase RTDB `artifacts/k3-kebakaran-app-v5/public/data/<node>`.

## Aturan wajib setiap menambah/ubah fitur (jaringan lemah)
1. Data berat (PDF, foto, base64 > 20 KB) JANGAN di node daftar utama. Pisahkan ke node anak per item dan muat hanya saat dibuka (pola `modul_dokumen`, `berita_foto`, `riksa_foto`).
2. Listener `onValue` ke node besar hanya dipasang saat menu dibuka, bukan saat halaman dimuat. Pengunjung publik tidak boleh mengunduh daftar peserta (pakai `statistik_publik`).
3. Semua `get`/`set`/`fetch` pakai `window.withTimeout(...)` dan tampilkan pesan gagal yang ramah.
4. Skrip/CSS pihak ketiga: jangan blocking di `<head>`. Pustaka besar (html2pdf, Chart.js, PDF.js) dimuat sesuai kebutuhan lewat `await window.muatPustaka('html2pdf'|'chart'|'pdfjs')` (lihat `<head>` index.html); pustaka baru yang >50 KB ditambahkan ke daftar itu, bukan ke tag `<script>` awal.
5. Ubah kelas Tailwind -> bangun ulang `tailwind.css` lalu naikkan `?v=` di `index.html`.
6. Ubah berkas di `riksa/` -> naikkan `VERSION` di `riksa/sw.js`.
7. Node baru yang besar -> tambahkan ke `PER_ANAK` di skrip cadangan, lalu minta Adrian menempel ulang skrip itu di Apps Script (salinan di Google tidak ikut berubah otomatis).
8. Aturan Firebase (rules) untuk node baru harus ditambahkan Adrian di Firebase Console; catat node barunya di bawah.
9. Cek sintaks sebelum commit: ekstrak `<script type="module">` dari `index.html` lalu `node --check`.
10. Commit kecil dengan pesan jelas. Jangan menimpa perubahan sesi lain: jalankan `git status` dan `git diff` dulu, jangan `reset --hard`/`checkout .`.

## Aturan bisnis yang sudah diputuskan
- PJK3/Penyelenggara dipilih saat daftar; daftar dikelola Admin Utama; peserta lama = `PJK3 LPMI`.
- Cek Lisensi: hanya nama peserta itu sendiri dan hanya peserta LPMI yang dapat data; selain itu tampil "Data tidak ditemukan, hanya peserta yang mengikuti training K3 melalui PJK3 LPMI". Penegakan ada di server (`api/cek-lisensi.js`), bukan hanya di tampilan.

## Daftar node Firebase (tambahkan baris saat membuat node baru)
Berat/lazy: `modul_dokumen`, `berita_foto`, `riksa_laporan_data`, `riksa_foto`.
Ringkas/aman dimuat: `statistik_publik`, `riksa_laporan` (ringkasan), `riksa_petugas`, `riksa_log`, `penyelenggara_pjk3`.

## Serah terima terbuka (diperbarui 2026-10-04 oleh sesi cse_016qqY9aarWh6D2w7dg4gwjX)
Hapus bagian ini setelah APK selesai dan assetlinks.json terpasang.
- SELESAI: commit `fe83437` (nama aplikasi "Riksa Uji", ikon logo perisai RuangK3, `riksa/sw.js` VERSION `riksa-v2`) sudah di-push ke GitHub dari shell device Mac (git di shell device memang bisa push; jalankan `git --no-optional-locks status` supaya tidak meninggalkan `.git/index.lock`). Tidak perlu lagi unggah lewat Safari.
- Folder `../Upload ke GitHub/` dan `../Kirim ruangk3 ke GitHub.command` sudah dihapus atas izin Adrian (2026-10-04).
- SELESAI: APK Riksa Uji dibuat di PWABuilder (tab Google Play, package `com.ruangk3.twa`, 2026-10-04). `.well-known/assetlinks.json` + `.nojekyll` terpasang di root repo. File kunci (`signing.keystore`, `signing-key-info.txt`) ada di tangan Adrian, JANGAN pernah masuk repo. Untuk pembaruan APK di masa depan harus memakai kunci yang sama. iPhone: pakai Tambah ke Layar Utama dari Safari (APK hanya Android).
- Catatan teknis: browser bawaan Claude belum login GitHub; Safari sudah login, tetapi computer use untuk Safari hanya bisa membaca.

## Log perubahan lintas sesi (tambah paling atas)
- 2026-10-05 sesi cse_016qqY9aarWh6D2w7dg4gwjX: pasang `daftar-hadir/` + menu admin "Daftar Hadir & Dokumentasi"; penanda sesi `rk3_admin_at` diset di `setupAdminUI` hanya untuk Admin Pusat dan dihapus saat logout. Adrian masih harus memasang `Code.gs` (lihat `daftar-hadir/apps-script/PANDUAN-GOOGLE-DRIVE.md`) dan mengisi URL + Kode Akses di tombol ☁️ tiap perangkat.
- 2026-10-04 perf: html2pdf, Chart.js, PDF.js dimuat sesuai kebutuhan lewat `window.muatPustaka`.
- 2026-10-04 sesi Riksa Uji: nama aplikasi "Riksa Uji", ikon diganti logo perisai RuangK3 (`riksa/icons/`), `VERSION` sw jadi `riksa-v2`. Persiapan APK lewat PWABuilder (package `com.ruangk3.riksa`).
- 2026-10-04 sesi Riksa Uji: tambah `riksa/`, menu admin "Laporan Riksa Uji" & "Petugas Riksa Uji" (lazy), `PER_ANAK` cadangan ditambah `riksa_foto`, `riksa_laporan_data`. Sudah di-commit & di-push (`4eca888`).
