# ruangk3
## Build CSS Tailwind
`tailwind.css` adalah hasil build statis. Setelah menambah/mengubah class Tailwind di `index.html`:

    npm i tailwindcss@3.4.17
    npx tailwindcss -c tailwind.config.js -i tailwind.input.css -o tailwind.css --minify

lalu naikkan angka `?v=` pada `<link href="tailwind.css">` di `index.html`.

## Aplikasi Riksa Uji (`riksa/`)
Aplikasi lapangan petugas riksa uji APAR & hidran di `https://ruangk3.com/riksa/` (PWA, bisa offline).
Laporan yang dikirim petugas masuk ke menu admin **Laporan Riksa Uji**; akun petugas dikelola di
**Petugas Riksa Uji**. Penjelasan lengkap: `riksa/README.md`.
Setiap mengubah berkas di `riksa/`, naikkan `VERSION` di `riksa/sw.js`.
