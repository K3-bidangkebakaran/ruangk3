#!/usr/bin/env node
/* Membuat pic/js/prog.js dari pic/js/app.js: HITUNGAN KELENGKAPAN LAPORAN yang SAMA dengan layar "Pratinjau Laporan" di APK PIC (fungsi lapCek + semua yang dipakainya).
   Dipakai panel admin (ruangk3.com, Daftar Hadir & Dokumentasi) untuk pop up "Progres laporan" memakai data seluruh akun PIC.
   Pakai:  node pic/tools/build-prog.js [pic/js/app.js] [pic/js/prog.js]      (perlu paket "acorn")
   Jalankan ulang setiap kali lapCek / fungsi yang dipakainya di app.js berubah. */
const fs = require('fs'), path = require('path');
let acorn; try { acorn = require('acorn'); } catch (e) { acorn = require('/opt/node-tools/node_modules/acorn'); }
const SRC = process.argv[2] || path.join(__dirname, '../js/app.js'), OUT = process.argv[3] || path.join(__dirname, '../js/prog.js');
const code = fs.readFileSync(SRC, 'utf8'), ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script' });
const body = ast.body[0].expression.callee.body.body, decl = new Map(), names = n => n.type === 'FunctionDeclaration' ? [n.id.name] : n.declarations.map(d => d.id.name);
body.forEach(n => { if (n.type === 'FunctionDeclaration') decl.set(n.id.name, n); else if (n.type === 'VariableDeclaration') n.declarations.forEach(d => { if (d.id.type === 'Identifier') decl.set(d.id.name, n); }); });
const OWN = new Set(['ME', 'KEGS', 'H', 'P', 'OH', 'OHV', 'OVC', 'KIDC']); // keadaan dibuat sendiri di bawah (admin: tanpa "isian sendiri", semua akun PIC = akun lain)
const ids = (node, set) => { (function w(n) { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) { n.forEach(w); return; } if (n.type === 'Identifier') set.add(n.name); for (const k of Object.keys(n)) { if (k === 'type' || k === 'start' || k === 'end') continue; w(n[k]); } })(node); return set; };
const got = new Set(), stm = new Set(), q = ['lapCek'];
while (q.length) { const nm = q.pop(); if (got.has(nm) || !decl.has(nm) || OWN.has(nm)) continue; got.add(nm); const n = decl.get(nm); stm.add(n); ids(n, new Set()).forEach(x => { if (decl.has(x) && !got.has(x) && !OWN.has(x)) q.push(x); }); }
for (const n of stm) if (names(n).some(x => OWN.has(x))) throw new Error('pernyataan campuran: ' + names(n).join(','));
const parts = [...stm].sort((a, b) => a.start - b.start).map(n => code.slice(n.start, n.end));
const out = `/* DIBUAT OTOMATIS oleh pic/tools/build-prog.js dari pic/js/app.js — JANGAN diedit manual (ubah kode di app.js lalu jalankan ulang).
   Isi: hitungan kelengkapan laporan yang SAMA dengan layar "Pratinjau Laporan" di APK PIC. Dipakai panel admin web untuk pop up progres kegiatan.
   Pakai:  PicProgres.hitung(kegiatan, { uidPIC: hasilDariFirebase, ... })  ->  { secs, nOk, all, pct }   (kegiatan = isi dh_kegiatan/{id} + id) */
(function () {
"use strict";
let ME = { uid: "_admin", nama: "Admin" }, KEGS = {}, H = {}, P = { kl: null }, OH = {}, OHV = 0; const OVC = new Map(), KIDC = new WeakMap();
${parts.join('\n')}
window.PicProgres = {
  hitung(k, hasil) { // k = kegiatan (harus ada k.id); hasil = { uid: dh_hasil/{id}/{uid} } dari semua akun PIC
    const kid = k.id; KEGS = { [kid]: k }; H = {}; OH = { [kid]: hasil || {} }; OHV++; OVC.clear(); P = { kl: null };
    return lapCek(kid);
  }
};
})();
`;
fs.writeFileSync(OUT, out); console.log('prog.js:', Math.round(out.length / 1024) + ' KB;', got.size, 'deklarasi');
