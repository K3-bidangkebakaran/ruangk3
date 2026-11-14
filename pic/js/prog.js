/* DIBUAT OTOMATIS oleh pic/tools/build-prog.js dari pic/js/app.js — JANGAN diedit manual (ubah kode di app.js lalu jalankan ulang).
   Isi: hitungan kelengkapan laporan yang SAMA dengan layar "Pratinjau Laporan" di APK PIC. Dipakai panel admin web untuk pop up progres kegiatan.
   Pakai:  PicProgres.hitung(kegiatan, { uidPIC: hasilDariFirebase, ... })  ->  { secs, nOk, all, pct }   (kegiatan = isi dh_kegiatan/{id} + id) */
(function () {
"use strict";
let ME = { uid: "_admin", nama: "Admin" }, KEGS = {}, H = {}, P = { kl: null }, OH = {}, OHV = 0; const OVC = new Map(), KIDC = new WeakMap();
const fnv = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + ':' + str.length; };
const newH = () => ({ batal: {}, remedial: {}, hadir: {}, foto: {}, foto2: {}, foto3: {}, foto4: {}, foto5: {}, ttdPic: '', ttdPicNama: '', upd: 0, rev: 0, dirty: false, sent: {}, nilai: {}, nlT: {}, kel: {}, lapN: {}, materi: {}, hfoto: {}, n1: '', n2: '', gone: [], nr: {}, nrs: {}, nshared: {}, naraSeen: {}, tshared: {}, ttdpSeen: {}, tnShared: {}, selesai: false });
function kidOf(h) { let k = KIDC.get(h); if (k && H[k] === h) return k; k = Object.keys(H).find(x => H[x] === h) || ''; if (k) KIDC.set(h, k); return k; }
function ovBuild(kid) {
  const m = OH[kid]; if (!m || !ME) return null;
  const list = Object.entries(m).filter(([u, x]) => u !== ME.uid && x && typeof x === 'object').sort((a, b) => (a[1].upd || 0) - (b[1].upd || 0));
  if (!list.length) return null;
  const o = { batal: {}, remedial: {}, nilai: {}, kel: {}, s: { s1: {}, s2: {} }, nKota: null, materi: {}, nr: {}, hadir: {}, foto: {}, foto2: {}, foto3: {}, foto4: {}, foto5: {}, ttdPic: false, ttdNama: '', nrT: {}, n1: false, n2: false, hf: {} };
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
    FOTO_KEYS.slice(1).forEach(fk => Object.keys(x[fk] || {}).forEach(pid => { o[fk][pid] = 1; }));
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
const xF = (h, pid, key) => { const o = ovOf(h); return !!(o && o[key] && o[key][pid]); };
const xPic = h => { const o = ovOf(h); return !!(o && o.ttdPic); };
const xNrT = (h, key) => { const o = ovOf(h); return !!(o && o.nrT[key]); };
const nrTtdSrc = (h, k, key) => (h.nrs && h.nrs[key]) ? 'own' : xNrT(h, key) ? 'pic' : (k && nrAdmin(k, key).ttd) ? 'web' : '';
const nrOnline = r => !!r && /kemnaker/i.test([r.kid, r.nama, r.inst].join(' '));
const nrTtd = (h, key, k) => !!nrTtdSrc(h, k, key) || nrOnline(nrOf(h, k, key));
const nTtdSrc = (h, k, n) => h['n' + n] ? 'own' : (ovOf(h) && ovOf(h)['n' + n]) ? 'pic' : (k && LAPK(k)['s' + n + 'ttd']) ? 'web' : '';
const nTtd = (h, n, k) => !!nTtdSrc(h, k, n);
const hfN = (h, d) => ((h.hfoto && h.hfoto[d]) || []).length + (() => { const o = ovOf(h), st = o && o.hf[d]; return st ? st.size : 0; })();
const isBatal = (h, p) => { const o = ovOf(h), x = o && o.batal[p.id]; if ((p.id in h.batal) && ownWins(h, x)) return !!h.batal[p.id]; return x ? x.v : !!p.batal; };
const isRem = (h, p) => { if (isBatal(h, p)) return false; const o = ovOf(h), x = o && o.remedial[p.id]; if (h.remedial && (p.id in h.remedial) && ownWins(h, x)) return !!h.remedial[p.id]; return x ? x.v : !!p.remedial; };
const webT = (p, d) => !!(p && p.wt && p.wt[d]);
const sudahTtd = (h, p, d) => !!(h.hadir[p.id] && h.hadir[p.id][d]) || webT(p, d) || xT(h, p.id, d);
const webF = (p, key) => !!(p && p[wfKey(key)]);
const hariPeserta = (k, p) => { const hk = k && k.hk && p && p.kelas ? k.hk[kelasKey(p.kelas)] : null, a = hk ? (Array.isArray(hk) ? hk : Object.values(hk)) : null; return a && a.length ? a : ((k && k.tgl) || []); };
const perluHari = (h, p, d, days, k) => { if (isBatal(h, p)) return false; const pd = k ? hariPeserta(k, p) : days; return pd.includes(d) && (!isRem(h, p) || d === pd[pd.length - 1]); };
const absDays = k => { const kl = k && curKl(k), hk = kl && k.hk && k.hk[kelasKey(kl)], a = hk ? (Array.isArray(hk) ? hk : Object.values(hk)) : null; return a && a.length ? a : ((k && k.tgl) || []); };
const ttdOrgOk = (h, k) => !!h.ttdPic || !!(k && k.ttdWeb) || xPic(h);
const hOf = kid => { const h = (H[kid] = H[kid] || newH()); if (!h.ren1) b3Ren(h); FOTO_KEYS.slice(1).forEach(f => { if (!h[f]) h[f] = {}; }); ['nilai', 'nlT', 'kel', 'lapN', 'materi', 'hfoto'].forEach(f => { if (!h[f]) h[f] = {}; }); if (!h.gone) h.gone = []; if (!h.nr) h.nr = {}; if (!h.nrs) h.nrs = {}; if (!h.nshared) h.nshared = {}; if (!h.naraSeen) h.naraSeen = {}; if (!h.tshared) h.tshared = {}; if (!h.ttdpSeen) h.ttdpSeen = {}; if (!h.tnShared) h.tnShared = {}; if (h.n1 == null) h.n1 = ''; if (h.n2 == null) h.n2 = ''; return h; };
const FOTO_KEYS = ['foto', 'foto2', 'foto3', 'foto4', 'foto5'], KELAS_FOTO5 = 'ahli k3 muda lingkungan kerja';
const fotoNo = key => (key === 'foto' ? 1 : +String(key).slice(4) || 1), fMk = key => 'f' + (key === 'foto' ? '' : key.slice(4)) + '_', wfKey = key => 'wf' + (key === 'foto' ? '' : key.slice(4));
const FOTO_SATU = [{ kelas: 'teknisi ruang terbatas', awal: '2026-10-29', akhir: '2026-11-02' }, { kelas: 'deteksi gas', awal: '2026-10-24', akhir: '2026-10-26' }, { kelas: 'petugas k3 kimia', awal: '2026-10-27', akhir: '2026-11-01' }];
const fotoSatu = k => { if (!k || !(k.b3 || k.jenis === 'b3')) return false; const h = (k.tgl || []).filter(Boolean).slice().sort(); if (!h.length) return false; const ks = kelasArr(k).map(x => String(x || '').replace(/\s+/g, ' ').trim().toLowerCase()); return FOTO_SATU.some(r => h[0] >= r.awal && h[h.length - 1] <= r.akhir && ks.some(x => x.includes(r.kelas))); };
const fotoDua = k => !!(k && !fotoSatu(k) && (k.damkar || k.b3));
const fotoN = (k, p) => { if (fotoSatu(k)) return 1; if (k && k.b3) { const ks = k.kelas ? (Array.isArray(k.kelas) ? k.kelas : Object.values(k.kelas)) : [], kl = String((p && p.kelas) || '').replace(/\s+/g, ' ').trim() || (ks.length === 1 ? ks[0] : ''); if (kl.toLowerCase() === KELAS_FOTO5) return 5; } return fotoDua(k) ? 2 : 1; };
const fotoKeysP = (k, p) => FOTO_KEYS.slice(0, fotoN(k, p));
const LAPK = k => ({ ...((k && k.lap) || {}), evalT: false });
const AHLI_RX = /ahli[^()/]*(muda[^()/]*(lingkungan|\blk\b)|lingkungan\s*kerja|pesawat\s*angkat|pesawat\s*angkut|\bpapa\b|kebakaran|damkar|pesawat\s*tenaga|\bptp\b)/i;
const semPic = (k, ln) => ln && ln.sem != null ? !!ln.sem : AHLI_RX.test([k && k.nama, ...kelasArr(k || {})].join(' | '));
const nilaiOf = (h, p, f) => { const o = ovOf(h), x = o && o.nilai[p.id] && o.nilai[p.id][f]; if (h.nilai[p.id] && f in h.nilai[p.id] && ownWins(h, x)) return String(h.nilai[p.id][f] || ''); return x ? String(x.v || '') : String(p[f] || ''); };
const kelOf = (h, p) => { const o = ovOf(h), x = o && o.kel[p.id]; if ((p.id in h.kel) && ownWins(h, x)) return h.kel[p.id]; return x ? x.v : (p.hasil || ''); };
const nilaiLengkap = (h, ln, p) => (!ln.nilai || !!(nilaiOf(h, p, 'ut') || nilaiOf(h, p, 'up'))) && (!(ln.nilai && ln.evalT) || !!nilaiOf(h, p, 'et')) && (!ln.hasil || !!kelOf(h, p));
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
  { id: 'tdg3', judul: "Deteksi Gas 3", grp: '*', isi: ["Evaluasi Online", "Evaluasi Praktek"] },
  { id: 'lkm1', judul: "Ahli K3 Muda LK Hari 1 – Kebijakan & Risiko Kesehatan", grp: '*', isi: ["Kebijakan umum pelaksanaan pembinaan dan pengawasan K3 & Persyaratan K3 Lingkungan Kerja", "Pengenalan risiko Kesehatan dan promosi kesehatan"] },
  { id: 'lkm2', judul: "Ahli K3 Muda LK Hari 2 – Hygiene Industri & Ventilasi", grp: '*', isi: ["Program Hygiene Industri: Antisipasi, rekognisi, evaluasi dan pengendalian bahaya di tempat kerja", "Ventilasi Industri"] },
  { id: 'lkm3', judul: "Ahli K3 Muda LK Hari 3 – Materi SKKNI", grp: '*', isi: ["Materi SKKNI"] },
  { id: 'lkm4', judul: "Ahli K3 Muda LK Hari 4 – Sistem Informasi & Sampel Ergonomi/Psikologi", grp: '*', isi: ["Sistim informasi lingkungan kerja", "Teknik pengumpulan sampel faktor ergonomi dan psikologi", "Praktek pengumpulan sampel faktor ergonomi dan psikologi"] },
  { id: 'lkm5', judul: "Ahli K3 Muda LK Hari 5 – Sampel Fisika/Kimia/Biologi, PKL & Pelaporan", grp: '*', isi: ["Teknik pengumpulan sampel faktor fisika, kimia, dan biologi", "PKL Pengukuran Ventilasi Industri, pengumpulan sampel faktor fisika, kimia, biologi", "Penyusunan Pelaporan Hasil Pengukuran sesuai Permenaker No. 5 Tahun 2018"] },
  { id: 'lkm6', judul: "Ahli K3 Muda LK Hari 6 – Uji Kompetensi", grp: '*', isi: ["Uji Kompetensi"] },
  { id: 'lkm7', judul: "Ahli K3 Muda LK Hari 7 – Evaluasi Teori & Seminar", grp: '*', isi: ["Evaluasi Teori", "Seminar Hasil Pengukuran dan Evaluasi Praktek"] },
  // Ahli K3 Pesawat Tenaga dan Produksi (PTP): 26 hari (salinan dari website, tanpa jadwal sesi)
  {"id": "ptp1", "judul": "Ahli K3 PTP Hari 1 – UU. No. 1 Tahun 1970, Tentang Keselamatan Kerja dst.", "grp": "*", "isi": ["UU. No. 1 Tahun 1970, Tentang Keselamatan Kerja", "Permen No. 38 / 2016 Tentang Pesawat Tenaga dan Produksi"]},
  {"id": "ptp2", "judul": "Ahli K3 PTP Hari 2 – Kebijakan K3 & Job Safety Analysis", "grp": "*", "isi": ["Kebijakan K3", "Job Safety Analysis"]},
  {"id": "ptp3", "judul": "Ahli K3 PTP Hari 3 – Sistem Manajemen K3 & Investigasi Kecelakaan Kerja", "grp": "*", "isi": ["Sistem Manajemen K3", "Investigasi Kecelakaan Kerja"]},
  {"id": "ptp4", "judul": "Ahli K3 PTP Hari 4 – Jenis-Jenis Mesin Perkakas dan Produksi serta Perlengkapannya", "grp": "*", "isi": ["Jenis-Jenis Mesin Perkakas dan Produksi serta Perlengkapannya"]},
  {"id": "ptp5", "judul": "Ahli K3 PTP Hari 5 – Jenis-Jenis Penggerak Mula termasuk Transmisi Tenaga Mekanik dan Perlengkapannya", "grp": "*", "isi": ["Jenis-Jenis Penggerak Mula termasuk Transmisi Tenaga Mekanik dan Perlengkapannya"]},
  {"id": "ptp6", "judul": "Ahli K3 PTP Hari 6 – Pengelasan dan Pengujian Tidak Merusak (Non Destructive Test)", "grp": "*", "isi": ["Pengelasan dan Pengujian Tidak Merusak (Non Destructive Test)"]},
  {"id": "ptp7", "judul": "Ahli K3 PTP Hari 7 – Jenis-Jenis Tanur (Furnace), Kiln dan Perlengkapannya", "grp": "*", "isi": ["Jenis-Jenis Tanur (Furnace), Kiln dan Perlengkapannya"]},
  {"id": "ptp8", "judul": "Ahli K3 PTP Hari 8 – Kelistrikan dan Alat Kontrol Otomatis", "grp": "*", "isi": ["Kelistrikan dan Alat Kontrol Otomatis"]},
  {"id": "ptp9", "judul": "Ahli K3 PTP Hari 9 – Pemeriksaan/Pengujian Tanur (Furnace) dan Kiln", "grp": "*", "isi": ["Pemeriksaan/Pengujian Tanur (Furnace) dan Kiln"]},
  {"id": "ptp10", "judul": "Ahli K3 PTP Hari 10 – Pemeriksaan/Pengujian Penggerak Mula termasuk Transmisi Tenaga Mekanik", "grp": "*", "isi": ["Pemeriksaan/Pengujian Penggerak Mula termasuk Transmisi Tenaga Mekanik"]},
  {"id": "ptp11", "judul": "Ahli K3 PTP Hari 11 – Teknik Pondasi & Pemeriksaan dan Pengujian Pondasi", "grp": "*", "isi": ["Teknik Pondasi", "Pemeriksaan dan Pengujian Pondasi"]},
  {"id": "ptp12", "judul": "Ahli K3 PTP Hari 12 – Pemeriksaan/Pengujian Mesin Perkakas dan Produksi", "grp": "*", "isi": ["Pemeriksaan/Pengujian Mesin Perkakas dan Produksi"]},
  {"id": "ptp13", "judul": "Ahli K3 PTP Hari 13 – Penyusunan Inspection Test Plan (ITP)", "grp": "*", "isi": ["Penyusunan Inspection Test Plan (ITP)"]},
  {"id": "ptp14", "judul": "Ahli K3 PTP Hari 14 – Dasar - Dasar Penilaian Perhitungan Konstruksi Pesawat Tenaga dan Produksi (Standar)", "grp": "*", "isi": ["Dasar - Dasar Penilaian Perhitungan Konstruksi Pesawat Tenaga dan Produksi (Standar)"]},
  {"id": "ptp15", "judul": "Ahli K3 PTP Hari 15 – Dasar - Dasar Penilaian Perhitungan Konstruksi Pesawat Tenaga dan Produksi (Standar)", "grp": "*", "isi": ["Dasar - Dasar Penilaian Perhitungan Konstruksi Pesawat Tenaga dan Produksi (Standar)"]},
  {"id": "ptp16", "judul": "Ahli K3 PTP Hari 16 – Dasar - Dasar Penilaian Perhitungan Konstruksi Pesawat Tenaga dan Produksi (Standar) dst.", "grp": "*", "isi": ["Dasar - Dasar Penilaian Perhitungan Konstruksi Pesawat Tenaga dan Produksi (Standar)", "Mekanikal Teknik Terapan/ Elemen Mesin"]},
  {"id": "ptp17", "judul": "Ahli K3 PTP Hari 17 – Membaca Gambar Teknik & Proses Pembuatan, Pemasangan dan Perbaikan/Modifikasi", "grp": "*", "isi": ["Membaca Gambar Teknik", "Proses Pembuatan, Pemasangan dan Perbaikan/Modifikasi"]},
  {"id": "ptp18", "judul": "Ahli K3 PTP Hari 18 – Pengetahuan Bahan & Korosi dan Pencegahannya", "grp": "*", "isi": ["Pengetahuan Bahan", "Korosi dan Pencegahannya"]},
  {"id": "ptp19", "judul": "Ahli K3 PTP Hari 19 – Praktek Kerja Lapangan I (Mesin Penggerak Mula)", "grp": "*", "isi": ["Praktek Kerja Lapangan I (Mesin Penggerak Mula)"]},
  {"id": "ptp20", "judul": "Ahli K3 PTP Hari 20 – Praktek Kerja Lapangan II (Mesin Perkakas dan Produksi)", "grp": "*", "isi": ["Praktek Kerja Lapangan II (Mesin Perkakas dan Produksi)"]},
  {"id": "ptp21", "judul": "Ahli K3 PTP Hari 21 – Praktek Kerja Lapangan III (Furnace / Kiln)", "grp": "*", "isi": ["Praktek Kerja Lapangan III (Furnace / Kiln)"]},
  {"id": "ptp22", "judul": "Ahli K3 PTP Hari 22 – Penyusunan Laporan Riksa Uji", "grp": "*", "isi": ["Penyusunan Laporan Riksa Uji"]},
  {"id": "ptp23", "judul": "Ahli K3 PTP Hari 23 – Penyusunan Laporan Riksa Uji", "grp": "*", "isi": ["Penyusunan Laporan Riksa Uji"]},
  {"id": "ptp24", "judul": "Ahli K3 PTP Hari 24 – Ujian Tulis Online di Teman K3", "grp": "*", "isi": ["Ujian Tulis Online di Teman K3"]},
  {"id": "ptp25", "judul": "Ahli K3 PTP Hari 25 – Seminar & Interview", "grp": "*", "isi": ["Seminar", "Interview"]},
  {"id": "ptp26", "judul": "Ahli K3 PTP Hari 26 – Penyusunan OJT", "grp": "*", "isi": ["Penyusunan OJT"]}
];
const nrAdmin = (k, key) => { const m = NRK_RE.exec(key); return m[1] ? (((LAPK(k).nrk || {})[m[1]] || {})[m[2]] || {}) : ((LAPK(k).nr || {})[key] || {}); };
const nrOf = (h, k, d, raw) => { const o = { kid: '', nama: '', nip: '', inst: '', mid: '', mtxt: '' }, own = (d in h.nr) ? h.nr[d] : null, ov = ovOf(h), xr = ov && ov.nr[d], base = nrAdmin(k, d); Object.keys(o).forEach(f => { const x = xr && xr[f]; let v; if (own && (f in own) && ownWins(h, x)) v = own[f]; else if (x) v = x.v; else v = own ? own[f] : base[f]; o[f] = String(v == null ? '' : v); }); const m = raw ? null : MATERI_KAT.find(x => x.id === o.mid); if (m) o.mtxt = m.isi.join('\n'); return o; };
const kelasArr = k => Array.isArray(k && k.kelas) ? k.kelas : Object.values((k && k.kelas) || {});
const urutKelas = (k, list) => { if (!k || !k.papa) return list; const ks = kelasArr(k), ki = p => { const i = ks.indexOf(p.kelas); return i < 0 ? 999 : i; }; return list.slice().sort((a, b) => ki(a) - ki(b)); };
const NR_KEY = /^(\d{4}-\d{2}-\d{2})(?:_(\d+))?$/, NR_MAX = 4, APP_VER = 'v86';
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
  const nMax = Math.max(1, ...(k.peserta || []).map(p => fotoN(k, p)));
  grp.forEach(g => {
    const ps = urutKelas(k, pesByKl(k, g.kl)), aktif = ps.filter(p => !isBatal(h, p)), s = base('dok' + sfx(g), 'Dokumentasi Peserta' + (nMax > 1 ? ` (${Math.max(1, ...ps.map(p => fotoN(k, p)))} foto per peserta)` : ''), 'dok', g);
    aktif.forEach(p => {
      const keys = fotoKeysP(k, p), th = keys.map((key, i) => { const own = h[key] && h[key][p.id]; return { pv: `p|${p.id}|${key}`, lb: keys.length > 1 ? 'Foto ' + (i + 1) : 'Foto', src: own || '', st: own ? 'own' : webF(p, key) ? 'web' : xF(h, p.id, key) ? 'x' : 'none' }; }), lengkap = isRem(h, p) || th.every(t => t.st !== 'none');
      s.total++; if (lengkap) s.ok++; s.rows.push({ t: p.nama, s: isRem(h, p) ? 'DI BATCH SEBELUMNYA (remedial)' : '', st: lengkap ? 'ok' : 'bad', thumbs: th });
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
      if (ln.nilai) { ch.push(['Teori ' + (ut || '–'), ut ? 'ok' : 'bad']); ch.push(['Praktek ' + (up || '–'), up ? 'ok' : 'warn']); if (semPic(k, ln)) { const sm = nilaiOf(h, p, 'sm'); ch.push(['Seminar ' + (sm || '–'), sm ? 'ok' : 'warn']); } if (ln.evalT) { const et = nilaiOf(h, p, 'et'); ch.push(['Evaluasi ' + (et || '–'), et ? 'ok' : 'bad']); } }
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
