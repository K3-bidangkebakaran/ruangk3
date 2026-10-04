# ruangk3
## Build CSS Tailwind
`tailwind.css` adalah hasil build statis. Setelah menambah/mengubah class Tailwind di `index.html`:

    npm i tailwindcss@3.4.17
    npx tailwindcss -c tailwind.config.js -i tailwind.input.css -o tailwind.css --minify

lalu naikkan angka `?v=` pada `<link href="tailwind.css">` di `index.html`.
