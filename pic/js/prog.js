/* DIBUAT OTOMATIS oleh pic/tools/build-prog.js dari pic/js/app.js — JANGAN diedit manual (ubah kode di app.js lalu jalankan ulang).
   Isi: hitungan kelengkapan laporan yang SAMA dengan layar "Pratinjau Laporan" di APK PIC. Dipakai panel admin web untuk pop up progres kegiatan.
   Pakai:  PicProgres.hitung(kegiatan, { uidPIC: hasilDariFirebase, ... })  ->  { secs, nOk, all, pct }   (kegiatan = isi dh_kegiatan/{id} + id) */
(function () {
"use strict";
let ME = { uid: "_admin", nama: "Admin" }, KEGS = {}, H = {}, P = { kl: null }, OH = {}, OHV = 0; const OVC = new Map(), KIDC = new WeakMap();
const fnv = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + ':' + str.length; };
const newH = () => ({ batal: {}, remedial: {}, hadir: {}, foto: {}, foto2: {}, ttdPic: '', ttdPicNama: '', upd: 0, rev: 0, dirty: false, sent: {}, nilai: {}, kel: {}, lapN: {}, materi: {}, hfoto: {}, n1: '', n2: '', gone: [], nr: {}, nrs: {}, nshared: {}, naraSeen: {}, tshared: {}, ttdpSeen: {}, tnShared: {}, selesai: false });
function kidOf(h) { let k = KIDC.get(h); if (k && H[k] === h) return k; k = Object.keys(H).find(x => H[x] === h) || ''; if (k) KIDC.set(h, k); return k; }
function ovBuild(kid) {
  const m = OH[kid]; if (!m || !ME) return null;
  const list = Object.entries(m).filter(([u, x]) => u !== ME.uid && x && typeof x === 'object').sort((a, b) => (a[1].upd || 0) - (b[1].upd || 0));
  if (!list.length) return null;
  const o = { batal: {}, remedial: {}, nilai: {}, kel: {}, s: { s1: {}, s2: {} }, nKota: null, materi: {}, nr: {}, hadir: {}, foto: {}, foto2: {}, ttdPic: false, ttdNama: '', nrT: {}, n1: false, n2: false, hf: {} };
  for (const [, x] of list) {
    const u = x.upd || 0, put = (t, key, v) => { t[key] = { v, u }; };
    Object.entries(x.batal || {}).forEach(([pid, v]) => put(o.batal, pid, !!v));
    Object.entries(x.remedial || {}).forEach(([pid, v]) => put(o.remedial, pid, !!v));
    Object.entries(x.nilai || {}).forEach(([pid, y]) => { if (y && typeof y === 'object') Object.entries(y).forEach(([f, v]) => { (o.nilai[pid] = o.nilai[pid] || {})[f] = { v, u }; }); });
    Object.entries(x.kel || {}).forEach(([pid, v]) => put(o.kel, pid, v));
    const l = x.lap || {};
    ['s1', 's2'].forEach(w => Object.entries(l[w] || {}).forEach(([f, v]) => put(o.s[w], f, v)));
    if (l.nKota != null) o.nKota = { v: l.nKota, u };
    Object.entries(l.hari || {}).forEach(([d, hh]) => { if (hh && hh.materi != null) put(o.materi, d, hh.materi); if (hh && Array.isArray(hh.ids)) hh.ids.forEach(i => { (o.hf[d] = o.hf[d] || new Set()).add(String(i)); }); });
    if (x.ttdN1) o.n1 = true; if (x.ttdN2) o.n2 = true;
    const nrPut = (key, r) => { if (r && typeof r === 'object') { if (r.ttd) o.nrT[key] = 1; Object.entries(r).forEach(([f, v]) => { if (f !== 'ttd') (o.nr[key] = o.nr[key] || {})[f] = { v, u }; }); } };
    Object.entries(l.nr || {}).forEach(([d, r]) => nrPut(d, r));
    Object.entries(l.nrk || {}).forEach(([kk, D]) => Object.entries(D || {}).forEach(([d, r]) => nrPut(kk + '~' + d, r)));
    Object.entries(x.hadir || {}).forEach(([pid, days]) => Object.keys(days || {}).forEach(d => { (o.hadir[pid] = o.hadir[pid] || {})[d] = 1; }));
    Object.keys(x.foto || {}).forEach(pid => { o.foto[pid] = 1; });
    Object.keys(x.foto2 || {}).forEach(pid => { o.foto2[pid] = 1; });
    if (x.ttdPic) { o.ttdPic = true; o.ttdNama = x.ttdPicNama || x.picNama || ''; }
  }
  return o;
}
function ovOf(h) {
  if (!ME || !h) return null; const kid = kidOf(h); if (!kid || !OH[kid]) return null;
  let c = OVC.get(kid); if (!c || c.v !== OHV) { c = { v: OHV, o: ovBuild(kid) }; OVC.set(kid, c); }
  return c.o;
}
const ownWins = (h, x) => !x || (h.upd || 0) >= x.u;
const xT = (h, pid, d) => { const o = ovOf(h); return !!(o && o.hadir[pid] && o.hadir[pid][d]); };
const xF = (h, pid, key) => { const o = ovOf(h); return !!(o && o[key === 'foto2' ? 'foto2' : 'foto'][pid]); };
const xPic = h => { const o = ovOf(h); return !!(o && o.ttdPic); };
const xNrT = (h, key) => { const o = ovOf(h); return !!(o && o.nrT[key]); };
const nrTtdSrc = (h, k, key) => (h.nrs && h.nrs[key]) ? 'own' : xNrT(h, key) ? 'pic' : (k && nrAdmin(k, key).ttd) ? 'web' : '';
const nrTtd = (h, key, k) => !!nrTtdSrc(h, k, key);
const nTtdSrc = (h, k, n) => h['n' + n] ? 'own' : (ovOf(h) && ovOf(h)['n' + n]) ? 'pic' : (k && LAPK(k)['s' + n + 'ttd']) ? 'web' : '';
const nTtd = (h, n, k) => !!nTtdSrc(h, k, n);
const hfN = (h, d) => ((h.hfoto && h.hfoto[d]) || []).length + (() => { const o = ovOf(h), st = o && o.hf[d]; return st ? st.size : 0; })();
const isBatal = (h, p) => { const o = ovOf(h), x = o && o.batal[p.id]; if ((p.id in h.batal) && ownWins(h, x)) return !!h.batal[p.id]; return x ? x.v : !!p.batal; };
const isRem = (h, p) => { if (isBatal(h, p)) return false; const o = ovOf(h), x = o && o.remedial[p.id]; if (h.remedial && (p.id in h.remedial) && ownWins(h, x)) return !!h.remedial[p.id]; return x ? x.v : !!p.remedial; };
const webT = (p, d) => !!(p && p.wt && p.wt[d]);
const sudahTtd = (h, p, d) => !!(h.hadir[p.id] && h.hadir[p.id][d]) || webT(p, d) || xT(h, p.id, d);
const webF = (p, key) => !!(p && (key === 'foto2' ? p.wf2 : p.wf));
const hariPeserta = (k, p) => { const hk = k && k.hk && p && p.kelas ? k.hk[kelasKey(p.kelas)] : null, a = hk ? (Array.isArray(hk) ? hk : Object.values(hk)) : null; return a && a.length ? a : ((k && k.tgl) || []); };
const perluHari = (h, p, d, days, k) => { if (isBatal(h, p)) return false; const pd = k ? hariPeserta(k, p) : days; return pd.includes(d) && (!isRem(h, p) || d === pd[pd.length - 1]); };
const absDays = k => { const kl = k && curKl(k), hk = kl && k.hk && k.hk[kelasKey(kl)], a = hk ? (Array.isArray(hk) ? hk : Object.values(hk)) : null; return a && a.length ? a : ((k && k.tgl) || []); };
const ttdOrgOk = (h, k) => !!h.ttdPic || !!(k && k.ttdWeb) || xPic(h);
const hOf = kid => { const h = (H[kid] = H[kid] || newH()); if (!h.ren1) b3Ren(h); if (!h.foto2) h.foto2 = {}; ['nilai', 'kel', 'lapN', 'materi', 'hfoto'].forEach(f => { if (!h[f]) h[f] = {}; }); if (!h.gone) h.gone = []; if (!h.nr) h.nr = {}; if (!h.nrs) h.nrs = {}; if (!h.nshared) h.nshared = {}; if (!h.naraSeen) h.naraSeen = {}; if (!h.tshared) h.tshared = {}; if (!h.ttdpSeen) h.ttdpSeen = {}; if (!h.tnShared) h.tnShared = {}; if (h.n1 == null) h.n1 = ''; if (h.n2 == null) h.n2 = ''; return h; };
const fotoDua = k => !!(k && (k.damkar || k.b3));
const LAPK = k => (k && k.lap) || {};
const nilaiOf = (h, p, f) => { const o = ovOf(h), x = o && o.nilai[p.id] && o.nilai[p.id][f]; if (h.nilai[p.id] && f in h.nilai[p.id] && ownWins(h, x)) return String(h.nilai[p.id][f] || ''); return x ? String(x.v || '') : String(p[f] || ''); };
const kelOf = (h, p) => { const o = ovOf(h), x = o && o.kel[p.id]; if ((p.id in h.kel) && ownWins(h, x)) return h.kel[p.id]; return x ? x.v : (p.hasil || ''); };
const nilaiLengkap = (h, ln, p) => (!ln.nilai || !!(nilaiOf(h, p, 'ut') || nilaiOf(h, p, 'up'))) && (!ln.hasil || !!kelOf(h, p));
const lapNama = (h, k, w, f) => { const o = ovOf(h), x = o && o.s[w] && o.s[w][f]; if (h.lapN[w] && f in h.lapN[w] && ownWins(h, x)) return String(h.lapN[w][f] || ''); return x ? String(x.v || '') : String(LAPK(k)[w + f] || ''); };
const kotaOf = (h, k) => { const o = ovOf(h), x = o && o.nKota; if (('nKota' in h.lapN) && ownWins(h, x)) return String(h.lapN.nKota || ''); return x ? String(x.v || '') : String(LAPK(k).nKota || ''); };
const materiOf = (h, k, d) => { const o = ovOf(h), x = o && o.materi[d]; if ((d in h.materi) && ownWins(h, x)) return String(h.materi[d] || ''); return x ? String(x.v || '') : String((LAPK(k).materi || {})[d] || ''); };
const MATERI_KAT = [
  { id: 'reg', judul: 'Regulasi Kebakaran (Kelas D)', grp: 'wasnaker', isi: ['Dasar-dasar dan kebijakan K3', 'K3 Penanggulangan Kebakaran', 'UU No 1 Tahun 1970', 'Kepmenaker No 186 Tahun 1999', 'Dasar-dasar pengaman kebakaran', 'Teori Api dan Anatomi Kebakaran'] },
  { id: 'teori', judul: 'Teori Kebakaran (Kelas D)', grp: 'ahli', isi: ['Prinsip-prinsip pencegahan', 'Teknik Pemadaman Kebakaran', 'Sistem Proteksi Pasif (Komprehensif dll)', 'Sistem Proteksi Aktif (Apar dan Hydrant)'] },
  // Pesawat Angkat & Angkut (isi = poin di Absensi Narasumber; jadwal rundown disusun di website dari materi yang sama)
  { id: 'ang1', judul: 'Regulasi Pesawat Angkat', grp: 'wasnaker', isi: ['Kebijakan dan Dasar-dasar K3', 'Undang-Undang No.1 Tahun 1970', 'Permenaker No.8 Tahun 2020'] },
  { id: 'prakw', judul: 'Praktek', grp: 'wasnaker', isi: ['Praktek'] },
  { id: 'crane2', judul: 'Crane Teknis 1', grp: 'praktisi', isi: ['Pengetahuan Dasar Crane', 'Pengetahuan Dasar Kelistrikan', 'Pengetahuan Job Safety Analysis', 'Sebab-Sebab Kecelakaan', 'Pengetahuan Tenaga Penggerak & Hidrolik Penggerak', 'Perangkat Keselamatan Kerja (Safety Devices)'] },
  { id: 'crane3', judul: 'Crane Teknis 2', grp: 'praktisi', isi: ['Faktor-faktor yang mempengaruhi beban kerja aman', 'Pengoperasian Aman', 'Perawatan dan Pemeriksaan Harian', 'Stabilitas'] },
  { id: 'crane4', judul: 'Crane Teknis 3 (Kelas 1)', grp: 'praktisi', isi: ['Tali Kawat Baja (08.00 – 10.30)', 'Alat Bantu Angkat dan Pengikatan (10.30 – 13.45)', 'Menghitung Berat Beban (13.45 – 16.15)'] },
  { id: 'conv2', judul: 'Conveyor Teknis 1', grp: 'praktisi', isi: ['Pengoperasian aman pada belt Conveyor', 'Pengetahuan Job Safety Analysis', 'Sebab-Sebab Kecelakaan', 'Pengetahuan Tenaga Penggerak & Hidrolik Penggerak', 'Perangkat Keselamatan Kerja (Safety Devices)'] },
  { id: 'prakp', judul: 'Conveyor Teknis 2 (Praktek)', grp: 'praktisi', isi: ['Praktek'] },
  { id: 'eval', judul: 'Evaluasi Teori', grp: 'kemnaker', isi: ['Evaluasi Teori'] },
  { id: 'rig1', judul: 'Rigger Teknis 1', grp: 'praktisi', isi: ['Pengetahuan Tali Kawat Baja', 'Pengetahuan Alat Bantu angkat', 'Menghitung Berat Beban', 'Pengetahuan Cara Mengikat', 'Sebab-Sebab Kecelakaan Kerja dan Penanganan-nya', 'Tanda Isyarat atau Aba-Aba Pengoperasian Keran Angkat', 'Pengoperasian Aman', 'Pemeriksaan dan Perawatan Harian'] },
  { id: 'rig2', judul: 'Rigger Teknis 2', grp: 'wasnaker', isi: ['Pengetahuan Dasar Keran Angkat Hoist Crane', 'Pengetahuan Dasar Kelistrikan', 'Pengetahuan Tali Kawat Baja', 'Pengetahuan Alat Bantu Angkat'] },
  { id: 'rigp', judul: 'Evaluasi Praktek', grp: 'praktisi', isi: ['Evaluasi Praktek'] },
  { id: 'evalw', judul: 'Evaluasi Teori', grp: 'wasnaker', isi: ['Evaluasi Teori'] },
  { id: 'kim1', judul: "Kimia 1 – Dasar & Penyimpanan Bahan Kimia", grp: 'harso', isi: ["Pengetahuan Dasar Bahan Kimia Berbahaya", "Penyimpanan dan penanganan Bahan Kimia Berbahaya"] },
  { id: 'kim2', judul: "Kimia 2 – Hygiene Industri & Toksikologi", grp: 'harso', isi: ["Hygiene Industry", "Pengantar Toksikologi Industri", "PAK Paparan Faktor Kimia"] },
  { id: 'kim3', judul: "Kimia 3 – Inspeksi Fasilitas & Pengendalian Teknis", grp: 'harso', isi: ["Teknik dan Prosedur Inspeksi Fasilitas Kimia", "Pengendalian Teknis BKB"] },
  { id: 'kim4', judul: "Kimia 4 – LDKB & Tanggap Darurat Kimia", grp: 'harso', isi: ["Klasifikasi dan Komunikasi Bahaya Kimia (LDKB & LABEL)", "Tanggap Darurat Kimia"] },
  { id: 'kim5', judul: "Kimia 5 – Penilaian Resiko & Major Hazard", grp: 'harso', isi: ["Identifikasi Bahaya & Penilaian Resiko Faktor Kimia", "Pengendalian Bahaya Besar / Major Hazard Control"] },
  { id: 'kim6', judul: "Kimia 6 – Regulasi K3 Kimia", grp: 'dinas', isi: ["Undang-Undang No. 1 tahun 1970", "Kebijakan K3 Nasional", "Peraturan Perundang-Undangan K3 bidang Kimia di tempat kerja"] },
  { id: 'kim7', judul: "Kimia 7 – APD & Ruang Terbatas", grp: 'wendri', isi: ["Manajemen APD", "Prosedur K3 di Ruang Terbatas / Confined Space"] },
  { id: 'kim8', judul: "Kimia 8 – Korosi & Monitoring Kontaminan", grp: 'wendri', isi: ["Pencegahan Korosi", "Teknik & Methoda Monitoring & Analisa Kontaminan di Udara"] },
  { id: 'kim9', judul: "Kimia 9 – Kelembagaan K3 & SMK3", grp: 'elien', isi: ["Kelembagaan & Keahlian K3", "Pengenalan SMK3", "Audit SMK3"] },
  { id: 'kim10', judul: "Kimia 10 – P3K, Limbah & Audit SMK3", grp: 'elien', isi: ["P3K Kimia", "Pengelolaan Limbah Kimia Berbahaya", "Audit SMK3"] },
  { id: 'kim11', judul: "Kimia 11 – PKL & Laporan", grp: 'elien', isi: ["PKL", "Penyusunan Laporan"] },
  { id: 'kim12', judul: "Kimia 12 – Evaluasi & Seminar", grp: 'kemnaker', isi: ["Evaluasi", "Seminar"] },
  { id: 'prt1', judul: "Penyelamat RT 1 – Regulasi & Izin Kerja", grp: '*', isi: ["Peraturan Perundang-Undangan K3 Ruang Terbatas", "Dasar-Dasar K3 Ruang Terbatas", "Dasar K3 Ruang Terbatas", "Prosedur Ijin Kerja di Ruang Terbatas"] },
  { id: 'prt2', judul: "Penyelamat RT 2 – Tanggap Darurat, APD & Penyelamatan", grp: '*', isi: ["Prosedur Tanggap Darurat & Komunikasi di Ruang Terbatas", "P3K di Ruang Terbatas", "Alat Pelindung Diri/APD di Ruang Terbatas dan Alat Bantu Pernafasan", "Teknik Penyelamatan di Ruang Terbatas"] },
  { id: 'trt1', judul: "Teknisi RT 1 – Tanggap Darurat, APD & P3K", grp: '*', isi: ["Rencana Prosedur Tanggap Darurat & P3K", "Alat Pelindung Diri di Ruang Terbatas", "Teknik Penyelamatan di Ruang Terbatas", "Teknik P3K di Ruang Terbatas"] },
  { id: 'trt2', judul: "Teknisi RT 2 – Risiko Bahaya & Program Memasuki RT", grp: '*', isi: ["Karakteristik Bahan Kimia Berbahaya", "Identifikasi Resiko Bahaya Ruang Terbatas", "Program Memasuki Ruang Terbatas"] },
  { id: 'trt3', judul: "Teknisi RT 3 – Deteksi Gas & Log Out Tag Out", grp: '*', isi: ["Teknik Pengukuran dan Deteksi Gas Ruang Terbatas", "Prosedur Log Out Tag Out"] },
  { id: 'trt4', judul: "Teknisi RT 4 – Regulasi & Izin Kerja", grp: '*', isi: ["Peraturan Perundang-Undangan K3 Ruang Terbatas", "Dasar-Dasar K3 Ruang Terbatas", "Prosedur Ijin Kerja di Ruang Terbatas"] },
  { id: 'rtev', judul: "Evaluasi & Praktek (Ruang Terbatas)", grp: '*', isi: ["Evaluasi", "Praktek"] },
  { id: 'tdg1', judul: "Deteksi Gas 1", grp: '*', isi: ["Dasar-Dasar K3", "Kebijakan K3", "Peraturan Perundang-Undangan K3 Ruang Terbatas"] },
  { id: 'tdg2', judul: "Deteksi Gas 2", grp: '*', isi: ["Prosedur Ijin Kerja di Ruang Terbatas", "Karakteristik Gas Atmosfir", "Pengenalan Alat Deteksi Gas", "Metode Deteksi Gas Atmosfir"] },
  { id: 'tdg3', judul: "Deteksi Gas 3", grp: '*', isi: ["Evaluasi Online", "Evaluasi Praktek"] }
];
const nrAdmin = (k, key) => { const m = NRK_RE.exec(key); return m[1] ? (((LAPK(k).nrk || {})[m[1]] || {})[m[2]] || {}) : ((LAPK(k).nr || {})[key] || {}); };
const nrOf = (h, k, d, raw) => { const o = { kid: '', nama: '', nip: '', inst: '', mid: '', mtxt: '' }, own = (d in h.nr) ? h.nr[d] : null, ov = ovOf(h), xr = ov && ov.nr[d], base = nrAdmin(k, d); Object.keys(o).forEach(f => { const x = xr && xr[f]; let v; if (own && (f in own) && ownWins(h, x)) v = own[f]; else if (x) v = x.v; else v = own ? own[f] : base[f]; o[f] = String(v == null ? '' : v); }); const m = raw ? null : MATERI_KAT.find(x => x.id === o.mid); if (m) o.mtxt = m.isi.join('\n'); return o; };
const kelasArr = k => Array.isArray(k && k.kelas) ? k.kelas : Object.values((k && k.kelas) || {});
const urutKelas = (k, list) => { if (!k || !k.papa) return list; const ks = kelasArr(k), ki = p => { const i = ks.indexOf(p.kelas); return i < 0 ? 999 : i; }; return list.slice().sort((a, b) => ki(a) - ki(b)); };
const NR_KEY = /^(\d{4}-\d{2}-\d{2})(?:_(\d+))?$/, NR_MAX = 4, APP_VER = 'v54';
const kelasKey = l => 'k' + fnv(String(l)).split(':')[0];
const B3_REN = [['Petugas Penyelamat Ruang Terbatas', 'PETUGAS PENYELAMAT (RESCUE) RUANG TERBATAS']];
function b3Ren(h) {
  h.ren1 = 1;
  B3_REN.forEach(([o, n]) => {
    const op = kelasKey(o) + '~', np = kelasKey(n) + '~', mv = (obj, pre) => { if (!obj) return; Object.keys(obj).forEach(k => { if (k.startsWith(pre + op)) { const nk = pre + np + k.slice(pre.length + op.length); if (!(nk in obj)) obj[nk] = obj[k]; delete obj[k]; if (obj === h.nrs || obj === h.nr) h.dirty = true; } }); };
    mv(h.nr, ''); mv(h.nrs, ''); mv(h.nshared, ''); mv(h.naraSeen, ''); mv(h.sent, 'nr_');
    if (Array.isArray(h.gone)) h.gone = h.gone.map(k => (k.startsWith('nr_' + op) ? 'nr_' + np + k.slice(3 + op.length) : k));
    if (h.nrs) Object.keys(h.nrs).forEach(k => { if (k.startsWith(np)) delete (h.sent || {})['nr_' + k]; }); // dikirim ulang dengan kunci baru
  });
}
const NRK_RE = /^(?:(k[0-9a-z]+)~)?(.+)$/;
const papaOf = k => !!(k && k.papa && kelasArr(k).filter(Boolean).length);
const klOfP = (k, p) => kelasArr(k).includes(p.kelas) ? p.kelas : '';
const klLabel = kl => kl || 'Tanpa kelas';
const pesByKl = (k, kl) => { const ps = (k && k.peserta) || []; return kl == null ? ps : ps.filter(p => klOfP(k, p) === kl); };
const klGroups = k => { const ks = kelasArr(k).filter(Boolean), ps = (k && k.peserta) || [], g = ks.map(l => ({ kl: l, n: ps.filter(p => p.kelas === l).length })); const rest = ps.filter(p => !ks.includes(p.kelas)).length; if (rest) g.push({ kl: '', n: rest }); return g.filter(x => x.n); };
const curKl = k => (papaOf(k) && P.kl != null) ? P.kl : undefined;
const nrOffOf = (k, key) => !!((LAPK(k).nrOff || {})[key]);
const nrKeys = (h, k, d, pfx = '') => { // pfx = awalan alat ('' bila bukan PAPA); hasil = kunci lengkap (pfx + hari [+ _n])
  if (nrOffOf(k, pfx + d)) return [];
  const kk = pfx ? pfx.slice(0, -1) : '', adm = kk ? Object.keys((LAPK(k).nrk || {})[kk] || {}).map(x => pfx + x) : Object.keys(LAPK(k).nr || {});
  return [pfx + d, ...[...new Set([...adm, ...Object.keys(h.nr || {}), ...Object.keys(h.nrs || {})])].filter(x => { if (pfx ? !x.startsWith(pfx) : x.includes('~')) return false; const m = NR_KEY.exec(x.slice(pfx.length)); return m && m[1] === d && m[2] && !nrOffOf(k, x); }).sort((p, q) => +p.split('_').pop() - +q.split('_').pop())];
};
const fm = (iso, o) => new Intl.DateTimeFormat('id-ID', o).format(new Date(iso + 'T00:00:00'));
const tglPendek = i => fm(i, { day: 'numeric', month: 'short' });
function withKl(kl, fn) { const o = P.kl; P.kl = kl; try { return fn(); } finally { P.kl = o; } }
function lapCek(kid) {
  const k = KEGS[kid], h = hOf(kid), ln = LAPK(k), papa = papaOf(k), days = k.tgl || [];
  const grp = papa ? klGroups(k) : [{ kl: undefined, n: (k.peserta || []).length }], secs = [];
  const gl = g => papa ? klLabel(g.kl) : '', sfx = g => (g.kl == null ? '' : '~' + g.kl);
  const add = s => { s.kosong = !!s.kosong; s.pct = s.kosong ? 0 : (s.total ? s.ok / s.total : 1); s.st = s.kosong ? 'bad' : (s.ok >= s.total ? 'ok' : s.ok ? 'warn' : 'bad'); s.rows.sort((a, b) => (a.st === 'ok') - (b.st === 'ok')); secs.push(s); return s; };
  const base = (id, judul, to, g) => ({ id, judul, grp: g ? gl(g) : '', to, kl: g ? g.kl : null, ok: 0, total: 0, rows: [], info: [], kurang: '' });
  // 1. Daftar Hadir (TTD peserta)
  grp.forEach(g => {
    const ps = urutKelas(k, pesByKl(k, g.kl)), aktif = ps.filter(p => !isBatal(h, p)), s = base('abs' + sfx(g), 'Daftar Hadir (TTD peserta)', 'abs', g);
    aktif.forEach(p => {
      const need = days.filter(d => perluHari(h, p, d, days, k)), ch = need.map(d => ['Hari ' + (days.indexOf(d) + 1), sudahTtd(h, p, d) ? 'ok' : 'bad']), miss = ch.filter(c => c[1] === 'bad').length;
      s.total += need.length; s.ok += need.length - miss; s.rows.push({ t: p.nama, s: isRem(h, p) ? 'Remedial (TTD hari terakhir saja)' : '', st: miss ? 'bad' : 'ok', chips: ch });
    });
    if (ps.length > aktif.length) s.info.push(`${ps.length - aktif.length} peserta Cancel (tidak dihitung).`);
    if (!ps.length) s.kosong = true; else if (s.total > s.ok) s.kurang = `${s.total - s.ok} TTD belum`;
    add(s);
  });
  // 2. Dokumentasi Peserta (foto)
  const keys = fotoDua(k) ? ['foto', 'foto2'] : ['foto'];
  grp.forEach(g => {
    const ps = urutKelas(k, pesByKl(k, g.kl)), aktif = ps.filter(p => !isBatal(h, p)), s = base('dok' + sfx(g), 'Dokumentasi Peserta' + (keys.length > 1 ? ' (2 foto per peserta)' : ''), 'dok', g);
    aktif.forEach(p => {
      const th = keys.map((key, i) => { const own = h[key] && h[key][p.id]; return { pv: `p|${p.id}|${key}`, lb: keys.length > 1 ? 'Foto ' + (i + 1) : 'Foto', src: own || '', st: own ? 'own' : webF(p, key) ? 'web' : xF(h, p.id, key) ? 'x' : 'none' }; }), lengkap = th.every(t => t.st !== 'none');
      s.total++; if (lengkap) s.ok++; s.rows.push({ t: p.nama, st: lengkap ? 'ok' : 'bad', thumbs: th });
    });
    if (ps.length > aktif.length) s.info.push(`${ps.length - aktif.length} peserta Cancel (tidak dihitung).`);
    if (!ps.length) s.kosong = true; else if (s.total > s.ok) s.kurang = `${s.total - s.ok} peserta belum lengkap`;
    add(s);
  });
  // 3. Dokumentasi Harian
  if (ln.harian) {
    const s = base('dhr', 'Dokumentasi Harian', 'dhr', null); let satu = false;
    days.forEach((d, i) => {
      const m = materiOf(h, k, d).trim(), n = hfN(h, d), ok = !!m && n >= 1; if (n === 1) satu = true;
      s.total++; if (ok) s.ok++;
      s.rows.push({ t: `Hari ${i + 1} · ${tglPendek(d)}`, st: ok ? 'ok' : 'bad', s: m, chips: [['Materi', m ? 'ok' : 'bad'], [n + ' foto', n >= 2 ? 'ok' : n === 1 ? 'warn' : 'bad']], thumbs: (h.hfoto[d] || []).map(f => ({ pv: `d|${d}|${f.i}`, lb: 'Foto', src: f.u, st: 'own' })) });
    });
    if (satu) s.info.push('Disarankan 2 foto per hari (satu halaman laporan memuat 2 foto).');
    if (!days.length) s.kosong = true; else if (s.total > s.ok) s.kurang = `${s.total - s.ok} hari belum lengkap`;
    add(s);
  }
  // 4. Absensi Narasumber
  if (ln.nara) {
    const gn = (k.b3 && papa) ? grp : [{ kl: undefined }];
    gn.forEach(g => {
      const pf = (k.b3 && papa && g.kl) ? kelasKey(g.kl) + '~' : '', ds = k.b3 ? withKl(g.kl, () => absDays(k)) : days, s = base('nar' + (k.b3 && papa ? sfx(g) : ''), 'Absensi Narasumber', 'nar', k.b3 && papa ? g : null); let kosongMateri = 0;
      ds.forEach(d0 => {
        const i = days.indexOf(d0);
        nrKeys(h, k, d0, pf).forEach((key, n) => {
          const r = nrOf(h, k, key), ttd = nrTtd(h, key, k), nama = r.nama.trim(); if (n && !nama && !ttd) return; // baris tambahan yang kosong tidak dicetak
          const ok = !!nama && ttd, mat = !!(r.mid || r.mtxt.trim()); if (ok && !mat) kosongMateri++;
          s.total++; if (ok) s.ok++;
          s.rows.push({ t: `Hari ${i + 1}${n ? ' · narasumber ke-' + (n + 1) : ''} · ${tglPendek(d0)}`, s: nama ? nama + (r.inst ? ' · ' + r.inst : '') : 'Narasumber belum dipilih', st: ok ? 'ok' : 'bad', chips: [['Nama', nama ? 'ok' : 'bad'], ['Materi', mat ? 'ok' : 'warn'], ['TTD', ttd ? 'ok' : 'bad']] });
        });
      });
      if (kosongMateri) s.info.push(`${kosongMateri} baris belum memilih materi (materi kosong di laporan).`);
      if (!s.total) s.kosong = true; else if (s.total > s.ok) s.kurang = `${s.total - s.ok} hari belum lengkap`;
      add(s);
    });
  }
  // 5. Nilai & Kelulusan
  if (ln.nilai || ln.hasil) grp.forEach(g => {
    const ps = urutKelas(k, pesByKl(k, g.kl)), aktif = ps.filter(p => !isBatal(h, p)), s = base('nil' + sfx(g), 'Nilai & Kelulusan', 'nil', g);
    aktif.forEach(p => {
      const ok = nilaiLengkap(h, ln, p), ut = nilaiOf(h, p, 'ut'), up = nilaiOf(h, p, 'up'), kv = kelOf(h, p), ch = [];
      if (ln.nilai) { ch.push(['Teori ' + (ut || '–'), ut ? 'ok' : 'bad']); ch.push(['Praktek ' + (up || '–'), up ? 'ok' : 'warn']); }
      if (ln.hasil) ch.push([kv === 'lulus' ? 'Lulus' : kv === 'tidak' ? 'Tidak lulus' : 'Belum diisi', kv ? 'ok' : 'bad']);
      s.total++; if (ok) s.ok++; s.rows.push({ t: p.nama, st: ok ? 'ok' : 'bad', chips: ch });
    });
    if (ps.length > aktif.length) s.info.push(`${ps.length - aktif.length} peserta Cancel (otomatis ditulis CANCEL).`);
    if (!ps.length) s.kosong = true; else if (s.total > s.ok) s.kurang = `${s.total - s.ok} peserta belum terisi`;
    add(s);
  });
  // 6. Penandatangan Daftar Nilai
  if (ln.nilai) {
    const s = base('ttn', 'Penandatangan Daftar Nilai', 'ttn', null), jab = x => String(ln[x] || '').replace(/\n/g, ' ') || (x === 's1jab' ? 'Pengawas' : 'Ahli K3');
    [['Kota (baris tanggal)', kotaOf(h, k).trim()], ['Nama ' + jab('s1jab'), lapNama(h, k, 's1', 'nama').trim()], ['TTD ' + jab('s1jab'), nTtd(h, 1, k)], ['Nama ' + jab('s2jab'), lapNama(h, k, 's2', 'nama').trim()], ['TTD ' + jab('s2jab'), nTtd(h, 2, k)]]
      .forEach(([t, v]) => { s.total++; if (v) s.ok++; s.rows.push({ t, st: v ? 'ok' : 'bad', s: typeof v === 'string' ? v : '' }); });
    if (s.total > s.ok) s.kurang = `${s.total - s.ok} isian belum`;
    add(s);
  }
  // 7. TTD PIC
  { const s = base('pic', 'TTD PIC', 'pic', null), ok = ttdOrgOk(h, k), dari = h.ttdPic ? '' : k.ttdWeb ? 'sudah ada (website)' : xPic(h) ? 'sudah ada (PIC lain)' : '';
    s.total = 1; s.ok = ok ? 1 : 0; s.rows.push({ t: 'Tanda tangan PIC kegiatan', s: dari || (ok ? 'Sudah ditandatangani' : ''), st: ok ? 'ok' : 'bad', thumbs: h.ttdPic ? [{ pv: '', lb: 'TTD', src: h.ttdPic, st: 'own', nopv: true }] : [] });
    if (!ok) s.kurang = 'belum ditandatangani'; add(s); }
  const nOk = secs.filter(s => s.st === 'ok').length, all = nOk === secs.length, avg = secs.reduce((a, s) => a + s.pct, 0) / (secs.length || 1);
  return { secs, nOk, all, pct: all ? 100 : Math.min(99, Math.floor(avg * 100)) };
}
window.PicProgres = {
  hitung(k, hasil) { // k = kegiatan (harus ada k.id); hasil = { uid: dh_hasil/{id}/{uid} } dari semua akun PIC
    const kid = k.id; KEGS = { [kid]: k }; H = {}; OH = { [kid]: hasil || {} }; OHV++; OVC.clear(); P = { kl: null };
    return lapCek(kid);
  }
};
})();
