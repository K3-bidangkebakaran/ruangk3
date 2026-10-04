# Catatan bersama untuk semua sesi Claude di proyek ruangk3.com

Dibaca otomatis oleh sesi Claude mana pun yang bekerja di folder ini. Pemilik: Adrian (bahasa Indonesia).
Tujuan: beberapa sesi mengerjakan fitur berbeda, tapi hasilnya harus menyatu dan tetap ringan di sinyal lemah.

## Peta proyek
- `index.html` (satu berkas, GitHub Pages) = situs utama + panel admin. `tailwind.css` = hasil build (lihat README).
- `riksa/` = aplikasi PWA petugas riksa uji (offline-first), memakai Firebase yang sama, nama app `riksa-uji`.
- `../ruangk3-wa-webhook/` (Vercel): `api/cek-lisensi.js` (perantara TemanK3 + cek hak LPMI), webhook WA.
- `../backup-drive/backup-ruangk3-ke-drive.gs` = skrip cadangan harian ke Google Drive (dipasang manual di Apps Script).
- Data: Firebase RTDB `artifacts/k3-kebakaran-app-v5/public/data/<node>`.

## Aturan wajib setiap menambah/ubah fitur (jaringan lemah)
1. Data berat (PDF, foto, base64 > 20 KB) JANGAN di node daftar utama. Pisahkan ke node anak per item dan muat hanya saat dibuka (pola `modul_dokumen`, `berita_foto`, `riksa_foto`).
2. Listener `onValue` ke node besar hanya dipasang saat menu dibuka, bukan saat halaman dimuat. Pengunjung publik tidak boleh mengunduh daftar peserta (pakai `statistik_publik`).
3. Semua `get`/`set`/`fetch` pakai `window.withTimeout(...)` dan tampilkan pesan gagal yang ramah.
4. Skrip/CSS pihak ketiga: `defer`/muat saat dibutuhkan; jangan blocking di `<head>`.
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

## Log perubahan lintas sesi (tambah paling atas)
- 2026-10-04 sesi Riksa Uji: nama aplikasi "Riksa Uji", ikon diganti logo perisai RuangK3 (`riksa/icons/`), `VERSION` sw jadi `riksa-v2`. Persiapan APK lewat PWABuilder (package `com.ruangk3.riksa`).
- 2026-10-04 sesi Riksa Uji: tambah `riksa/`, menu admin "Laporan Riksa Uji" & "Petugas Riksa Uji" (lazy), `PER_ANAK` cadangan ditambah `riksa_foto`, `riksa_laporan_data`. Belum commit saat catatan ini ditulis.
