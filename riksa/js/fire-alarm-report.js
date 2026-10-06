/* ===== Generator Laporan Riksa Uji Instalasi Alarm Kebakaran Otomatis / Fire Alarm (.docx) =====
   Acuan: Permenaker PER.02/MEN/1983 (Instalasi Alarm Kebakaran Otomatis), SNI 03-3985-2000, PUIL 2011.
   RF.buildFireAlarm(F, docx) -> docx.Document  (F = data modul fire alarm + pjk3 + klien)
   Susunan mengikuti "Template Laporan Riksa Uji Fire Alarm.docx": Bab I–VII + Lampiran A–C. */
const RF = (() => {
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const LABEL = { M: 'Memenuhi', C: 'Catatan', T: 'Tidak' };
  const FILL = { M: 'E2F0D9', C: 'FFF2CC', T: 'F8CBAD' };

  /* ---------- jenis detektor & butir penempatan per zona ---------- */
  const JENIS_OPT = ['Asap (fotolistrik)', 'Asap (ionisasi)', 'Panas (tetap)', 'Panas (rate-of-rise)', 'Nyala api (UV / IR)', 'Beam (asap)', 'Aspirating (ASD)', 'Gas', 'Lainnya'];
  const grp = (j) => /^Panas/.test(j || '') ? 'panas' : /^Asap/.test(j || '') ? 'asap' : /^Nyala/.test(j || '') ? 'api' : 'lain';
  const GRP_LABEL = { panas: 'Panas (tetap / rate-of-rise)', asap: 'Asap (fotolistrik / ionisasi)', api: 'Nyala api (UV / IR)', lain: 'Lain-lain (beam / aspirating / gas)' };
  const GRP_TEST = { panas: 'Heat tester', asap: 'Smoke tester / aerosol', api: 'Flame simulator', lain: 'Sesuai pabrikan' };
  const PLC_ITEMS = [
    'Jarak antar detektor dan luas pemantauan tidak melebihi batas untuk jenis dan tinggi plafon',
    'Jarak detektor ke dinding, sekat dan balok sesuai ketentuan',
    'Jarak detektor dari lubang AC / diffuser dan kipas memadai',
    'Detektor tidak terhalang rak, lampu, kabel, pipa atau barang simpanan',
    'Detektor di ruang plafon (plenum) / bawah lantai palsu terpasang bila ada bahan mudah terbakar atau kabel',
    'Jenis detektor sesuai jenis bahaya ruang (mis. panas di dapur / ruang genset)',
    'Detektor bersih: tidak dicat, tidak tertutup plastik / debu; lampu indikator berfungsi',
    'Semua area terlindungi (ruang panel, shaft, plafon, gudang, tangga) sesuai gambar zona',
    'Satu zona tidak melintasi lantai dan luas zona tidak melebihi batas',
  ];
  const PLC_CRIT = [0, 3, 5, 7]; // ✗ pada butir ini = tidak memenuhi; butir lain = catatan

  /* ---------- daftar butir baris (label tetap) ---------- */
  const DOK = [
    'Pengesahan / Surat Keterangan instalasi alarm kebakaran dan riksa uji sebelumnya',
    'Gambar terpasang (as built drawing) dan diagram zona',
    'Spesifikasi, katalog dan sertifikat produk (panel, detektor, MCP, bell)',
    'Petunjuk operasi dan pemeliharaan sistem',
    'Catatan pemeliharaan, uji berkala dan riwayat alarm (termasuk alarm palsu)',
    'Tindak lanjut syarat dari riksa uji sebelumnya',
    'Regu / petugas penanggulangan kebakaran terlatih (KEP.186/MEN/1999)',
  ];
  const PANEL = [
    'Lokasi panel mudah dicapai, terpantau petugas, dan terlindung dari kerusakan',
    'Kondisi normal: indikator daya (POWER/AC) menyala, tidak ada FAULT/TROUBLE',
    'Lamp test: seluruh lampu indikator dan buzzer panel berfungsi',
    'Jumlah dan nama zona di panel sesuai gambar; label zona jelas',
    'Tombol SILENCE, RESET, ACKNOWLEDGE dan DRILL berfungsi',
    'Tidak ada zona atau perangkat yang dinonaktifkan (disable) tanpa alasan',
    'Tanggal dan jam panel benar; catatan kejadian (event log) dapat dibaca',
    'Kondisi fisik panel: terkunci, kabel rapi, label terminal, bersih dari debu / serangga',
    'Panel repeater / annunciator menampilkan status yang sama dengan panel utama (bila ada)',
  ];
  const SUMBER = [
    ['Sumber utama dari panel distribusi dengan pengaman tersendiri, diberi label "ALARM KEBAKARAN – JANGAN DIMATIKAN"', 'Ada, berlabel'],
    ['Tegangan AC masuk panel (V)', '198 – 242 V'],
    ['Tegangan baterai kondisi normal / floating (V DC)', 'Sesuai pabrikan'],
    ['Tegangan baterai saat AC diputus dan alarm aktif (V DC)', 'Di atas batas minimum pabrikan'],
    ['Perpindahan otomatis ke baterai saat AC putus; indikator AC FAIL muncul tanpa reset', 'Otomatis, berfungsi'],
    ['Arus pengisian (charging) baterai (A)', 'Sesuai pabrikan'],
    ['Kondisi fisik baterai: tidak menggelembung, bocor atau berkarat; umur baterai (tahun)', 'Baik'],
  ];
  const MCP = [
    ['Jumlah MCP terpasang / diuji / berfungsi', 'Semua berfungsi'],
    ['Tinggi pemasangan MCP dari lantai (m)', '[… m]'],
    ['MCP berada di jalur keluar, mudah dilihat dan dijangkau; jarak tempuh ke MCP terdekat (m)', '≤ [… m]'],
    ['Pelindung, label dan petunjuk MCP jelas dan tidak rusak', 'Baik'],
    ['Jumlah dan sebaran alarm bell / horn / strobe; bunyi terdengar di seluruh area', 'Seluruh area'],
    ['Tingkat tekanan suara alarm terendah di area (dB(A))', '≥ [… dB(A)]'],
    ['Bunyi alarm kebakaran berbeda dari bel lain (bel kerja / tanda lain)', 'Berbeda, jelas'],
    ['Pengeras suara evakuasi / voice alarm, bila ada', 'Berfungsi'],
  ];
  const KABEL = [
    ['Jenis kabel: tahan api / berpelindung; dipasang dalam conduit atau tray', 'Sesuai standar'],
    ['Jalur kabel alarm terpisah dari kabel daya / tegangan tinggi', 'Terpisah'],
    ['Sambungan kabel hanya dalam junction box; kabel dan terminal berlabel', 'Rapi, berlabel'],
    ['Tahanan isolasi kabel loop / zona (MΩ)', '≥ 1 MΩ'],
    ['Tahanan loop / kawat kabel (Ω)', 'Sesuai batas pabrikan'],
    ['Resistor / perangkat ujung saluran (EOL) terpasang di tiap zona konvensional', 'Terpasang'],
    ['Tahanan pentanahan panel (Ω)', '≤ [… Ω]'],
    ['Gantungan / penyangga kabel kuat dan terlindung dari kerusakan mekanis', 'Baik'],
  ];
  const UJI = [
    ['Aktifkan satu detektor asap', 'Panel alarm; zona benar; buzzer dan bell aktif'],
    ['Aktifkan satu detektor panas', 'Panel alarm; zona benar; bell aktif'],
    ['Aktifkan satu MCP', 'Panel alarm; zona benar; bell aktif'],
    ['Aktifkan dua detektor (bila disetel cross-zone)', 'Alarm penuh dan perintah ke interface sesuai setelan'],
    ['Tekan SILENCE', 'Bell mati; indikator alarm tetap; alarm baru membunyikan lagi'],
    ['Tekan RESET setelah penyebab dihilangkan', 'Panel kembali normal'],
    ['Lepas satu detektor / buka kabel loop', 'Panel menampilkan TROUBLE dan zona; buzzer gangguan'],
    ['Hubung singkat kabel zona (bila memungkinkan)', 'Panel menampilkan alarm atau FAULT sesuai rancangan'],
    ['Ground fault', 'Panel menampilkan EARTH FAULT'],
    ['Putus sumber AC', 'Pindah ke baterai; AC FAIL tampil; sistem tetap siaga'],
    ['Buka rangkaian bell / sounder', 'Panel menampilkan gangguan rangkaian bell'],
    ['Fungsi DRILL / evakuasi', 'Seluruh bell aktif bersamaan'],
    ['Sinyal ke annunciator / pos pemantau / pemantau jarak jauh', 'Status tampil di semua lokasi pemantau'],
  ];
  const INTF = [
    ['Lift', 'Turun ke lantai dasar / posisi aman'],
    ['AHU / kipas ventilasi', 'Mati atau berubah mode sesuai rancangan'],
    ['Damper api / asap', 'Menutup'],
    ['Pintu tahan api / magnetic door holder', 'Terlepas dan menutup'],
    ['Pintu akses / kontrol pintu (access control)', 'Terbuka pada jalur evakuasi'],
    ['Kipas pressurized (tangga kebakaran)', 'Menyala'],
    ['Sinyal sprinkler (flow switch / tamper) dan pompa kebakaran', 'Terpantau di panel'],
    ['Sistem pemadam gas / agen bersih', 'Sinyal pelepasan dan tunda sesuai rancangan'],
    ['Pemutus daya (shunt trip) bila ada', 'Sesuai rancangan'],
  ];
  const PERANGKAT = ['Detektor panas (tetap / rate-of-rise)', 'Detektor asap (fotolistrik / ionisasi)', 'Detektor nyala api (UV / IR)', 'Detektor lain (beam, aspirating, gas, dll.)', 'Titik panggil manual (MCP / manual call point)', 'Alarm bell / horn / sirine', 'Lampu strobe / lampu indikator remote', 'Pengeras suara evakuasi (voice alarm), bila ada'];
  const SECTIONS = { dokumen: 'Dokumen', panel: 'Panel kontrol', sumber: 'Sumber daya', mcp: 'MCP dan alarm', kabel: 'Pengkabelan dan pentanahan', uji: 'Uji fungsi sistem', interface: 'Interface' };

  /* ---------- util ---------- */
  const num = (x) => { const v = parseFloat(String(x ?? '').replace(',', '.')); return isNaN(v) ? null : v; };
  const fmtNum = (n, d = 0) => { const s = n.toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return s.join(','); };
  const parseD = (iso) => { if (!iso) return null; const [y, m, d] = iso.split('-').map(Number); return y ? { y, m, d } : null; };
  const fmtDate = (iso) => { const d = parseD(iso); return d ? `${d.d} ${MONTHS[d.m - 1]} ${d.y}` : ''; };
  function fmtRange(a, b) {
    const x = parseD(a), y = parseD(b);
    if (!x) return '';
    if (!y || a === b) return fmtDate(a);
    if (x.y === y.y && x.m === y.m) return `${x.d} – ${y.d} ${MONTHS[y.m - 1]} ${y.y}`;
    if (x.y === y.y) return `${x.d} ${MONTHS[x.m - 1]} – ${y.d} ${MONTHS[y.m - 1]} ${y.y}`;
    return `${fmtDate(a)} – ${fmtDate(b)}`;
  }
  const addMonths = (iso, n) => { const d = parseD(iso); if (!d) return ''; const t = d.y * 12 + (d.m - 1) + n; return `${MONTHS[t % 12]} ${Math.floor(t / 12)}`; };

  /* ---------- evaluasi zona detektor ---------- */
  const failedChecks = (z) => (z.checks || []).map((v, i) => v === 'x' ? i : -1).filter(i => i >= 0);
  const cnt = (z) => ({ tp: num(z.terpasang), du: num(z.diuji), bf: num(z.berfungsi) });
  const badDet = (z) => { const c = cnt(z); return (c.du != null && c.bf != null) ? Math.max(0, c.du - c.bf) : 0; };
  function autoStatus(z) {
    const c = cnt(z), bad = badDet(z), f = failedChecks(z);
    if (f.some(i => PLC_CRIT.includes(i))) return 'T';
    if (bad > 0 && c.du && bad / c.du > 0.1) return 'T';
    if (bad > 0 || f.length || (c.tp != null && c.du != null && c.du < c.tp)) return 'C';
    return 'M';
  }
  const statusOf = (z) => z.statusOverride || autoStatus(z);
  function autoTemuan(z) {
    const out = [], c = cnt(z), bad = badDet(z);
    if (bad > 0) out.push(`${bad} dari ${c.du} detektor tidak berfungsi`);
    if (c.tp != null && c.du != null && c.du < c.tp) out.push(`${c.tp - c.du} detektor belum diuji`);
    failedChecks(z).forEach(i => out.push(PLC_ITEMS[i]));
    return out.length ? out.join('; ') + (failedChecks(z).length ? ' – tidak memenuhi.' : '.') : '';
  }
  const defBatas = (s) => s === 'T' ? 'Segera (≤ 7 hari)' : '≤ 30 hari';

  /* rekap per jenis (dari semua zona) */
  function recap(F) {
    const out = { panas: [0, 0, 0], asap: [0, 0, 0], api: [0, 0, 0], lain: [0, 0, 0] };
    (F.zones || []).forEach(z => { const c = cnt(z), g = out[grp(z.jenis)]; g[0] += c.tp || 0; g[1] += c.du || 0; g[2] += c.bf || 0; });
    return out;
  }
  function totals(F) {
    const r = recap(F); let tp = 0, du = 0, bf = 0;
    Object.values(r).forEach(g => { tp += g[0]; du += g[1]; bf += g[2]; });
    return { tp, du, bf, tidak: Math.max(0, du - bf), pct: du ? bf / du * 100 : null };
  }
  /* jumlah perangkat terpasang: isian manual; detektor otomatis dari zona bila kosong */
  function perangkat(F) {
    const r = recap(F), keys = ['panas', 'asap', 'api', 'lain'];
    return PERANGKAT.map((nm, i) => {
      const row = (F.perangkat || [])[i] || {};
      const manual = String(row.jumlah ?? '').trim();
      const auto = i < 4 && r[keys[i]][0] ? String(r[keys[i]][0]) : '';
      return { nama: nm, jumlah: manual || auto, merk: String(row.merk ?? '').trim() };
    });
  }
  /* kapasitas baterai minimum */
  function battery(F) {
    const B = F.baterai || {};
    const iS = num(B.iSiaga), iA = num(B.iAlarm), jam = num(B.jamSiaga) ?? 24, mnt = num(B.menitAlarm) ?? 5, cap = num(B.kapTerpasang);
    if (iS == null || iA == null) return null;
    const min = 1.25 * (iS * jam + iA * mnt / 60);
    return { iS, iA, jam, mnt, min, cap, ok: cap != null ? cap >= min : null };
  }

  /* ---------- temuan, kesimpulan, rekomendasi ---------- */
  function findings(F) {
    const out = [];
    (F.zones || []).forEach(z => {
      const s = statusOf(z);
      if (s === 'M' && !(z.temuan || '').trim()) return;
      out.push({ bagian: `${z.kode}\n${z.lokasi || ''}`, temuan: (z.temuan || '').trim() || autoTemuan(z) || '–', s: s === 'M' ? 'C' : s,
        rek: (z.rekomendasi || '').trim() || (badDet(z) ? 'Bersihkan / ganti detektor yang tidak berfungsi, lalu uji ulang.' : 'Perbaiki sesuai ketentuan.'), batas: (z.batas || '').trim() || defBatas(s) });
    });
    Object.keys(SECTIONS).forEach(key => (F[key] || []).forEach(r => {
      if (r.hasil === 'C' || r.hasil === 'T') out.push({ bagian: SECTIONS[key], temuan: (r.ket || '').trim() ? `${r.label}: ${r.ket.trim()}` : r.label, s: r.hasil, rek: (r.rek || '').trim() || 'Perbaiki sesuai ketentuan.', batas: (r.batas || '').trim() || defBatas(r.hasil) });
    }));
    const b = battery(F);
    if (b && b.ok === false) out.push({ bagian: 'Baterai cadangan', temuan: `Kapasitas terpasang ${fmtNum(b.cap, 1)} Ah kurang dari kebutuhan minimum ± ${fmtNum(b.min, 1)} Ah.`, s: 'T', rek: 'Tambah / ganti baterai hingga kapasitas memenuhi.', batas: '≤ 30 hari' });
    return out.sort((a, c) => (a.s === 'T' ? 0 : 1) - (c.s === 'T' ? 0 : 1));
  }
  const rowsBad = (rows) => (rows || []).filter(r => r.hasil === 'C' || r.hasil === 'T');
  function autoRecommendations(F) {
    const r = [];
    if (findings(F).length) r.push('Tindak lanjuti seluruh temuan pada butir 4.11 sesuai batas waktu, lalu sampaikan bukti perbaikan (foto, nota pembelian, hasil uji ulang) kepada PJK3 untuk verifikasi.');
    r.push('Lakukan uji fungsi sistem secara berkala (mis. uji detektor dan MCP bergilir, uji bell bulanan, uji baterai) dan catat pada log pemeliharaan.');
    r.push('Jaga panel selalu dalam kondisi siaga; jangan menonaktifkan zona atau perangkat tanpa izin dan catatan tertulis.');
    r.push('Ganti baterai cadangan sesuai umur pakai yang disarankan pabrikan dan bersihkan detektor secara terjadwal.');
    r.push('Selenggarakan latihan penanggulangan kebakaran dan evakuasi bagi seluruh penghuni sesuai KEP.186/MEN/1999.');
    r.push(`Riksa uji berkala berikutnya dijadwalkan paling lambat ${addMonths(F.meta.tglSelesai || F.meta.tglMulai, 12) || '[bulan tahun]'}.`);
    return r;
  }
  function conclusions(F) {
    const out = [];
    const pn = rowsBad(F.panel), sd = rowsBad(F.sumber), b = battery(F);
    out.push(pn.length ? `Panel kontrol (MCFA) memiliki ${pn.length} butir catatan / tidak memenuhi (butir 4.2).` : 'Panel kontrol (MCFA) dalam kondisi siaga dan seluruh fungsinya memenuhi persyaratan.');
    out.push(`Sumber daya utama dan baterai cadangan ${sd.length ? `memiliki ${sd.length} catatan` : 'memenuhi syarat'}${b ? `; kapasitas baterai minimum ± ${fmtNum(b.min, 1)} Ah${b.cap != null ? `, terpasang ${fmtNum(b.cap, 1)} Ah (${b.ok ? 'memenuhi' : 'tidak memenuhi'})` : ''}` : ''}.`);
    const t = totals(F);
    out.push(t.du ? `Dari ${fmtNum(t.tp)} detektor terpasang, ${fmtNum(t.du)} diuji; ${fmtNum(t.bf)} berfungsi (${fmtNum(t.pct, 1)}%) dan ${fmtNum(t.tidak)} tidak berfungsi.` : 'Pengujian detektor belum diisi.');
    const mb = rowsBad(F.mcp), kb = rowsBad(F.kabel);
    out.push(`Titik panggil manual dan alat pemberi tanda alarm ${mb.length ? `memiliki ${mb.length} catatan` : 'memenuhi syarat'}; pengkabelan dan pentanahan ${kb.length ? `memiliki ${kb.length} catatan` : 'memenuhi syarat'}.`);
    const ub = rowsBad(F.uji), ib = rowsBad(F.interface);
    out.push(ub.length || ib.length ? `Uji fungsi sistem dan interface: ${ub.length + ib.length} butir tidak sepenuhnya memenuhi (butir 4.9 dan 4.10).` : 'Uji fungsi sistem (alarm, gangguan, sumber daya) dan interface berjalan sesuai rancangan.');
    const f = findings(F), nT = f.filter(x => x.s === 'T').length, nC = f.length - nT;
    out.push(f.length ? `Terdapat ${f.length} temuan: ${nT} temuan tidak memenuhi dan ${nC} temuan catatan.` : 'Tidak terdapat temuan ketidaksesuaian.');
    const critical = (F.zones || []).some(z => statusOf(z) === 'T') || [...(F.panel || []), ...(F.sumber || []), ...(F.kabel || []), ...(F.uji || [])].some(r => r.hasil === 'T') || (b && b.ok === false);
    if (critical) out.push('Secara keseluruhan, instalasi alarm kebakaran otomatis BELUM MEMENUHI SYARAT K3. Surat Keterangan Memenuhi Syarat dapat diajukan setelah temuan diperbaiki dan dilakukan uji ulang oleh PJK3.');
    else if (f.length) out.push(`Secara keseluruhan, instalasi alarm kebakaran otomatis MEMENUHI SYARAT K3 DENGAN CATATAN. ${nT ? 'Surat Keterangan Memenuhi Syarat dapat diajukan setelah temuan berpenilaian "Tidak" diperbaiki dan diverifikasi PJK3.' : 'Seluruh temuan wajib ditindaklanjuti sesuai batas waktu.'}`);
    else out.push('Secara keseluruhan, instalasi alarm kebakaran otomatis MEMENUHI SYARAT K3 dan laporan ini dapat diajukan sebagai dasar penerbitan Surat Keterangan Memenuhi Syarat K3.');
    return out;
  }

  function b64ToBytes(dataUrl) {
    const b64 = dataUrl.split(',')[1];
    if (typeof atob === 'function') { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
    return Buffer.from(b64, 'base64');
  }
  const imgType = (u) => /^data:image\/png/.test(u) ? 'png' : 'jpg';
  const fit = (img, mw, mh) => { const r = Math.min(mw / img.w, mh / img.h); return { width: Math.round(img.w * r), height: Math.round(img.h * r) }; };

  /* ================= pembuat dokumen ================= */
  function buildFireAlarm(F, D) {
    const {
      Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, ImageRun,
      AlignmentType, BorderStyle, HeadingLevel, PageBreak, Header, Footer, PageNumber, LevelFormat, VerticalAlign, PageOrientation, SectionType,
    } = D;
    const RED = '8B1A1A', GRAY = 'F2F2F2', FONT = 'Arial', C = AlignmentType.CENTER, PW = 9026, LW = 14838;
    const M = F.meta, P = F.pjk3, K = F.klien, T = F.teknis;
    const v = (x, ph) => (x != null && String(x).trim()) ? String(x).trim() : ph;
    const pjkName = v(P.nama, '[Nama PJK3]'), klien = v(K.nama, '[Nama Perusahaan]'), nomor = v(M.nomor, '[Nomor Laporan]');
    const zones = F.zones || [];
    const tot = totals(F), PR = perangkat(F);

    const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color, underline: o.u ? {} : undefined, highlight: o.highlight || (/^\[[^\]]*\]$/.test(text) ? 'yellow' : undefined) });
    const p = (children, o = {}) => new Paragraph({
      children: (Array.isArray(children) ? children : [children]).map(c => typeof c === 'string' ? t(c, o) : c),
      alignment: o.align || AlignmentType.JUSTIFIED, spacing: { before: o.before ?? 0, after: o.after ?? 100, line: o.line || 276 },
      numbering: o.numbering, keepNext: o.keepNext,
    });
    const h1 = (x, brk) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: !!brk, children: [new TextRun({ text: x, font: FONT })], spacing: { before: 280, after: 140 }, keepNext: true });
    const h2 = (x) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: x, font: FONT })], spacing: { before: 200, after: 100 }, keepNext: true });
    const bullet = (x) => p(typeof x === 'string' ? [t(x)] : x, { numbering: { reference: 'bullets', level: 0 }, after: 60 });
    const nl = (ref, x) => p(typeof x === 'string' ? [t(x)] : x, { numbering: { reference: ref, level: 0 }, after: 60 });
    const note = (x) => p([t(x, { size: 16, italics: true })], { before: 80 });
    const spacer = (after = 120) => new Paragraph({ children: [], spacing: { before: 0, after } });
    const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
    const sub = (x) => p([t(x, { bold: true, size: 18 })], { after: 60, before: 80, keepNext: true, align: AlignmentType.LEFT });
    const border = { style: BorderStyle.SINGLE, size: 4, color: '808080' };
    const borders = { top: border, bottom: border, left: border, right: border };
    const noB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const noBorders = { top: noB, bottom: noB, left: noB, right: noB };
    function cell(content, width, o = {}) {
      const lines = Array.isArray(content) ? [content] : String(content ?? '').split('\n').map(x => [x]);
      return new TableCell({
        children: lines.map(runs => new Paragraph({ children: runs.map(r => typeof r === 'string' ? t(r, { bold: o.bold, size: o.size || 18, color: o.color }) : r), alignment: o.align || AlignmentType.LEFT, spacing: { before: 0, after: 0 } })),
        width: { size: width, type: WidthType.DXA }, borders: o.noBorder ? noBorders : borders,
        shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
        margins: { top: 50, bottom: 50, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER, columnSpan: o.span,
      });
    }
    function table(widths, rows, o = {}) {
      return new Table({
        width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
        rows: rows.map((r, ri) => new TableRow({
          tableHeader: o.header && ri === 0, cantSplit: true,
          children: r.map((c, ci) => {
            const isHead = o.header && ri === 0;
            const spec = (c && typeof c === 'object' && !Array.isArray(c) && 'c' in c) ? c : { c };
            const span = spec.span || 1;
            let pos = 0; for (let k = 0; k < ci; k++) { const prev = r[k]; pos += (prev && prev.span) || 1; }
            let w = 0; for (let k = 0; k < span; k++) w += widths[pos + k];
            return cell(spec.c, w, { bold: isHead || spec.bold, fill: isHead ? RED : spec.fill, color: isHead ? 'FFFFFF' : spec.color, align: spec.align || (isHead ? C : (o.aligns ? o.aligns[pos] : undefined)), span: spec.span, size: o.size, noBorder: o.noBorder });
          }),
        })),
      });
    }
    const kv = (rows) => table([2700, 300, 6026], rows.map(([k, val]) => [{ c: k, fill: GRAY }, ':', { c: val }]));
    const R = (s) => s ? { c: LABEL[s], fill: FILL[s], bold: true, align: C } : { c: '–', align: C };
    const X = '✗', V = '✓';
    const tglRiksa = fmtRange(M.tglMulai, M.tglSelesai) || '[Tanggal Riksa Uji]';
    const tglLap = fmtDate(M.tglLaporan) || '[Tanggal Laporan]';
    const pct = (a, b) => b ? fmtNum(a / b * 100, 1) + '%' : '–';

    // ---------- kop & sampul ----------
    const kop = [];
    if (P.logo && P.logo.data) kop.push(new Paragraph({ alignment: C, spacing: { after: 60 }, children: [new ImageRun({ type: imgType(P.logo.data), data: b64ToBytes(P.logo.data), transformation: fit(P.logo, 220, 70) })] }));
    kop.push(
      new Paragraph({ alignment: C, spacing: { after: 0 }, children: [t(P.nama ? P.nama.toUpperCase() : '[NAMA PERUSAHAAN PJK3]', { bold: true, size: 30, color: RED })] }),
      new Paragraph({ alignment: C, spacing: { after: 0 }, children: [t('Perusahaan Jasa Keselamatan dan Kesehatan Kerja (PJK3) Bidang Pemeriksaan dan Pengujian Proteksi Kebakaran', { size: 18 })] }),
      new Paragraph({ alignment: C, spacing: { after: 0 }, children: [t('SK Penunjukan PJK3 No. ', { size: 18 }), t(v(P.sk, '[Nomor SK Kemnaker]'), { size: 18 })] }),
      new Paragraph({ alignment: C, spacing: { after: 120 }, border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: RED, space: 4 } },
        children: [t(v(P.alamat, '[Alamat lengkap PJK3]'), { size: 18 }), t('  |  Telp. ', { size: 18 }), t(v(P.telp, '[Telp]'), { size: 18 }), t('  |  Email: ', { size: 18 }), t(v(P.email, '[Email]'), { size: 18 })] }),
    );
    const nMcp = PR[4].jumlah, nBell = PR[5].jumlah;
    const objek = `${zones.length} zona detektor, ${tot.tp} detektor${nMcp ? `, ${nMcp} titik panggil manual` : ''}${nBell ? `, ${nBell} alarm bell` : ''}`;
    const cover = [
      ...kop, spacer(700),
      new Paragraph({ alignment: C, spacing: { after: 120 }, children: [t('LAPORAN HASIL', { bold: true, size: 36 })] }),
      new Paragraph({ alignment: C, spacing: { after: 120 }, children: [t('PEMERIKSAAN DAN PENGUJIAN (RIKSA UJI)', { bold: true, size: 36 })] }),
      new Paragraph({ alignment: C, spacing: { after: 120 }, children: [t('INSTALASI ALARM KEBAKARAN OTOMATIS', { bold: true, size: 36, color: RED })] }),
      new Paragraph({ alignment: C, spacing: { after: 500 }, children: [t('(FIRE ALARM)', { bold: true, size: 28, color: RED })] }),
      new Paragraph({ alignment: C, spacing: { after: 500 }, children: [t(v(M.periode, '[Periode pemeriksaan]'), { size: 22, italics: true })] }),
      table([3000, 300, 4500], [
        [{ c: 'Nomor Laporan', bold: true }, ':', nomor],
        [{ c: 'Perusahaan', bold: true }, ':', klien],
        [{ c: 'Lokasi', bold: true }, ':', v(K.alamatSingkat || K.alamat, '[Lokasi]')],
        [{ c: 'Tanggal Riksa Uji', bold: true }, ':', tglRiksa],
        [{ c: 'Tanggal Laporan', bold: true }, ':', tglLap],
        [{ c: 'Objek', bold: true }, ':', objek],
      ], { noBorder: true, size: 22 }),
      spacer(600),
      new Paragraph({ alignment: C, spacing: { after: 60 }, children: [t('Mengacu pada Peraturan Menteri Tenaga Kerja dan Transmigrasi No. PER.02/MEN/1983', { size: 18 })] }),
      new Paragraph({ alignment: C, spacing: { after: 300 }, children: [t('tentang Instalasi Alarm Kebakaran Otomatis, serta SNI 03-3985-2000', { size: 18 })] }),
    ];
    if (M.isSample) cover.push(table([PW], [[{ c: [t('Catatan pengisian: ', { bold: true, size: 16 }), t('Data perusahaan, nomor dan hasil pengukuran pada dokumen ini adalah CONTOH FIKTIF. Ganti teks berlatar kuning dan seluruh contoh isian dengan data riksa uji sebenarnya, lalu hapus kotak catatan ini sebelum diterbitkan.', { size: 16, italics: true })], fill: 'FFF8E1' }]]));
    cover.push(pageBreak());

    // ---------- I ----------
    const bab1 = [
      h1('I. PENDAHULUAN'),
      h2('1.1 Latar Belakang'),
      p('Undang-Undang No. 1 Tahun 1970 tentang Keselamatan Kerja mewajibkan pengurus mencegah, mengurangi dan memadamkan kebakaran di tempat kerja. Instalasi alarm kebakaran otomatis berfungsi mendeteksi kebakaran sedini mungkin dan memberi peringatan kepada penghuni serta petugas agar tindakan pemadaman dan evakuasi dapat dilakukan sebelum api membesar. Karena itu instalasi ini harus selalu siaga, dan kesiapannya wajib diperiksa serta diuji secara berkala oleh pihak yang berwenang.'),
      p('Peraturan Menteri Tenaga Kerja dan Transmigrasi No. PER.02/MEN/1983 tentang Instalasi Alarm Kebakaran Otomatis mengatur persyaratan perencanaan, pemasangan, pemeliharaan, pemeriksaan dan pengujian detektor, panel kontrol, titik panggil manual, alat pemberi tanda alarm serta sumber dayanya.'),
      p(`Atas permintaan ${klien}, ${pjkName} selaku PJK3 yang ditunjuk Kementerian Ketenagakerjaan RI telah melaksanakan pemeriksaan dan pengujian terhadap instalasi alarm kebakaran otomatis di lokasi perusahaan.`),
      h2('1.2 Maksud dan Tujuan'),
      bullet('Memastikan instalasi alarm kebakaran otomatis memenuhi persyaratan K3 penanggulangan kebakaran.'),
      bullet('Mengetahui kesiapan dan kinerja panel kontrol, sumber daya, detektor, titik panggil manual dan alat pemberi tanda alarm.'),
      bullet('Mengetahui kondisi pengkabelan, pentanahan serta fungsi sistem saat terjadi alarm dan gangguan.'),
      bullet('Memberikan rekomendasi perbaikan dan menjadi dasar pengajuan Surat Keterangan Memenuhi Syarat K3 kepada Pengawas Ketenagakerjaan setempat.'),
      h2('1.3 Dasar Hukum dan Acuan Teknis'),
      nl('dasar', 'Undang-Undang No. 1 Tahun 1970 tentang Keselamatan Kerja.'),
      nl('dasar', 'Peraturan Pemerintah No. 50 Tahun 2012 tentang Penerapan Sistem Manajemen Keselamatan dan Kesehatan Kerja (SMK3).'),
      nl('dasar', 'Peraturan Menteri Tenaga Kerja No. PER.04/MEN/1995 tentang Perusahaan Jasa Keselamatan dan Kesehatan Kerja.'),
      nl('dasar', 'Peraturan Menteri Tenaga Kerja dan Transmigrasi No. PER.02/MEN/1983 tentang Instalasi Alarm Kebakaran Otomatis.'),
      nl('dasar', 'Keputusan Menteri Tenaga Kerja No. KEP.186/MEN/1999 tentang Unit Penanggulangan Kebakaran di Tempat Kerja.'),
      nl('dasar', 'Instruksi Menteri Tenaga Kerja No. INS.11/M/BW/1997 tentang Pengawasan Khusus K3 Penanggulangan Kebakaran.'),
      nl('dasar', 'Peraturan Menteri Pekerjaan Umum No. 26/PRT/M/2008 tentang Persyaratan Teknis Sistem Proteksi Kebakaran pada Bangunan Gedung dan Lingkungan (acuan teknis).'),
      nl('dasar', 'SNI 03-3985-2000 tentang Tata Cara Perencanaan, Pemasangan dan Pengujian Sistem Deteksi dan Alarm Kebakaran untuk Pencegahan Bahaya Kebakaran pada Bangunan Gedung.'),
      nl('dasar', 'Persyaratan Umum Instalasi Listrik (PUIL 2011 / SNI 0225:2011) untuk instalasi listrik dan pentanahan.'),
      nl('dasar', 'NFPA 72 (National Fire Alarm and Signaling Code) sebagai acuan pelengkap.'),
      h2('1.4 Ruang Lingkup'),
      p(`Riksa uji meliputi pemeriksaan dokumen, panel kontrol (Master Control Fire Alarm / MCFA), sumber daya utama dan cadangan, detektor (panas, asap, nyala api dan jenis lain yang terpasang), titik panggil manual, alat pemberi tanda alarm (bell, horn, strobe), pengkabelan dan pentanahan, serta pengujian fungsi sistem saat alarm, gangguan dan interface dengan sistem lain. Cakupan: ${zones.length} zona detektor${v(K.cakupanArea, '') ? ' – ' + K.cakupanArea.trim() : ''}.`),
    ];

    // ---------- II ----------
    const bab2 = [
      h1('II. DATA UMUM'),
      h2('2.1 Data Perusahaan (Pemilik Instalasi)'),
      kv([
        ['Nama Perusahaan', klien], ['Alamat', v(K.alamat, '[Alamat]')], ['Bidang Usaha', v(K.bidang, '[Bidang usaha]')],
        ['Pengurus / Penanggung Jawab', K.pengurus ? `${K.pengurus}${K.jabatanPengurus ? ` (${K.jabatanPengurus})` : ''}` : '[Nama Pengurus]'],
        ['Petugas Pendamping', v(M.petugas || K.petugas, '[Nama petugas]')],
        ['Klasifikasi Bahaya Kebakaran', v(T.klasifikasi || K.klasifikasi, '[Ringan / Sedang / Berat]')],
      ]),
      spacer(),
      h2('2.2 Data Pelaksana Riksa Uji (PJK3)'),
      kv([
        ['Nama PJK3', pjkName], ['No. SK Penunjukan PJK3', v(P.sk, '[Nomor SK Kemnaker]')],
        ['Ahli K3 Pemeriksa', v(P.ahli, '[Nama Ahli K3 Spesialis Penanggulangan Kebakaran]')], ['No. Lisensi / SKP Ahli K3', v(P.lisensi, '[Nomor Lisensi]')],
        ['Teknisi Pendamping', v(P.teknisi, '[Nama Teknisi]')],
      ]),
      spacer(),
      h2('2.3 Waktu dan Jenis Pemeriksaan'),
      kv([['Tanggal Pelaksanaan', tglRiksa], ['Jenis Pemeriksaan', v(M.jenis, '[Pertama / Berkala / Setelah modifikasi]')], ['Riksa Uji Sebelumnya', v(M.sebelumnya, '–')]]),
      spacer(),
      h2('2.4 Data Teknis Instalasi'),
      kv([
        ['Kontraktor Pemasang / Tahun', v(T.kontraktor, '[Kontraktor / tahun]')],
        ['Pengesahan Instalasi', v(T.pengesahan, '[Nomor pengesahan / Suket sebelumnya]')],
        ['Jenis Sistem', v(T.sistem, '[Konvensional / Addressable / Hybrid]')],
        ['Merk / Tipe Panel (MCFA)', v(T.merkPanel, '[Merk / tipe / nomor seri]')],
        ['Jumlah Zona / Loop', v(T.jumlahZona, `${zones.length} zona (terdaftar di aplikasi)`)],
        ['Lokasi Panel Utama', v(T.lokasiPanel, '[Lokasi]')],
        ['Panel Repeater / Annunciator', v(T.repeater, '[Ada, … unit di … / Tidak ada]')],
        ['Sumber Daya', v(T.sumberDaya, '[Utama: … V AC; Cadangan: baterai … V / … Ah × … buah]')],
        ['Pemantauan Jarak Jauh', v(T.pemantauan, '[Ada (ke …) / Tidak ada]')],
      ]),
      sub('Rekapitulasi perangkat terpasang'),
      table([700, 3326, 1500, 3500], [
        ['No', 'Perangkat', 'Jumlah (unit)', 'Merk / Tipe'],
        ...PR.map((x, i) => [String(i + 1), x.nama, v(x.jumlah, '–'), v(x.merk, '–')]),
      ], { header: true, size: 17, aligns: [C, null, C] }),
    ];

    // ---------- III ----------
    const alat = (F.alat || []).filter(a => a.nama);
    const bab3 = [
      h1('III. METODE DAN PERALATAN'),
      h2('3.1 Metode Pemeriksaan dan Pengujian'),
      p('Pemeriksaan dan pengujian dilaksanakan mengikuti PER.02/MEN/1983 dengan acuan teknis SNI 03-3985-2000, dengan urutan:'),
      nl('metode', [t('Pemeriksaan dokumen: ', { bold: true }), t('pengesahan, gambar terpasang, spesifikasi dan sertifikat produk, catatan pemeliharaan serta tindak lanjut syarat riksa uji sebelumnya.')]),
      nl('metode', [t('Pemeriksaan panel kontrol: ', { bold: true }), t('kondisi normal, lamp test, indikator zona, tombol operasi, penonaktifan perangkat (disablement) dan catatan kejadian.')]),
      nl('metode', [t('Pemeriksaan dan pengukuran sumber daya: ', { bold: true }), t('tegangan AC, tegangan dan kondisi baterai, perpindahan otomatis ke baterai, serta perhitungan kapasitas baterai.')]),
      nl('metode', [t('Pengujian detektor: ', { bold: true }), t('setiap detektor diuji dengan pemicu sesuai jenisnya (heat tester untuk detektor panas, smoke tester/aerosol untuk detektor asap, flame simulator untuk detektor nyala api); dicatat zona yang menyala di panel dan waktu responsnya. Pemeriksaan visual meliputi jarak antar detektor, tinggi plafon, hambatan dan kebersihan.')]),
      nl('metode', [t('Pengujian titik panggil manual dan alarm: ', { bold: true }), t('setiap MCP diaktifkan, bunyi alarm di seluruh area diperiksa dan tingkat tekanan suara diukur dengan sound level meter.')]),
      nl('metode', [t('Pemeriksaan pengkabelan dan pentanahan: ', { bold: true }), t('jenis dan pemasangan kabel, pengukuran tahanan isolasi kabel dan tahanan pentanahan.')]),
      nl('metode', [t('Uji fungsi sistem: ', { bold: true }), t('simulasi kebakaran (alarm), pembungkaman dan reset, simulasi gangguan (kabel terputus, hubung singkat, ground fault, AC fail), serta pengujian interface dengan sistem lain.')]),
      h2('3.2 Peralatan yang Digunakan'),
      table([600, 3200, 2600, 2626], [
        ['No', 'Nama Peralatan', 'Spesifikasi', 'No. Sertifikat Kalibrasi'],
        ...(alat.length ? alat : [{ nama: '[Nama peralatan]' }]).map((a, i) => [String(i + 1), a.nama, a.spek || '–', a.sert || '–']),
      ], { header: true, aligns: [C] }),
      h2('3.3 Kriteria Penerimaan'),
      table([2700, 4326, 2000], [
        ['Parameter', 'Kriteria', 'Acuan'],
        ['Respons detektor', 'Seluruh detektor yang diuji menyalakan alarm di panel pada zona yang benar', 'PER.02/MEN/1983'],
        ['Waktu respons detektor', 'Sesuai spesifikasi pabrikan / tidak lebih dari batas yang ditetapkan standar', 'SNI 03-3985-2000'],
        ['Luas dan jarak pemantauan detektor', 'Tidak melebihi batas untuk tiap jenis detektor dan tinggi plafon pada tabel standar yang dipakai', 'PER.02/MEN/1983; SNI 03-3985-2000'],
        ['Titik panggil manual', 'Terpasang pada jalur keluar, mudah dilihat dan dijangkau; jarak tempuh ke MCP terdekat dan tinggi pemasangan sesuai standar', 'SNI 03-3985-2000'],
        ['Tegangan sumber utama', '220 V AC ± 10% (198 – 242 V)', 'PUIL 2011'],
        ['Baterai cadangan', 'Mampu mencatu sistem selama waktu siaga ditambah waktu alarm yang ditetapkan standar', 'SNI 03-3985-2000; NFPA 72'],
        ['Tekanan suara alarm', 'Sesuai standar atau ≥ 15 dB di atas bising latar', 'SNI 03-3985-2000; NFPA 72'],
        ['Tahanan isolasi kabel', '≥ 1 MΩ pada uji 500 V DC (atau sesuai ketentuan pabrikan)', 'PUIL 2011'],
        ['Tahanan pentanahan', 'Sesuai batas PUIL / ketentuan pabrikan panel', 'PUIL 2011'],
        ['Sinyal gangguan (trouble)', 'Panel menampilkan gangguan dan membunyikan buzzer saat kabel terputus, ground fault, AC fail atau perangkat dilepas', 'PER.02/MEN/1983; SNI 03-3985-2000'],
      ], { header: true, size: 17 }),
      h2('3.4 Skala Penilaian'),
      table([2200, 6826], [
        ['Penilaian', 'Arti'],
        [{ c: 'Memenuhi', fill: FILL.M, bold: true }, 'Butir pemeriksaan memenuhi kriteria.'],
        [{ c: 'Catatan', fill: FILL.C, bold: true }, 'Instalasi tetap berfungsi, namun terdapat kekurangan yang wajib diperbaiki pengurus.'],
        [{ c: 'Tidak', fill: FILL.T, bold: true }, 'Tidak memenuhi kriteria dan mengurangi kesiapan instalasi; wajib segera diperbaiki.'],
      ], { header: true }),
    ];

    // ---------- IV (potret, bagian 1) ----------
    const hdrs4 = ['No', 'Butir Pemeriksaan', 'Hasil', 'Keterangan / Hasil Ukur'];
    const chk = (head, rows) => table([450, 4600, 1300, 2676], [[hdrs4[0], head, hdrs4[2], hdrs4[3]], ...rows.map((r, i) => [String(i + 1), r.label, R(r.hasil), v(r.ket, '–')])], { header: true, size: 17, aligns: [C, null, C] });
    const chk5 = (rows) => table([450, 3500, 1900, 1900, 1276], [['No', 'Butir Pemeriksaan / Pengukuran', 'Hasil Ukur / Temuan', 'Kriteria', 'Hasil'], ...rows.map((r, i) => [String(i + 1), r.label, v(r.ket, '–'), v(r.kriteria, '–'), R(r.hasil)])], { header: true, size: 17, aligns: [C, null, C, C, C] });
    const bt = battery(F);
    const bab4a = [
      h1('IV. HASIL PEMERIKSAAN DAN PENGUJIAN', true),
      h2('4.1 Pemeriksaan Dokumen'), chk('Dokumen', F.dokumen || []),
      h2('4.2 Panel Kontrol (MCFA)'), chk('Butir Pemeriksaan', F.panel || []),
      h2('4.3 Sumber Daya dan Baterai Cadangan'), chk5(F.sumber || []),
      sub('Perhitungan kapasitas baterai minimum'),
      bt ? table([4600, 2000, 2426], [
        ['Parameter', 'Nilai', 'Keterangan'],
        ['Arus siaga seluruh sistem (I siaga)', `${fmtNum(bt.iS, 2)} A`, 'Dari data pabrikan / diukur'],
        ['Arus alarm seluruh sistem (I alarm)', `${fmtNum(bt.iA, 2)} A`, 'Semua bell + indikator aktif'],
        ['Lama siaga / lama alarm', `${fmtNum(bt.jam, 0)} jam / ${fmtNum(bt.mnt, 0)} menit`, 'Sesuai standar yang dipakai'],
        ['Kapasitas minimum = 1,25 × (I siaga × jam siaga + I alarm × jam alarm)', `${fmtNum(bt.min, 1)} Ah`, 'Faktor cadangan 25%'],
        ['Kapasitas baterai terpasang', bt.cap != null ? `${fmtNum(bt.cap, 1)} Ah` : '[… Ah]', ''],
        [{ c: 'Hasil', bold: true, fill: GRAY }, bt.ok == null ? { c: '[M/C/T]', align: C } : (bt.ok ? R('M') : R('T')), { c: 'Terpasang ≥ minimum → Memenuhi', italics: true }],
      ], { header: true, size: 17, aligns: [null, C] }) : p([t('[Isi arus siaga dan arus alarm di aplikasi untuk menghitung kapasitas baterai minimum]')]),
      note('Kapasitas minimum dihitung dengan rumus umum; lama siaga dan lama alarm mengikuti standar yang dipakai PJK3.'),
    ];

    // ---------- IV (lanskap) ----------
    const matrix = (list, perTable) => {
      const out = [], labelW = 5500;
      for (let s = 0; s < list.length; s += perTable) {
        const chunk = list.slice(s, s + perTable);
        const colW = Math.floor((LW - 500 - labelW) / perTable);
        const widths = [500, LW - 500 - colW * chunk.length, ...Array(chunk.length).fill(colW)];
        if (s > 0) out.push(spacer(80));
        out.push(table(widths, [
          ['No', 'Butir Pemeriksaan', ...chunk.map(z => z.kode)],
          ...PLC_ITEMS.map((it, i) => [String(i + 1), it, ...chunk.map(z => (z.checks || [])[i] === 'x' ? { c: X, fill: FILL.T, bold: true, align: C } : { c: V, align: C })]),
          [{ c: 'Penilaian', bold: true, fill: GRAY, span: 2, align: AlignmentType.RIGHT }, ...chunk.map(z => { const s2 = statusOf(z); return { c: s2, fill: FILL[s2], bold: true, align: C }; })],
        ], { header: true, size: 16, aligns: [C, null, ...Array(chunk.length).fill(C)] }));
      }
      return out;
    };
    const zRow = (z, i) => { const c = cnt(z), bad = badDet(z); return [String(i + 1), z.kode, v(z.lokasi, '–'), z.jenis || '–', v(z.terpasang, '–'), v(z.diuji, '–'), v(z.berfungsi, '–'), c.du != null && c.bf != null ? String(bad) : '–', v(z.tinggi, '–'), v(z.jarak, '–'), R(statusOf(z)), v(z.temuan, autoTemuan(z) || '–')]; };
    const bab4b = [
      h2('4.4 Pengujian dan Pemeriksaan Detektor'),
      p('Setiap detektor diuji dengan pemicu sesuai jenisnya. Satu baris mewakili satu zona (atau satu kelompok detektor sejenis dalam satu ruang).'),
      zones.length ? table([500, 900, 2100, 1500, 1050, 1000, 1050, 1150, 1000, 1500, 1038, 2050], [
        ['No', 'Zona', 'Lokasi / Ruang', 'Jenis Detektor', 'Jml Terpasang', 'Jml Diuji', 'Jml Berfungsi', 'Jml Tidak Berfungsi', 'Tinggi Plafon (m)', 'Jarak antar / Luas Pantau', 'Hasil', 'Keterangan'],
        ...zones.map(zRow),
        [{ c: 'Total', bold: true, fill: GRAY, span: 4, align: AlignmentType.RIGHT }, { c: String(tot.tp), align: C, bold: true }, { c: String(tot.du), align: C, bold: true }, { c: String(tot.bf), align: C, bold: true }, { c: String(tot.tidak), align: C, bold: true }, { c: '', fill: GRAY, span: 4 }],
      ], { header: true, size: 16, aligns: [C, C, null, C, C, C, C, C, C, C, C, null] }) : p([t('[Belum ada zona detektor yang diisi]')]),
      h2('4.5 Rekapitulasi Detektor per Jenis'),
      (() => { const r = recap(F); const keys = ['panas', 'asap', 'api', 'lain'];
        return table([600, 3600, 1500, 1500, 1500, 1700, 2000, 2438], [
          ['No', 'Jenis Detektor', 'Terpasang', 'Diuji', 'Berfungsi', 'Tidak Berfungsi', 'Persentase Berfungsi', 'Cara Pengujian'],
          ...keys.map((k, i) => [String(i + 1), GRP_LABEL[k], String(r[k][0]), String(r[k][1]), String(r[k][2]), String(Math.max(0, r[k][1] - r[k][2])), pct(r[k][2], r[k][1]), GRP_TEST[k]]),
          [{ c: 'Jumlah', bold: true, fill: GRAY, span: 2, align: AlignmentType.RIGHT }, String(tot.tp), String(tot.du), String(tot.bf), String(tot.tidak), tot.du ? pct(tot.bf, tot.du) : '–', ''],
        ], { header: true, size: 16, aligns: [C, null, C, C, C, C, C, null] }); })(),
      note('Persentase berfungsi = jumlah berfungsi ÷ jumlah diuji × 100%. Detektor yang tidak berfungsi dicatat pada butir 4.11 (Temuan).'),
      h2('4.6 Pemeriksaan Penempatan Detektor'),
      ...(zones.length ? matrix(zones, 10) : [p('Belum ada zona detektor yang diisi.')]),
      note(`${V} = memenuhi; ${X} = tidak memenuhi. M = Memenuhi, C = Catatan, T = Tidak memenuhi. Zona: ${zones.map(z => `${z.kode} ${z.lokasi || ''}`.trim()).join('; ')}.`),
    ];

    // ---------- IV (potret, bagian 2) ----------
    const FD = findings(F);
    const bab4c = [
      h2('4.7 Titik Panggil Manual (MCP) dan Alat Pemberi Tanda Alarm'), chk5(F.mcp || []),
      h2('4.8 Pengkabelan dan Pentanahan'), chk5(F.kabel || []),
      h2('4.9 Uji Fungsi Sistem (Simulasi)'),
      p('Pengujian dilakukan dengan memberitahu pengelola gedung dan petugas pemantau. Hasil pengamatan berikut adalah kondisi nyata saat pengujian.'),
      table([450, 2900, 2500, 1900, 1276], [
        ['No', 'Skenario Pengujian', 'Hasil yang Diharapkan', 'Hasil Pengamatan', 'Hasil'],
        ...(F.uji || []).map((r, i) => [String(i + 1), r.label, r.harap || '–', v(r.ket, '–'), R(r.hasil)]),
      ], { header: true, size: 16, aligns: [C, null, null, null, C] }),
      ...(v(F.ujiNote, '') ? [note(F.ujiNote.trim())] : []),
      h2('4.10 Uji Interface dengan Sistem Lain'),
      table([450, 3300, 2900, 1200, 1176], [
        ['No', 'Sistem Terkait', 'Respons yang Diharapkan saat Alarm', 'Terpasang?', 'Hasil'],
        ...(F.interface || []).map((r, i) => [String(i + 1), r.label, r.harap || '–', v(r.terpasang, '–'), R(r.hasil)]),
      ], { header: true, size: 16, aligns: [C, null, null, C, C] }),
      h2('4.11 Temuan dan Ketidaksesuaian'),
      FD.length ? table([400, 1700, 2250, 1050, 2526, 1100], [
        ['No', 'Bagian / Lokasi', 'Temuan', 'Penilaian', 'Rekomendasi', 'Batas Waktu'],
        ...FD.map((f, i) => [String(i + 1), f.bagian, f.temuan, { c: f.s === 'T' ? 'Tidak' : 'Catatan', fill: FILL[f.s], bold: true, align: C }, f.rek, f.batas]),
      ], { header: true, size: 16, aligns: [C, null, null, C, null, C] }) : p('Tidak terdapat temuan ketidaksesuaian pada pemeriksaan ini.'),
      spacer(),
    ];

    // ---------- V, VI ----------
    const rekom = (F.rekomendasi && F.rekomendasi.some(x => x.trim())) ? F.rekomendasi : autoRecommendations(F);
    const bab56 = [
      h1('V. KESIMPULAN'),
      p(`Berdasarkan hasil pemeriksaan dan pengujian instalasi alarm kebakaran otomatis di ${klien} pada tanggal ${tglRiksa}, disimpulkan bahwa:`),
      ...conclusions(F).map(x => nl('simpul', x)),
      h1('VI. REKOMENDASI'),
      ...rekom.filter(x => x.trim()).map(x => bullet(x.trim())),
    ];

    // ---------- VII ----------
    const W3 = [3008, 3010, 3008];
    const sc = (lines, wd) => new TableCell({ width: { size: wd, type: WidthType.DXA }, borders: noBorders, verticalAlign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: lines.map(([txt, st]) => new Paragraph({ alignment: C, keepNext: true, spacing: { after: 0 }, children: [t(txt, { size: st.size || 18, bold: st.bold, u: st.u })] })) });
    const bab7 = [
      h1('VII. PERNYATAAN DAN PENGESAHAN'),
      p('Laporan ini disusun berdasarkan kondisi instalasi alarm kebakaran otomatis pada saat pemeriksaan dan pengujian dilaksanakan. Perubahan kondisi setelah tanggal tersebut di luar tanggung jawab PJK3. Laporan ini disampaikan kepada Pengawas Ketenagakerjaan setempat sebagai dasar penerbitan Surat Keterangan Memenuhi Syarat K3.'),
      p([t(`${v(M.kota, '[Kota]')}, ${tglLap}`, { bold: true })], { align: AlignmentType.RIGHT, before: 120, after: 200, keepNext: true }),
      new Table({ width: { size: PW, type: WidthType.DXA }, columnWidths: W3, rows: [
        new TableRow({ cantSplit: true, children: [
          sc([['Diperiksa oleh,', {}], ['Ahli K3 Spesialis', { bold: true }], ['Penanggulangan Kebakaran', { bold: true }]], W3[0]),
          sc([['Disetujui oleh,', {}], [pjkName, { bold: true }], ['', {}]], W3[1]),
          sc([['Mengetahui,', {}], [klien, { bold: true }], ['', {}]], W3[2]),
        ] }),
        new TableRow({ cantSplit: true, height: { value: 1300, rule: 'atLeast' }, children: W3.map(wd => sc([['', {}]], wd)) }),
        new TableRow({ cantSplit: true, children: [
          sc([[v(P.ahli, '[Nama Ahli K3]'), { bold: true, u: true }], [`No. Lisensi: ${v(P.lisensi, '[....]')}`, { size: 16 }]], W3[0]),
          sc([[v(P.direktur, '[Nama Direktur]'), { bold: true, u: true }], [v(P.jabatanDirektur, 'Direktur'), { size: 16 }]], W3[1]),
          sc([[v(K.pengurus, '[Nama Pengurus]'), { bold: true, u: true }], [`${v(K.jabatanPengurus, 'Pimpinan')} (Pengurus)`, { size: 16 }]], W3[2]),
        ] }),
      ] }),
    ];

    // ---------- Lampiran ----------
    const photos = [];
    (F.photos || []).forEach(ph => photos.push({ ...ph, label: ph.caption || 'Dokumentasi' }));
    zones.forEach(z => (z.photos || []).forEach(ph => photos.push({ ...ph, label: `${z.kode}${ph.caption ? ': ' + ph.caption : ''}` })));
    const photoCell = (ph) => new TableCell({
      width: { size: 4513, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 80, right: 80 }, verticalAlign: VerticalAlign.BOTTOM,
      children: ph ? [
        new Paragraph({ alignment: C, spacing: { after: 0 }, children: [new ImageRun({ type: imgType(ph.data), data: b64ToBytes(ph.data), transformation: fit(ph, 280, 210) })] }),
        new Paragraph({ alignment: C, spacing: { before: 60, after: 0 }, children: [t(ph.label, { size: 16, bold: true })] }),
      ] : [new Paragraph({ children: [] })],
    });
    const lampiran = [h1('LAMPIRAN', true), h2('Lampiran A – Dokumentasi')];
    if (photos.length) {
      const rows = [];
      for (let i = 0; i < photos.length; i += 2) rows.push(new TableRow({ cantSplit: true, children: [photoCell(photos[i]), photoCell(photos[i + 1])] }));
      lampiran.push(new Table({ width: { size: PW, type: WidthType.DXA }, columnWidths: [4513, 4513], rows }));
    } else lampiran.push(p([t('[Belum ada foto dokumentasi]', { italics: true })]));
    lampiran.push(h2('Lampiran B – Gambar Instalasi'));
    if (F.gambar && F.gambar.data) lampiran.push(new Paragraph({ alignment: C, children: [new ImageRun({ type: imgType(F.gambar.data), data: b64ToBytes(F.gambar.data), transformation: fit(F.gambar, 600, 760) })] }));
    else lampiran.push(p([t('[Sisipkan denah per lantai dengan letak panel, zona, detektor, MCP dan bell; tandai detektor yang tidak berfungsi]', { italics: true })]));
    lampiran.push(
      h2('Lampiran C – Dokumen Pendukung'),
      bullet('Salinan SK Penunjukan PJK3 dari Kementerian Ketenagakerjaan RI.'),
      bullet('Salinan Lisensi / SKP Ahli K3 Spesialis Penanggulangan Kebakaran.'),
      bullet('Sertifikat kalibrasi peralatan uji (multimeter, insulation tester, earth tester, sound level meter).'),
      bullet('Data teknis / katalog panel, detektor dan baterai; data perhitungan kapasitas baterai.'),
      bullet('Formulir lapangan / berita acara riksa uji yang ditandatangani kedua pihak.'),
    );

    const header = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RED, space: 2 } },
      children: [t(`Laporan Riksa Uji Instalasi Alarm Kebakaran Otomatis  |  No. ${M.nomor || '-'}`, { size: 16, color: '666666' })] })] });
    const footer = new Footer({ children: [new Paragraph({ alignment: C, children: [t('Halaman ', { size: 16, color: '666666' }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '666666' }), t(' dari ', { size: 16, color: '666666' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: '666666' })] })] });
    const numCfg = (ref, fmt) => ({ reference: ref, levels: [{ level: 0, format: fmt, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 360 } }, run: { font: FONT } } }] });
    const portrait = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1200, left: 1440, right: 1440, header: 600, footer: 600 } } };
    const landscape = { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1300, bottom: 1100, left: 1000, right: 1000, header: 600, footer: 600 } } };
    return new Document({
      creator: pjkName, title: 'Laporan Hasil Riksa Uji Instalasi Alarm Kebakaran Otomatis (Fire Alarm)',
      styles: {
        default: { document: { run: { font: FONT, size: 20 } } },
        paragraphStyles: [
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: FONT, color: RED }, paragraph: { outlineLevel: 0 } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: FONT, color: '333333' }, paragraph: { outlineLevel: 1 } },
        ],
      },
      numbering: { config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 300 } } } }] },
        numCfg('dasar', LevelFormat.DECIMAL), numCfg('metode', LevelFormat.DECIMAL), numCfg('simpul', LevelFormat.LOWER_LETTER),
      ] },
      sections: [
        { properties: portrait, children: cover },
        { properties: portrait, headers: { default: header }, footers: { default: footer }, children: [...bab1, ...bab2, ...bab3, ...bab4a] },
        { properties: { ...landscape, type: SectionType.NEXT_PAGE }, headers: { default: header }, footers: { default: footer }, children: bab4b },
        { properties: { ...portrait, type: SectionType.NEXT_PAGE }, headers: { default: header }, footers: { default: footer }, children: [...bab4c, ...bab56, ...bab7, ...lampiran] },
      ],
    });
  }

  /* ---------- struktur awal (label tetap) ---------- */
  const row = (label, hasil = '', ket = '', extra = {}) => ({ label, hasil, ket, rek: '', batas: '', ...extra });
  const rows2 = (L) => L.map(x => row(x, ''));
  const rows3 = (L) => L.map(([l, k]) => row(l, '', '', { kriteria: k }));
  const rowsH = (L) => L.map(([l, h]) => row(l, '', '', { harap: h }));
  function blankModule() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      meta: { isSample: false, nomor: '', periode: '', tglMulai: today, tglSelesai: today, tglLaporan: today, kota: '', jenis: 'Riksa uji berkala', sebelumnya: '', petugas: '' },
      teknis: { kontraktor: '', pengesahan: '', sistem: '', merkPanel: '', jumlahZona: '', lokasiPanel: '', repeater: '', sumberDaya: '', pemantauan: '', klasifikasi: '' },
      perangkat: PERANGKAT.map(() => ({ jumlah: '', merk: '' })),
      alat: [
        { nama: 'Multimeter digital', spek: '', sert: '' }, { nama: 'Insulation tester (megger) 500 V', spek: '', sert: '' }, { nama: 'Earth tester', spek: '', sert: '' },
        { nama: 'Sound level meter', spek: '', sert: '' }, { nama: 'Heat tester / heat gun', spek: '', sert: '–' }, { nama: 'Smoke tester / aerosol', spek: '', sert: '–' },
        { nama: 'Stopwatch', spek: '', sert: '–' }, { nama: 'Kamera dokumentasi', spek: '–', sert: '–' },
      ],
      dokumen: rows2(DOK), panel: rows2(PANEL), sumber: rows3(SUMBER),
      baterai: { iSiaga: '', iAlarm: '', jamSiaga: '24', menitAlarm: '5', kapTerpasang: '' },
      mcp: rows3(MCP), kabel: rows3(KABEL), uji: rowsH(UJI), ujiNote: '',
      interface: INTF.map(([l, h]) => row(l, '', '', { harap: h, terpasang: '' })),
      zones: [], photos: [], gambar: null, rekomendasi: null,
    };
  }
  function sampleModule() {
    const b = blankModule();
    const set = (rows, i, hasil, ket = '', extra = {}) => { Object.assign(rows[i], { hasil, ket }, extra); };
    const all = (rows, ket = {}) => rows.forEach((r, i) => { r.hasil = 'M'; if (ket[i]) r.ket = ket[i]; });
    b.meta = { isSample: true, nomor: '019/LHP-FA/X/2026', periode: 'Riksa Uji Berkala Tahun 2026', tglMulai: '2026-09-28', tglSelesai: '2026-09-29', tglLaporan: '2026-10-02', kota: 'Makassar', jenis: 'Riksa uji berkala (instalasi terpasang sejak 2019)', sebelumnya: 'September 2025 – Laporan No. 012/LHP-FA/IX/2025', petugas: 'Rina Wijaya (HSE Officer)' };
    b.teknis = { kontraktor: 'PT Contoh Proteksi / 2019', pengesahan: '', sistem: 'Konvensional', merkPanel: 'Contoh FP-8 / SN 001234', jumlahZona: '8 zona', lokasiPanel: 'Pos satpam, lobi utama', repeater: 'Ada, 1 unit di ruang HSE', sumberDaya: 'Utama: 220 V AC; Cadangan: baterai 12 V / 7 Ah × 2 (24 V)', pemantauan: 'Tidak ada', klasifikasi: 'Bahaya kebakaran sedang (KEP.186/MEN/1999)' };
    b.perangkat = [{ jumlah: '', merk: 'Contoh' }, { jumlah: '', merk: 'Contoh' }, { jumlah: '', merk: '' }, { jumlah: '', merk: '' }, { jumlah: '12', merk: 'Contoh' }, { jumlah: '10', merk: 'Contoh' }, { jumlah: '6', merk: '' }, { jumlah: '0', merk: '' }];
    all(b.dokumen, { 0: 'Berlaku sampai September 2026', 1: 'Revisi 2023, sesuai kondisi lapangan', 5: '2 dari 2 syarat telah dilaksanakan' });
    set(b.dokumen, 4, 'C', 'Catatan uji bulanan tidak terisi sejak Juli 2026', { rek: 'Laksanakan dan catat uji bulanan detektor / bell.', batas: '≤ 30 hari' });
    all(b.panel, { 1: 'Panel normal, tidak ada FAULT', 3: '8 zona sesuai gambar' });
    set(b.panel, 5, 'C', 'Zona 5 (Gudang Barang Jadi) dinonaktifkan sejak 12 September tanpa catatan', { rek: 'Aktifkan kembali zona 5; catat setiap penonaktifan beserta alasannya.', batas: '≤ 7 hari' });
    all(b.sumber, { 0: 'Dari LVMDP, MCCB khusus alarm, berlabel', 1: '224 V', 2: '27,2 V', 3: '25,1 V', 4: 'Berfungsi, AC FAIL tampil', 5: '0,4 A', 6: 'Baik, umur 2 tahun' });
    b.baterai = { iSiaga: '0.35', iAlarm: '1.8', jamSiaga: '24', menitAlarm: '5', kapTerpasang: '14' };
    all(b.mcp, { 0: '12 unit, semua berfungsi', 1: '1,4 m', 2: 'Jarak tempuh maks. 28 m', 5: '78 dB(A) terendah (di gudang)' });
    set(b.mcp, 5, 'C', '78 dB(A) di Gudang Barang Jadi; bising latar 68 dB(A)', { rek: 'Tambah satu bell di gudang agar ≥ 15 dB di atas bising latar.', batas: '≤ 60 hari' });
    all(b.kabel, { 0: 'Kabel FRC dalam tray tertutup', 3: '850 MΩ', 6: '2,1 Ω' });
    all(b.uji, { 0: 'Zona 1 menyala, bell aktif, 12 detik', 1: 'Zona 3 menyala, 20 detik', 2: 'Zona 2, bell aktif' });
    set(b.uji, 8, 'C', 'Ground fault tampil sebagai FAULT umum, zona tidak ditunjukkan', { rek: 'Periksa pengaturan indikator ground fault pada panel.', batas: '≤ 30 hari' });
    b.ujiNote = 'Waktu respons rata-rata detektor asap 14 detik dan detektor panas 25 detik, di bawah batas pabrikan 60 detik.';
    b.interface.forEach((r, i) => { r.terpasang = [0, 1, 3].includes(i) ? 'Ya' : 'Tidak ada'; r.hasil = [0, 1, 3].includes(i) ? 'M' : ''; });
    b.interface[0].ket = ''; b.interface[1].ket = '';
    const z = (kode, lokasi, jenis, tp, du, bf, tinggi, jarak, fails = [], extra = {}) => { const checks = Array(9).fill('v'); fails.forEach(i => { checks[i] = 'x'; }); return { id: kode, kode, lokasi, jenis, terpasang: tp, diuji: du, berfungsi: bf, tinggi, jarak, checks, statusOverride: '', temuan: '', rekomendasi: '', batas: '', photos: [], ...extra }; };
    b.zones = [
      z('Z-01', 'Lobi dan Kantor Lt.1', 'Asap (fotolistrik)', '14', '14', '14', '3,0', '8 m / 64 m²'),
      z('Z-02', 'Kantor Lt.2', 'Asap (fotolistrik)', '16', '16', '16', '3,0', '8 m / 64 m²'),
      z('Z-03', 'Produksi Line 1', 'Panas (tetap)', '20', '20', '19', '6,0', '6 m / 36 m²', [], { temuan: 'Detektor panas D-03-11 tidak merespons heat tester.', rekomendasi: 'Ganti detektor D-03-11, lalu uji ulang.' }),
      z('Z-04', 'Produksi Line 2', 'Panas (tetap)', '20', '20', '20', '6,0', '6 m / 36 m²'),
      z('Z-05', 'Gudang Barang Jadi', 'Asap (fotolistrik)', '18', '18', '18', '8,0', '9 m / 81 m²', [3], { temuan: 'Tiga detektor tertutup tumpukan karton dan rak barang.', rekomendasi: 'Pindahkan barang agar ruang bebas 0,5 m di bawah detektor.', batas: 'Segera (≤ 7 hari)' }),
      z('Z-06', 'Ruang Genset', 'Panas (rate-of-rise)', '4', '4', '4', '4,0', '5 m / 25 m²'),
      z('Z-07', 'Kantin', 'Panas (tetap)', '6', '6', '6', '3,0', '5 m / 25 m²'),
      z('Z-08', 'Workshop', 'Asap (fotolistrik)', '10', '10', '10', '5,0', '8 m / 64 m²', [6]),
    ];
    b.zones.forEach(zz => { zz.statusOverride = ''; });
    return b;
  }

  return { JENIS_OPT, PLC_ITEMS, PLC_CRIT, PERANGKAT, SECTIONS, grp, statusOf, autoStatus, autoTemuan, failedChecks, badDet, recap, totals, perangkat, battery, findings, conclusions, autoRecommendations, buildFireAlarm, blankModule, sampleModule, fmtNum, fmtRange, num };
})();
if (typeof module !== 'undefined') module.exports = RF;
