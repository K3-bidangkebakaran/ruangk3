#!/usr/bin/env node
/* Membuat pic/js/wrd.js (Pratinjau Word di APK PIC) dari kode laporan website (daftar-hadir/index.html).
   Isi laporan di APK = kode yang SAMA dengan pratinjau di website, jadi isi, urutan halaman, dan pembagian halaman ikut persis.
   Pakai:  node pic/tools/build-wrd.js [daftar-hadir/index.html] [pic/js/wrd.js]      (perlu paket "acorn": npm i acorn)
   Jalankan ulang setiap kali kode laporan di website berubah (renderSet, kelasGroups, rundown, gaya halaman A4). */
const fs = require('fs'), path = require('path');
let acorn; try { acorn = require('acorn'); } catch (e) { acorn = require('/opt/node-tools/node_modules/acorn'); }
const SRC = process.argv[2] || path.join(__dirname, '../../daftar-hadir/index.html'), OUT = process.argv[3] || path.join(__dirname, '../js/wrd.js');
const html = fs.readFileSync(SRC, 'utf8');
const i0 = html.lastIndexOf('<script>\n(() => {') + 9, i1 = html.lastIndexOf('</script>');
const code = html.slice(i0, i1), ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script' });
const body = ast.body[0].expression.callee.body.body;
const decl = new Map(), stm = new Set();
body.forEach(n => {
  if (n.type === 'FunctionDeclaration') decl.set(n.id.name, n);
  else if (n.type === 'VariableDeclaration') n.declarations.forEach(d => { if (d.id.type === 'Identifier') decl.set(d.id.name, n); });
});
const ids = (node, set) => { (function w(n) { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) { n.forEach(w); return; } if (n.type === 'Identifier') set.add(n.name); for (const k of Object.keys(n)) { if (k === 'type' || k === 'start' || k === 'end') continue; const v = n[k]; if (v && typeof v === 'object') w(v); } })(node); return set; };
// diganti / disediakan sendiri di wrd.js (bergantung pada halaman website: layar, tanda tangan penyelenggara, pengukur halaman, gambar kop, aturan hari per alat)
const EXCL = new Set(['S', 'blank', 'idx', 'today', 'todayIso', 'orgLocked', 'KOP_HEAD', 'KOP_FOOT', 'measurer', 'measEl', 'hariKelas', 'hariNon1', 'aturan4', 'KLS1']);
const ROOTS = ['renderSet', 'kelasGroups', 'rdOn', 'kelasKey', 'hariList', 'fotoDua', 'isB3', 'jenisOf'];
const got = new Set(), q = [...ROOTS];
while (q.length) { const nm = q.pop(); if (got.has(nm) || !decl.has(nm) || EXCL.has(nm)) continue; got.add(nm); const n = decl.get(nm); stm.add(n); ids(n, new Set()).forEach(x => { if (decl.has(x) && !got.has(x) && !EXCL.has(x)) q.push(x); }); }
const parts = [...stm].sort((a, b) => a.start - b.start).map(n => code.slice(n.start, n.end));
// CSS halaman A4 dari website
const st = html.indexOf('/* ---------- A4 pages (output) ---------- */'), en = html.indexOf('/* tab laporan */');
let css = html.slice(st, en);
css = css.replace(/^#pages\{[^}]*\}\n/m, '').replace(/@media screen\{[\s\S]*?\n\}\n/, '').replace(/^#pages\.hide-[^\n]*\n/m, '');
css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{2,}/g, '\n').trim();
const EXPORT = ['renderSet', 'kelasGroups', 'rdOn', 'kelasKey', 'hariList', 'fotoDua', 'isB3', 'jenisOf', 'hariTanggal', 'waktu', 'lapTexts', 'nrKeys', 'nrOff', 'nrEf', 'naraNew', 'NR_KEY'].filter(n => got.has(n));
const out = `/* DIBUAT OTOMATIS oleh pic/tools/build-wrd.js dari daftar-hadir/index.html — JANGAN diedit manual (ubah kode di website lalu jalankan ulang).
   Isi: kode pembuat halaman laporan (Daftar Hadir, Selfie, Nilai, Narasumber, Dokumentasi, Lulus, Rundown) yang sama dengan pratinjau website. */
(function () {
"use strict";
const KOP_HEAD = "img/kop-head.png", KOP_FOOT = "img/kop-foot.png"; // gambar kop di APK = berkas lokal
const S = null, today = "", todayIso = () => "", orgLocked = () => false; // tidak dipakai di APK
let measEl = null;
function measurer() { // pengukur tinggi halaman: di dalam shadow DOM sendiri supaya gaya halaman A4 tidak bocor ke aplikasi
  if (!measEl) { const host = document.createElement("div"); host.setAttribute("aria-hidden", "true"); host.style.cssText = "position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none"; const sh = host.attachShadow({ mode: "open" }); sh.innerHTML = "<style>" + CSS + "</style>"; measEl = document.createElement("div"); sh.appendChild(measEl); document.body.appendChild(host); }
  return measEl;
}
function hariKelas(ev, k) { return (ev.hkMap && ev.hkMap[kelasKey(k || "")]) || null; } // hari alat/program: dihitung website (node.hk), dikirim apa adanya
const CSS = ${JSON.stringify(':host{all:initial;display:block;--accent:#f58220;--accent-d:#c9661a;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:14px;color:#1d1d1f}*{box-sizing:border-box;margin:0;padding:0}[hidden]{display:none!important}.sign-hint{display:none}\n' + css)};
${parts.join('\n')}
window.Wrd = { CSS, ${EXPORT.join(', ')} };
})();
`;
fs.writeFileSync(OUT, out);
console.log('wrd.js:', Math.round(out.length / 1024) + ' KB;', got.size, 'deklarasi:', [...got].join(' '));
