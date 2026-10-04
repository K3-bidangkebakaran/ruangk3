# Panduan Integrasi Google Drive

Aplikasi **Daftar Hadir & Dokumentasi** menyimpan semua data ke Google Drive melalui **Google Apps Script** (gratis, tanpa server sendiri). Apps Script berjalan di akun Google pemilik, jadi semua file tersimpan di Drive akun tersebut.

## Hasil di Google Drive

```
📂 Ruangk3.com                                       (folder induk RuangK3: Backup-YYYY-MM-DD, media, dst.)
 └─ 📂 Daftar Hadir & Dokumentasi - LPMI             (dibuat/dipindah otomatis ke sini)
     ├─ 📊 Database Induk - Daftar Hadir LPMI        (spreadsheet)
     │     ├─ sheet "Kegiatan" : 1 baris per kegiatan (daftar tanggal, tempat, jumlah peserta, foto, TTD, link folder)
     │     └─ sheet "Peserta"  : 1 baris per peserta per kegiatan (nama, perusahaan, link foto, ✓ TTD Hari 1–7)
     └─ 📁 2026-07-15 - Pelatihan K3 Kebakaran       (1 folder per kegiatan)
           ├─ data.json                              (data lengkap kegiatan)
           ├─ 📁 Foto Dokumentasi                    (foto bertanda air, 1 per peserta)
           ├─ 📁 Tanda Tangan Peserta / 2026-07-15 (Rabu), 2026-07-17 (Jumat) …   (1 folder per tanggal)
           └─ 📁 Tanda Tangan Penyelenggara
```

Folder induk **Ruangk3.com** dicari lewat namanya di Drive akun pemilik script (yang berisi subfolder `media` diutamakan). Kalau tidak ditemukan, folder Daftar Hadir dibuat di My Drive. Jika folder Daftar Hadir sudah terlanjur dibuat di luar `Ruangk3.com`, folder itu dipindahkan otomatis satu kali (isinya ikut, link lama tetap berfungsi). Pastikan **Ruangk3.com tidak dibagikan ke "Siapa saja yang memiliki link"**, karena berisi data pribadi peserta.

## Langkah pemasangan (sekali saja, ±10 menit)

1. Login ke akun Google yang akan menjadi pemilik data (disarankan akun kantor), lalu buka **https://script.google.com** → **New project**.
2. Hapus isi `Code.gs` bawaan, lalu **tempel seluruh isi file `Code.gs`** dari paket ini. Beri nama proyek, misalnya *Backend Daftar Hadir LPMI*, lalu klik **Save** 💾.
3. Di toolbar, pilih fungsi **`setup`** lalu klik **Run** ▶.
   - Google akan meminta izin akses Drive & Spreadsheet: **Review permissions** → pilih akun → *Advanced* → *Go to … (unsafe)* → **Allow**. Peringatan ini normal untuk script buatan sendiri.
   - Buka **Execution log** dan catat **KODE AKSES** yang tampil, misalnya `KODE AKSES : 7F3A9C21B0D4`.
4. Klik **Deploy → New deployment** → ikon ⚙️ → **Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - Klik **Deploy**, lalu salin **Web app URL** (berakhiran `/exec`).
5. Buka aplikasi → tombol **☁️ Hubungkan Drive** di bar atas → isi **URL Web App** dan **Kode Akses** → **Simpan & Hubungkan**.
   - Lakukan langkah ini di setiap HP/laptop yang dipakai, dengan URL dan kode yang sama.

> Akses "Anyone" hanya berarti URL bisa dipanggil tanpa login Google. Setiap permintaan tetap ditolak kalau kode aksesnya salah. Jangan bagikan kode akses di luar tim. Untuk mengganti kode, jalankan fungsi `gantiKodeAkses` lalu isi ulang kodenya di semua perangkat.

## Cara kerja sinkron

- **Otomatis:** setiap perubahan dikirim kira-kira 4 detik kemudian. Status terlihat di tombol ☁️ (hijau = tersinkron, kuning = sedang/menunggu, merah = gagal, dicoba ulang otomatis tiap 1 menit dan saat internet kembali).
- **Hemat kuota:** hanya file yang berubah yang diunggah ulang. Foto atau tanda tangan yang diganti akan menggantikan file lama, dan file lama masuk *Sampah* Drive.
- **Data lokal tetap ada:** aplikasi tetap bisa dipakai offline, lalu data dikirim begitu online lagi.
- **Perangkat lain:** menu **📁 Kegiatan → ☁️ Di Google Drive → Muat daftar → Unduh & Buka** mengambil kegiatan, termasuk foto & tanda tangan, yang dibuat di perangkat lain.
- **Menghapus kegiatan di aplikasi tidak menghapus data di Drive**, karena Drive adalah arsip induk. Hapus foldernya langsung di Drive bila memang perlu.

## Jika mengubah Code.gs

Setelah mengedit script (termasuk saat menempel `Code.gs` versi baru): jalankan fungsi `setup` sekali, lalu **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. URL tetap sama, jadi aplikasi tidak perlu diubah.

## Catatan & batasan

- Kuota Apps Script akun Gmail biasa: total waktu eksekusi ±90 menit/hari (Google Workspace: ±6 jam). Satu kegiatan 50 peserta (50 foto + 50–350 tanda tangan) jauh di bawah batas ini.
- Jika 2 perangkat dipakai untuk **kegiatan yang sama** (misalnya tablet untuk tanda tangan dan HP untuk foto), semua file foto & tanda tangan dari kedua perangkat tetap tersimpan di Drive. Namun **daftar peserta dan info kegiatan** mengikuti perangkat yang terakhir mengirim, jadi sebaiknya daftar peserta diedit hanya di satu perangkat.
- Aplikasi harus dibuka lewat **https://** agar kamera, GPS, dan sinkron berjalan di HP.
