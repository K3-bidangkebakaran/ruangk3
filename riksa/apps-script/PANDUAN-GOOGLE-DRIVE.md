# Panduan Google Drive – Riksa Uji

Foto dokumentasi, data laporan (`data.json`) dan file Word laporan **APAR, Hidran dan Fire Alarm** disimpan di Google Drive lewat **Apps Script khusus Riksa Uji**. Skrip ini **terpisah** dari Apps Script Daftar Hadir: proyek sendiri, URL sendiri, kode akses sendiri, folder sendiri. Firebase hanya menyimpan baris ringkasan (perusahaan, nomor, status, link folder) supaya daftar di panel admin cepat.

## Hasil di Google Drive

```
📂 (folder Riksa Uji yang Anda tentukan)
 └─ 📁 PT Maju Jaya - 2026-10-07            (1 folder per berkas = perusahaan + tanggal berkas dibuat)
     ├─ 📁 APAR        ├─ data.json   ├─ Laporan_Riksa_Uji_APAR_….docx   └─ 📁 Foto  (APAR-01__<id>.jpg …)
     ├─ 📁 Hidran      (isi sama)
     └─ 📁 Fire Alarm  (isi sama)
```

## Pemasangan (sekali saja, ±10 menit)

1. Login ke akun Google pemilik data, buka **https://script.google.com** → **New project**. Beri nama, mis. *Backend Riksa Uji*.
2. Hapus isi `Code.gs` bawaan, tempel seluruh isi file `riksa/apps-script/Code.gs` dari repo ini, **Save**.
3. Di fungsi `setup`, ganti `TEMPEL_LINK_FOLDER_DI_SINI` dengan link folder Drive tujuan (langsung di editor Apps Script; **jangan** di-commit ke repo supaya link Drive tetap privat). Akun pemilik script harus punya akses **Editor** ke folder itu.
4. Pilih fungsi **`setup`** → **Run**. Izinkan akses (Drive dan koneksi ke layanan eksternal untuk memeriksa login petugas): *Review permissions* → pilih akun → *Advanced* → *Go to … (unsafe)* → *Allow*. Di **Execution log** catat **KODE AKSES ADMIN**; baris `HTTP 400` itu normal.
5. **Deploy → New deployment → ⚙️ Web app**: *Execute as* **Me**, *Who has access* **Anyone** → Deploy → salin **Web app URL** (berakhiran `/exec`).
6. Buka panel admin ruangk3.com → **Laporan Riksa Uji** → isi **URL Web App** dan **Kode Akses** → **Hubungkan Drive Riksa Uji**. URL tersimpan di Firebase (supaya HP petugas tahu tujuannya); Kode Akses hanya di browser admin ini.
7. Selesai. HP petugas memuat versi terbaru otomatis; laporan yang dikirim sesudahnya masuk ke Drive.

## Siapa boleh apa

- **Petugas** (HP): hanya bisa mengirim foto & laporan. Dibuktikan dengan login Firebase petugas; akun harus terdaftar dan aktif di menu *Petugas Riksa Uji*.
- **Admin** (panel ruangk3.com): mengunduh dan menghapus laporan, dibuktikan dengan Kode Akses. Jangan bagikan kode itu.
- Jangan bagikan folder Riksa Uji ke "Siapa saja yang memiliki link": isinya laporan dan foto milik klien.

## Catatan

- Laporan lama di Firebase tetap di sana dan tetap bisa diunduh admin. Bila petugas menekan **Kirim** lagi pada berkas lama, laporannya pindah ke Drive dan salinan di Firebase dibersihkan.
- **Putuskan** di panel admin mengembalikan pengiriman baru ke Firebase. Isi Drive tidak diubah.
- **Hapus** laporan di panel admin memindahkan folder jenis laporan itu ke Sampah Drive (±30 hari bisa dipulihkan); folder perusahaan ikut ke Sampah bila sudah kosong.
- Unduh Word di panel admin memakai file Word yang dibuat HP petugas saat mengirim. Bila file itu tidak ada, Word dibuat ulang dari `data.json` dan foto di Drive.
- Foto dikirim satu per satu (±100–200 KB). Satu laporan 100 foto ±beberapa menit; jauh di bawah kuota harian Apps Script.
- Setelah mengubah `Code.gs`: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. URL tetap sama. Bila kode akses lupa/bocor, jalankan `gantiKodeAkses` lalu isi kode baru di panel admin.
