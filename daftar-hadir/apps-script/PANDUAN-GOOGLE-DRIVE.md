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
           ├─ 📝 Daftar Hadir - <nama kegiatan>.docx      (Word: daftar hadir + tanda tangan, berkop surat)
           ├─ 📝 Dokumentasi Peserta - <nama kegiatan>.docx (Word: foto tiap peserta, 4 per halaman)
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

- **Berkas Word dibuat otomatis oleh aplikasi** (bukan oleh Apps Script) setiap sinkron, dan hanya diunggah ulang bila isinya berubah. Untuk kegiatan tanpa foto, berkas Dokumentasi tidak dibuat. Foto dalam berkas Word diperkecil agar ringan; foto asli tetap utuh di folder *Foto Dokumentasi*.

- **Otomatis:** setiap perubahan dikirim kira-kira 4 detik kemudian. Status terlihat di tombol ☁️ (hijau = tersinkron, kuning = sedang/menunggu, merah = gagal, dicoba ulang otomatis tiap 1 menit dan saat internet kembali).
- **Upload per paket:** foto, tanda tangan dan berkas Word dikirim ±12 file sekali kirim (aksi `uploadFiles`, `Code.gs` versi 4 ke atas), bukan satu per satu, jadi jauh lebih cepat. Dengan `Code.gs` lama aplikasi otomatis kembali ke satu per satu (lambat) dan tombol ☁️ menampilkan ⚠️ Perbarui Apps Script.
- **Hemat kuota:** hanya file yang berubah yang diunggah ulang. Foto atau tanda tangan yang diganti akan menggantikan file lama, dan file lama masuk *Sampah* Drive.
- **Data lokal tetap ada:** aplikasi tetap bisa dipakai offline, lalu data dikirim begitu online lagi.
- **Perangkat lain:** menu **📁 Kegiatan → ☁️ Di Google Drive → Muat daftar → Unduh & Buka** mengambil kegiatan, termasuk foto & tanda tangan, yang dibuat di perangkat lain.
- **Menghapus kegiatan** (📁 Kegiatan → Hapus, atau tombol Hapus di menu admin ruangk3.com) ikut menghapus kegiatan di Google Drive: folder kegiatannya (daftar hadir Word, foto, tanda tangan) dipindah ke **Sampah Drive**, lalu barisnya dibuang dari spreadsheet Database Induk. Isi Sampah Drive masih bisa dipulihkan sekitar 30 hari. Jika perangkat sedang offline saat menghapus, perintah hapus disimpan dan dijalankan otomatis begitu online. Tombol Hapus juga ada pada daftar *Di Google Drive* untuk kegiatan yang hanya ada di Drive. Fitur ini butuh `Code.gs` versi terbaru (aksi `deleteEvent`).

## Koneksi permanen & perangkat lain

- URL Web App dan Kode Akses disimpan di dua tempat pada browser (IndexedDB dan localStorage, kunci `rk3_dh_cfg`, dipakai bersama oleh aplikasi dan menu admin ruangk3.com). Jika salah satunya dibersihkan browser, otomatis dipulihkan dari yang lain. Aplikasi juga meminta browser agar data situs tidak dihapus. Pengaturan **tidak** dihapus saat keluar dari panel admin; hanya tombol **Putuskan** yang menghapusnya.
- Menghubungkan perangkat lain tanpa mengetik ulang: di tombol ☁️ klik **Salin Tautan Pengaturan**, kirim ke diri sendiri (WhatsApp/email pribadi), lalu buka di perangkat tujuan. Tautan berisi Kode Akses, jadi rahasiakan.
- Tombol ☁️ menampilkan **⚠️ Perbarui Apps Script** bila `Code.gs` di Apps Script lebih lama dari aplikasi.

## Hapus permanen (opsional)

Secara bawaan kegiatan yang dihapus dipindah ke **Sampah Drive**. Agar langsung terhapus permanen: di editor Apps Script klik **+** di samping **Layanan**, pilih **Drive API**, klik **Tambahkan**, lalu Deploy versi baru. Tanpa layanan ini kegiatan tetap hilang dari daftar dan folder kegiatan, hanya tersisa di Sampah Drive.

## Memindahkan data ke folder Drive lain

Bila folder penyimpanan ingin diganti (misalnya ke folder baru yang sudah dibagikan ke akun Anda):

1. Tempel Code.gs terbaru di Apps Script (hapus semua isi lama, tempel yang baru), lalu **Simpan**.
2. Di fungsi `pindahKeFolderBaru`, ganti tulisan `TEMPEL_LINK_FOLDER_DI_SINI` dengan link folder tujuan (langsung di editor Apps Script; **jangan** di-commit ke repo supaya link Drive tetap privat).
3. Pilih fungsi `pindahKeFolderBaru` → **Jalankan** → izinkan akses bila diminta → lihat **Log eksekusi**.
4. Seluruh folder "Daftar Hadir & Dokumentasi - LPMI" (spreadsheet, folder tiap kegiatan, foto, TTD) pindah ke dalam folder tujuan. ID file tidak berubah, jadi data lama utuh dan simpanan berikutnya otomatis masuk ke folder baru. Tidak perlu deploy ulang dan URL aplikasi tidak berubah.

Syarat: akun yang men-deploy script harus punya akses **Editor** ke folder tujuan.

## Hasil APK Portal PIC tersimpan otomatis (walau web tidak dibuka)

Hasil kerja PIC di APK (TTD peserta, foto, peserta batal, TTD PIC, TTD narasumber, foto dokumentasi harian) diambil **sendiri oleh Apps Script tiap 5 menit** dan disimpan ke folder kegiatan di Google Drive. Web ruangk3.com tidak perlu dibuka atau login. Saat web dibuka, hasilnya sudah ada di Drive dan tidak jadi file ganda (key, folder, dan nama file sama dengan yang dibuat web).

Menyalakan (sekali saja, butuh `Code.gs` versi 5):

1. Tempel `Code.gs` terbaru di Apps Script, simpan, lalu **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
2. Pilih fungsi **`picOtomatisAktifkan`** → **Run** → klik **Review permissions / Izinkan** (ada izin baru: membuat pemicu waktu). Log menampilkan "AKTIF" dan hasil putaran pertama.
3. Selesai. Pemeriksaan: fungsi `picOtomatisStatus` (lihat Log), atau tombol ☁️ di web memberi tahu bila belum dinyalakan. Mematikan: `picOtomatisMatikan`. Memeriksa ulang semua kegiatan: `picOtomatisPeriksaUlang`.

Catatan:
- Yang disimpan otomatis: foto, tanda tangan, dan hitungan di spreadsheet. **data.json dan berkas Word tetap dibuat web** saat dibuka.
- Hanya kegiatan yang PIC-nya aktif dalam 60 hari terakhir yang diperiksa. Peserta yang ditandai batal oleh PIC otomatis dibuang file-nya dari Drive, sama seperti di web.
- Pemicu memakai login anonim Firebase (seperti aplikasi PIC). Butuh aturan Firebase `dh_*` dari `pic/README.md` dan *Authentication → Anonymous* aktif.
- Waktu eksekusi: putaran tanpa perubahan hanya beberapa detik; tiap kegiatan yang berubah diperiksa sekali per perubahan.

## Jika mengubah Code.gs

Setelah mengedit script (termasuk saat menempel `Code.gs` versi baru): jalankan fungsi `setup` sekali, lalu **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. URL tetap sama, jadi aplikasi tidak perlu diubah.

## Catatan & batasan

- Kuota Apps Script akun Gmail biasa: total waktu eksekusi ±90 menit/hari (Google Workspace: ±6 jam). Satu kegiatan 50 peserta (50 foto + 50–350 tanda tangan) jauh di bawah batas ini.
- Jika 2 perangkat dipakai untuk **kegiatan yang sama** (misalnya tablet untuk tanda tangan dan HP untuk foto), semua file foto & tanda tangan dari kedua perangkat tetap tersimpan di Drive. Namun **daftar peserta dan info kegiatan** mengikuti perangkat yang terakhir mengirim, jadi sebaiknya daftar peserta diedit hanya di satu perangkat.
- Aplikasi harus dibuka lewat **https://** agar kamera, GPS, dan sinkron berjalan di HP.
