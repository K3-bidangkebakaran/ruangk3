/* ===== Generator Laporan Riksa Uji Instalasi Hidran (.docx) =====
   Acuan prosedur: INS.11/M/BW/1997 butir IV.8.
   RH.buildHydrant(H, docx) -> docx.Document  (H = data modul hidran + pjk3 + klien) */
const RH = (() => {
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const GEDUNG_ITEMS = [
    'Kotak mudah terlihat, bertanda "HIDRAN", tidak terkunci',
    'Akses ke kotak hidran tidak terhalang',
    'Katup 1,5" mudah dibuka, tidak bocor',
    'Selang lengkap (30 m), tidak bocor atau getas',
    'Kopling terpasang kuat, gasket baik',
    'Nozzle tersedia dan berfungsi',
    'Kondisi fisik kotak (karat, engsel, kaca)',
  ];
  const HALAMAN_ITEMS = [
    'Pilar kokoh, tidak bocor, dicat merah',
    'Katup pilar mudah dibuka dan ditutup',
    'Kopling 2,5" dan tutup kopling lengkap',
    'Hose cabinet lengkap (2 selang 2,5" × 30 m, nozzle, kunci pilar)',
    'Akses dari jalan tidak terhalang',
  ];
  // butir yang menyangkut fungsi pemadaman -> Tidak; sisanya -> Catatan
  const CRITICAL = { gedung: [2, 3, 4, 5], halaman: [0, 1, 3] };
  const itemsOf = (pt) => pt.jenis === 'halaman' ? HALAMAN_ITEMS : GEDUNG_ITEMS;
  const LABEL = { M: 'Memenuhi', C: 'Catatan', T: 'Tidak' };
  const FILL = { M: 'E2F0D9', C: 'FFF2CC', T: 'F8CBAD' };
  const SECTIONS = {
    dokumen: 'Dokumen', rumah: 'Rumah pompa', ujiPompa: 'Uji fungsi pompa', listrik: 'Instalasi listrik pompa', siamese: 'Sambungan Damkar',
  };

  const failed = (pt) => (pt.checks || []).map((v, i) => v === 'x' ? i : -1).filter(i => i >= 0);
  function autoStatus(pt) {
    const f = failed(pt);
    if (!f.length) return 'M';
    return f.some(i => (CRITICAL[pt.jenis] || CRITICAL.gedung).includes(i)) ? 'T' : 'C';
  }
  const statusOf = (pt) => pt.statusOverride || autoStatus(pt);
  const autoTemuan = (pt) => failed(pt).map(i => itemsOf(pt)[i]).join('; ') + (failed(pt).length ? ' – tidak memenuhi.' : '');
  const defBatas = (s) => s === 'T' ? 'Segera (≤ 7 hari)' : '≤ 30 hari';

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
  function terbilang(n) {
    const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    if (!n) return 'nol';
    const f = (x) => x < 12 ? s[x] : x < 20 ? f(x - 10) + ' belas' : x < 100 ? f(Math.floor(x / 10)) + ' puluh' + (x % 10 ? ' ' + f(x % 10) : '') : x < 200 ? 'seratus' + (x - 100 ? ' ' + f(x - 100) : '') : f(Math.floor(x / 100)) + ' ratus' + (x % 100 ? ' ' + f(x % 100) : '');
    return f(n);
  }

  // ---- evaluasi otomatis ----
  function water(H) {
    const m3 = num(H.teknis.reservoirM3), q = num(H.teknis.debitLpm);
    if (!m3 || !q) return null;
    const min = m3 * 1000 / q;
    return { m3, q, min, ok: min >= 30 };
  }
  function uji3Eval(H) {
    const rows = (H.uji3 || []).map((r, i) => {
      const pt = num(r.pitot), mn = num(r.mano);
      if (pt == null && mn == null) return { ...r, hasil: '' };
      let ok = (pt == null || pt <= 7) && (mn == null || mn <= 7);
      if (i === 1) ok = ok && pt != null && pt >= 4.5;
      return { ...r, hasil: ok ? 'M' : 'T' };
    });
    const vals = rows.flatMap(r => [num(r.pitot), num(r.mano)]).filter(v => v != null);
    const max = vals.length ? Math.max(...vals) : null;
    const far = rows[1] ? num(rows[1].pitot) : null;
    return { rows, max, far, ok: rows.every(r => r.hasil !== 'T') && rows.some(r => r.hasil) };
  }
  function findings(H) {
    const out = [];
    (H.points || []).forEach(pt => {
      const s = statusOf(pt);
      if (s === 'M' && !(pt.temuan || '').trim()) return;
      out.push({ bagian: `${pt.kode}\n${pt.lokasi || ''}`, temuan: (pt.temuan || '').trim() || autoTemuan(pt) || '–', s: s === 'M' ? 'C' : s,
        rek: (pt.rekomendasi || '').trim() || (s === 'T' ? 'Perbaiki / ganti perlengkapan yang rusak sesuai standar.' : 'Perbaiki sesuai ketentuan.'), batas: (pt.batas || '').trim() || defBatas(s) });
    });
    Object.keys(SECTIONS).forEach(key => (H[key] || []).forEach(r => {
      if (r.hasil === 'C' || r.hasil === 'T') out.push({ bagian: SECTIONS[key], temuan: (r.ket || '').trim() || r.label, s: r.hasil, rek: (r.rek || '').trim() || 'Perbaiki sesuai ketentuan.', batas: (r.batas || '').trim() || defBatas(r.hasil) });
    }));
    const u3 = uji3Eval(H);
    u3.rows.forEach((r, i) => { if (r.hasil === 'T') out.push({ bagian: `Uji operasi hidran (${r.titik})`, temuan: `Tekanan pitot ${r.pitot || '–'} / manometer ${r.mano || '–'} kg/cm² di luar kriteria (maks. 7; titik terjauh min. 4,5 kg/cm²).`, s: 'T', rek: 'Evaluasi kinerja pompa dan jaringan pipa; lakukan perbaikan lalu uji ulang.', batas: defBatas('T') }); });
    const w = water(H);
    if (w && !w.ok) out.push({ bagian: 'Persediaan air', temuan: `Persediaan air hanya ± ${fmtNum(w.min)} menit pada laju aliran rancangan.`, s: 'T', rek: 'Tambah kapasitas reservoir hingga ≥ 30 menit operasi.', batas: '≤ 90 hari' });
    return out.sort((a, b) => (a.s === 'T' ? 0 : 1) - (b.s === 'T' ? 0 : 1));
  }
  function autoRecommendations(H) {
    const r = [];
    if (findings(H).length) r.push('Tindak lanjuti seluruh temuan pada butir 4.8 sesuai batas waktu, lalu sampaikan bukti perbaikan (foto, nota pembelian) kepada PJK3 untuk verifikasi.');
    r.push('Laksanakan uji jalan pompa diesel setiap minggu (tanpa beban, ± 30 menit) dan uji pompa listrik secara berkala, lalu catat pada log pemeliharaan.');
    r.push('Lakukan inspeksi bulanan kotak hidran dan hidran halaman oleh petugas peran kebakaran.');
    r.push('Jaga tangki BBM pompa diesel selalu penuh dan periksa tegangan baterai setiap minggu.');
    r.push('Selenggarakan latihan penggunaan hidran bagi regu penanggulangan kebakaran sesuai KEP.186/MEN/1999.');
    r.push(`Riksa uji berkala berikutnya dijadwalkan paling lambat ${addMonths(H.meta.tglSelesai || H.meta.tglMulai, 12) || '[bulan tahun]'}.`);
    return r;
  }
  function conclusions(H) {
    const out = [];
    const up = H.ujiPompa || [];
    const upBad = up.filter(r => r.hasil === 'T' || r.hasil === 'C');
    const op = up[4] && up[4].tekanan;
    out.push(upBad.length
      ? `Uji fungsi pompa: ${upBad.length} dari ${up.length} langkah tidak sepenuhnya memenuhi (lihat butir 4.3).`
      : `Pompa jockey, pompa utama dan pompa cadangan berfungsi sesuai setting; tekanan operasi pompa utama ${op || '[–]'} kg/cm² (≥ 4,5 kg/cm²).`);
    const u3 = uji3Eval(H);
    out.push(u3.ok
      ? `Uji operasi hidran 3 titik memenuhi kriteria: tekanan tertinggi ${fmtNum(u3.max, 1)} kg/cm² (≤ 7 kg/cm²) dan tekanan titik terjauh ${fmtNum(u3.far, 1)} kg/cm² (≥ 4,5 kg/cm²).`
      : 'Uji operasi hidran 3 titik belum memenuhi kriteria INS.11/M/BW/1997 butir IV.8 (lihat butir 4.5).');
    const ls = H.listrik || [], lsBad = ls.filter(r => r.hasil === 'T' || r.hasil === 'C').length;
    const w = water(H);
    out.push(`Instalasi listrik pompa ${lsBad ? `memiliki ${lsBad} catatan` : 'memenuhi syarat'}; persediaan air ${w ? `± ${fmtNum(w.min)} menit operasi (${w.ok ? 'memenuhi' : 'tidak memenuhi'} ≥ 30 menit)` : 'belum dihitung'}.`);
    const f = findings(H), nT = f.filter(x => x.s === 'T').length, nC = f.length - nT;
    out.push(f.length ? `Terdapat ${f.length} temuan: ${nT} temuan tidak memenuhi dan ${nC} temuan catatan.` : 'Tidak terdapat temuan ketidaksesuaian.');
    const critical = upBad.some(r => r.hasil === 'T') || !u3.ok || (w && !w.ok) || ls.some(r => r.hasil === 'T');
    if (critical) out.push('Secara keseluruhan, instalasi hidran BELUM MEMENUHI SYARAT K3. Surat Keterangan Memenuhi Syarat dapat diajukan setelah temuan diperbaiki dan dilakukan uji ulang oleh PJK3.');
    else if (f.length) out.push(`Secara keseluruhan, instalasi hidran MEMENUHI SYARAT K3 DENGAN CATATAN. ${nT ? 'Surat Keterangan Memenuhi Syarat dapat diajukan setelah temuan berpenilaian "Tidak" diperbaiki dan diverifikasi PJK3.' : 'Seluruh temuan wajib ditindaklanjuti sesuai batas waktu.'}`);
    else out.push('Secara keseluruhan, instalasi hidran MEMENUHI SYARAT K3 dan laporan ini dapat diajukan sebagai dasar penerbitan Surat Keterangan Memenuhi Syarat K3.');
    return out;
  }

  function b64ToBytes(dataUrl) {
    const b64 = dataUrl.split(',')[1];
    if (typeof atob === 'function') { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
    return Buffer.from(b64, 'base64');
  }
  const imgType = (u) => /^data:image\/png/.test(u) ? 'png' : 'jpg';
  const fit = (img, mw, mh) => { const r = Math.min(mw / img.w, mh / img.h); return { width: Math.round(img.w * r), height: Math.round(img.h * r) }; };

  function buildHydrant(H, D) {
    const {
      Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, ImageRun,
      AlignmentType, BorderStyle, HeadingLevel, PageBreak, Header, Footer, PageNumber, LevelFormat, VerticalAlign,
    } = D;
    const RED = '8B1A1A', GRAY = 'F2F2F2', FONT = 'Arial', C = AlignmentType.CENTER;
    const M = H.meta, P = H.pjk3, K = H.klien, T = H.teknis;
    const v = (x, ph) => (x != null && String(x).trim()) ? String(x).trim() : ph;
    const pjkName = v(P.nama, '[Nama PJK3]'), klien = v(K.nama, '[Nama Perusahaan]'), nomor = v(M.nomor, '[Nomor Laporan]');
    const pts = H.points || [];
    const gedung = pts.filter(x => x.jenis !== 'halaman'), halaman = pts.filter(x => x.jenis === 'halaman');
    const nS = parseInt(T.jumlahSiamese, 10) || 0;

    const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color, underline: o.u ? {} : undefined, highlight: o.highlight || (/^\[[^\]]*\]$/.test(text) ? 'yellow' : undefined) });
    const p = (children, o = {}) => new Paragraph({
      children: (Array.isArray(children) ? children : [children]).map(c => typeof c === 'string' ? t(c, o) : c),
      alignment: o.align || AlignmentType.JUSTIFIED, spacing: { before: o.before ?? 0, after: o.after ?? 100, line: o.line || 276 },
      numbering: o.numbering, keepNext: o.keepNext,
    });
    const h1 = (x) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: x, font: FONT })], spacing: { before: 280, after: 140 }, keepNext: true });
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
    const R = (s) => s ? { c: LABEL[s], fill: FILL[s], bold: true } : '–';
    const X = '✗', V = '✓';
    const tglRiksa = fmtRange(M.tglMulai, M.tglSelesai) || '[Tanggal Riksa Uji]';
    const tglLap = fmtDate(M.tglLaporan) || '[Tanggal Laporan]';

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
    const objek = `1 rumah pompa, ${gedung.length} hidran gedung, ${halaman.length} hidran halaman${nS ? `, ${nS} sambungan Damkar` : ''}`;
    const cover = [
      ...kop, spacer(900),
      new Paragraph({ alignment: C, spacing: { after: 120 }, children: [t('LAPORAN HASIL', { bold: true, size: 36 })] }),
      new Paragraph({ alignment: C, spacing: { after: 120 }, children: [t('PEMERIKSAAN DAN PENGUJIAN (RIKSA UJI)', { bold: true, size: 36 })] }),
      new Paragraph({ alignment: C, spacing: { after: 120 }, children: [t('INSTALASI HIDRAN KEBAKARAN', { bold: true, size: 36, color: RED })] }),
      new Paragraph({ alignment: C, spacing: { after: 600 }, children: [t(v(M.periode, '[Periode pemeriksaan]'), { size: 24, italics: true })] }),
      table([3000, 300, 4500], [
        [{ c: 'Nomor Laporan', bold: true }, ':', nomor],
        [{ c: 'Perusahaan', bold: true }, ':', klien],
        [{ c: 'Lokasi', bold: true }, ':', v(K.alamatSingkat || K.alamat, '[Lokasi]')],
        [{ c: 'Tanggal Riksa Uji', bold: true }, ':', tglRiksa],
        [{ c: 'Tanggal Laporan', bold: true }, ':', tglLap],
        [{ c: 'Objek', bold: true }, ':', objek],
      ], { noBorder: true, size: 22 }),
      spacer(900),
      new Paragraph({ alignment: C, spacing: { after: 60 }, children: [t('Mengacu pada Instruksi Menteri Tenaga Kerja No. INS.11/M/BW/1997', { size: 18 })] }),
      new Paragraph({ alignment: C, spacing: { after: 400 }, children: [t('tentang Pengawasan Khusus K3 Penanggulangan Kebakaran, butir IV.8 (Instalasi Hidran)', { size: 18 })] }),
    ];
    if (M.isSample) cover.push(table([9026], [[{ c: [t('Catatan pengisian: ', { bold: true, size: 16 }), t('Data perusahaan, nomor dan hasil pengukuran pada dokumen ini adalah CONTOH FIKTIF. Ganti teks berlatar kuning dan seluruh contoh isian dengan data riksa uji sebenarnya, lalu hapus kotak catatan ini sebelum diterbitkan.', { size: 16, italics: true })], fill: 'FFF8E1' }]]));
    cover.push(pageBreak());

    // ---------- I ----------
    const nPts = `${gedung.length} (${terbilang(gedung.length)}) hidran gedung, ${halaman.length} (${terbilang(halaman.length)}) hidran halaman`;
    const bab1 = [
      h1('I. PENDAHULUAN'),
      h2('1.1 Latar Belakang'),
      p('Undang-Undang No. 1 Tahun 1970 tentang Keselamatan Kerja mewajibkan pengurus mencegah, mengurangi dan memadamkan kebakaran di tempat kerja. Instalasi hidran merupakan sarana proteksi kebakaran aktif yang harus selalu siap beroperasi dengan tekanan dan debit air yang cukup. Instruksi Menteri Tenaga Kerja No. INS.11/M/BW/1997 butir IV.8 menetapkan tata cara pemeriksaan dan pengujian instalasi hidran, termasuk uji fungsi pompa dan uji operasi hidran pada titik terdekat, terjauh dan tengah.'),
      p(`Atas permintaan ${klien}, ${pjkName} selaku PJK3 yang ditunjuk Kementerian Ketenagakerjaan RI telah melaksanakan pemeriksaan dan pengujian terhadap instalasi hidran di lokasi perusahaan.`),
      h2('1.2 Maksud dan Tujuan'),
      bullet('Memastikan instalasi hidran memenuhi persyaratan K3 penanggulangan kebakaran.'),
      bullet('Mengetahui kinerja pompa, tekanan pada titik hidran dan kecukupan persediaan air.'),
      bullet('Mengetahui kondisi fisik dan kelengkapan hidran gedung, hidran halaman dan sambungan Damkar.'),
      bullet('Memberikan rekomendasi perbaikan dan menjadi dasar pengajuan Surat Keterangan Memenuhi Syarat K3 kepada Pengawas Ketenagakerjaan setempat.'),
      h2('1.3 Dasar Hukum dan Acuan Teknis'),
      nl('dasar', 'Undang-Undang No. 1 Tahun 1970 tentang Keselamatan Kerja, khususnya Pasal 3 ayat (1) huruf b dan d serta Pasal 9 ayat (3).'),
      nl('dasar', 'Peraturan Pemerintah No. 50 Tahun 2012 tentang Penerapan Sistem Manajemen Keselamatan dan Kesehatan Kerja (SMK3).'),
      nl('dasar', 'Peraturan Menteri Tenaga Kerja No. PER.04/MEN/1995 tentang Perusahaan Jasa Keselamatan dan Kesehatan Kerja.'),
      nl('dasar', 'Keputusan Menteri Tenaga Kerja No. KEP.186/MEN/1999 tentang Unit Penanggulangan Kebakaran di Tempat Kerja.'),
      nl('dasar', 'Instruksi Menteri Tenaga Kerja No. INS.11/M/BW/1997 tentang Pengawasan Khusus K3 Penanggulangan Kebakaran.'),
      nl('dasar', 'Peraturan Menteri Pekerjaan Umum No. 26/PRT/M/2008 tentang Persyaratan Teknis Sistem Proteksi Kebakaran pada Bangunan Gedung dan Lingkungan (acuan teknis).'),
      nl('dasar', 'SNI 03-1735-2000 (akses bangunan dan hidran lingkungan), SNI 03-1745-2000 (sistem pipa tegak dan slang) dan SNI 03-6570-2001 (instalasi pompa proteksi kebakaran) sebagai acuan teknis.'),
      nl('dasar', 'NFPA 14, NFPA 20 dan NFPA 25 sebagai acuan pelengkap.'),
      h2('1.4 Ruang Lingkup'),
      p(`Riksa uji meliputi pemeriksaan dokumen, rumah pompa beserta pompa jockey, pompa utama dan pompa cadangan, instalasi listrik pompa, persediaan air, jaringan pipa, ${nPts}${nS ? ` dan ${nS} (${terbilang(nS)}) sambungan Damkar (siamese connection)` : ''}, serta pengujian fungsi pompa dan uji operasi hidran.`),
    ];

    // ---------- II ----------
    const bab2 = [
      h1('II. DATA UMUM'),
      h2('2.1 Data Perusahaan (Pemilik Instalasi)'),
      kv([
        ['Nama Perusahaan', klien],
        ['Alamat', v(K.alamat, '[Alamat]')],
        ['Bidang Usaha', v(K.bidang, '[Bidang usaha]')],
        ['Pengurus / Penanggung Jawab', K.pengurus ? `${K.pengurus}${K.jabatanPengurus ? ` (${K.jabatanPengurus})` : ''}` : '[Nama Pengurus]'],
        ['Petugas Pendamping', v(M.petugas || K.petugas, '[Nama petugas]')],
        ['Klasifikasi Bahaya Kebakaran', v(T.klasifikasi, '[Klasifikasi bahaya]')],
      ]),
      spacer(),
      h2('2.2 Data Pelaksana Riksa Uji (PJK3)'),
      kv([
        ['Nama PJK3', pjkName],
        ['No. SK Penunjukan PJK3', v(P.sk, '[Nomor SK Kemnaker]')],
        ['Ahli K3 Pemeriksa', v(P.ahli, '[Nama Ahli K3 Spesialis Penanggulangan Kebakaran]')],
        ['No. Lisensi / SKP Ahli K3', v(P.lisensi, '[Nomor Lisensi]')],
        ['Teknisi Pendamping', v(P.teknisi, '[Nama Teknisi]')],
      ]),
      spacer(),
      h2('2.3 Waktu dan Jenis Pemeriksaan'),
      kv([
        ['Tanggal Pelaksanaan', tglRiksa],
        ['Jenis Pemeriksaan', v(M.jenis, '[Jenis pemeriksaan]')],
        ['Riksa Uji Sebelumnya', v(M.sebelumnya, '–')],
      ]),
      spacer(),
      h2('2.4 Data Teknis Instalasi'),
      kv([
        ['Kontraktor Pemasang / Tahun', v(T.kontraktor, '[Kontraktor / tahun]')],
        ['Pengesahan Instalasi', v(T.pengesahan, '[Nomor pengesahan / Suket sebelumnya]')],
        ['Sumber Air', v(T.sumberAir, '[Sumber air]')],
        ['Jaringan Pipa', v(T.pipa, '[Spesifikasi pipa]')],
        ['Hidran Gedung', `${gedung.length} titik${T.specGedung ? ', ' + T.specGedung : ''}`],
        ['Hidran Halaman', `${halaman.length} titik${T.specHalaman ? ' ' + T.specHalaman : ''}`],
        ['Sambungan Damkar', nS ? `${nS} unit${T.specSiamese ? ' ' + T.specSiamese : ''}` : 'Tidak ada'],
      ]),
      sub('Data pompa (nameplate)'),
      table([1700, 1500, 1500, 1400, 1450, 1476], [
        ['Pompa', 'Merk / Tipe', 'Kapasitas', 'Head / Tekanan', 'Penggerak', 'Daya / Putaran'],
        ...(H.pompa || []).filter(x => x.pompa).map(x => [x.pompa, v(x.merk, '[Merk / tipe]'), x.kapasitas || '–', x.head || '–', x.penggerak || '–', x.daya || '–']),
      ], { header: true, size: 17, aligns: [null, null, C, C, null, C] }),
    ];

    // ---------- III ----------
    const alat = (H.alat || []).filter(a => a.nama);
    const bab3 = [
      h1('III. METODE DAN PERALATAN'),
      h2('3.1 Metode Pemeriksaan dan Pengujian'),
      p('Pemeriksaan dan pengujian dilaksanakan mengikuti butir IV.8 INS.11/M/BW/1997, dengan urutan:'),
      nl('metode', [t('Pemeriksaan dokumen: ', { bold: true }), t('pengesahan, gambar instalasi, katalog pompa dan petunjuk pemeliharaan; tindak lanjut syarat dari riksa uji sebelumnya.')]),
      nl('metode', [t('Pemeriksaan panel kontrol dan rumah pompa: ', { bold: true }), t('panel dalam kondisi stand by (auto), pencatatan data teknis pompa, motor, penggerak dan perlengkapannya.')]),
      nl('metode', [t('Pemeriksaan persediaan air: ', { bold: true }), t('kapasitas reservoir dibandingkan kebutuhan air untuk operasi pemadaman.')]),
      nl('metode', [t('Uji fungsi pompa (7 langkah): ', { bold: true }), t('pencatatan tekanan stand by, start/stop pompa jockey, start dan operasi pompa utama, tekanan saat katup uji ditutup dan fungsi katup pengaman, serta start dan operasi pompa cadangan.')]),
      nl('metode', [t('Pemeriksaan instalasi listrik pompa: ', { bold: true }), t('sumber daya, kabel, beban lain dan rating pengaman rangkaian; pengukuran tegangan, arus dan tahanan isolasi.')]),
      nl('metode', [t('Uji operasi hidran 3 titik: ', { bold: true }), t('hidran terdekat, terjauh dan tengah dibuka bertahap; tekanan pada nozzle diukur dengan pitot gauge dan tekanan di rumah pompa dicatat dari manometer.')]),
      nl('metode', [t('Pemeriksaan visual: ', { bold: true }), t('jaringan pipa, katup, hidran gedung, hidran halaman dan sambungan Damkar.')]),
      h2('3.2 Peralatan yang Digunakan'),
      table([600, 3200, 2600, 2626], [
        ['No', 'Nama Peralatan', 'Spesifikasi', 'No. Sertifikat Kalibrasi'],
        ...(alat.length ? alat : [{ nama: '[Nama peralatan]' }]).map((a, i) => [String(i + 1), a.nama, a.spek || '–', a.sert || '–']),
      ], { header: true, aligns: [C] }),
      h2('3.3 Kriteria Penerimaan'),
      table([3000, 3926, 2100], [
        ['Parameter', 'Kriteria', 'Acuan'],
        ['Tekanan pompa utama', '≥ 4,5 kg/cm²', 'INS.11/1997 IV.8'],
        ['Kapasitas pompa utama', '≥ 500 US GPM (± 1.893 L/menit), sesuai katalog', 'INS.11/1997 IV.8'],
        ['Tekanan pada titik hidran', 'Maksimum 7 kg/cm²', 'INS.11/1997 IV.8'],
        ['Tekanan pada titik terjauh', 'Minimum 4,5 kg/cm²', 'INS.11/1997 IV.8'],
        ['Pengaman rangkaian motor pompa', 'Tahan 125% arus beban penuh terus-menerus; membuka pada 600% arus beban penuh dalam 20 – 50 detik', 'INS.11/1997 IV.8'],
        ['Sumber daya pompa', 'Dari panel utama dengan sakelar tersendiri, tanpa beban lain, kabel tahan api atau dalam conduit', 'INS.11/1997 IV.8'],
        ['Persediaan air', 'Menjamin kebutuhan air untuk operasi pemadaman sesuai standar; acuan ≥ 30 menit pada laju aliran rancangan', 'INS.11/1997 IV.8; SNI 03-1745-2000'],
        ['Tahanan isolasi motor', '≥ 1 MΩ (uji 500 V DC)', 'PUIL 2011'],
      ], { header: true, size: 17 }),
      spacer(60),
      table([2200, 6826], [
        ['Penilaian', 'Arti'],
        [R('M'), 'Butir pemeriksaan memenuhi kriteria.'],
        [R('C'), 'Instalasi tetap berfungsi, namun terdapat kekurangan yang wajib diperbaiki pengurus.'],
        [R('T'), 'Tidak memenuhi kriteria dan mengurangi kesiapan instalasi; wajib segera diperbaiki.'],
      ], { header: true }),
    ];

    // ---------- IV ----------
    const rowsSimple = (rows) => rows.map((r, i) => [String(i + 1), r.label, R(r.hasil), v(r.ket, '–')]);
    const u3 = uji3Eval(H);
    const w = water(H);
    const bab4 = [
      h1('IV. HASIL PEMERIKSAAN DAN PENGUJIAN'),
      h2('4.1 Pemeriksaan Dokumen'),
      table([450, 4600, 1300, 2676], [['No', 'Dokumen', 'Hasil', 'Keterangan'], ...rowsSimple(H.dokumen || [])], { header: true, size: 17, aligns: [C, null, C] }),
      h2('4.2 Rumah Pompa, Pompa dan Persediaan Air'),
      table([450, 4600, 1300, 2676], [['No', 'Butir Pemeriksaan', 'Hasil', 'Keterangan'], ...rowsSimple(H.rumah || [])], { header: true, size: 17, aligns: [C, null, C] }),
      h2('4.3 Uji Fungsi Pompa'),
      p('Pompa dijalankan melalui katup uji di rumah pompa. Hasil pengukuran mengikuti 7 langkah pada INS.11/M/BW/1997 butir IV.8:'),
      table([450, 4300, 1500, 1400, 1376], [
        ['No', 'Langkah Pengujian', 'Tekanan (kg/cm²)', 'Setting Rancangan', 'Hasil'],
        ...(H.ujiPompa || []).map((r, i) => [String(i + 1), r.label, v(r.tekanan, '–'), v(r.setting, '–'), R(r.hasil)]),
      ], { header: true, size: 17, aligns: [C, null, C, C, C] }),
    ];
    if ((H.ujiPompaNote || '').trim()) bab4.push(note(H.ujiPompaNote.trim()));
    bab4.push(
      h2('4.4 Instalasi Listrik Pompa'),
      table([450, 4100, 2200, 1100, 1176], [
        ['No', 'Butir Pemeriksaan / Pengukuran', 'Hasil Ukur / Temuan', 'Kriteria', 'Hasil'],
        ...(H.listrik || []).map((r, i) => [String(i + 1), r.label, v(r.ket, '–'), v(r.kriteria, '–'), R(r.hasil)]),
      ], { header: true, size: 17, aligns: [C, null, null, C, C] }),
      h2('4.5 Uji Operasi Hidran 3 Titik'),
      p('Hidran dibuka bertahap dengan titik sebelumnya tetap terbuka. Tekanan pada nozzle diukur dengan pitot gauge; tekanan di rumah pompa dibaca dari manometer sisi tekan.'),
      table([450, 1500, 2600, 1500, 1600, 1376], [
        ['No', 'Titik Uji', 'Lokasi', 'Tekanan Nozzle / Pitot (kg/cm²)', 'Manometer Rumah Pompa (kg/cm²)', 'Hasil'],
        ...u3.rows.map((r, i) => [String(i + 1), `${r.titik}${r.kode ? ` (${r.kode})` : ''}`, `${v(r.lokasi, '[Lokasi]')}${i === 1 ? ' (titik 1 tetap terbuka)' : i === 2 ? ' (titik 1 dan 2 tetap terbuka)' : ''}`, v(r.pitot, '–'), v(r.mano, '–'), R(r.hasil)]),
      ], { header: true, size: 17, aligns: [C, null, null, C, C, C] }),
    );
    if (u3.max != null) bab4.push(note(`Evaluasi: tekanan tertinggi selama uji operasi ${fmtNum(u3.max, 1)} kg/cm² (${u3.max <= 7 ? '≤' : '>'} 7 kg/cm²) dan tekanan pada titik terjauh ${u3.far != null ? fmtNum(u3.far, 1) : '–'} kg/cm² (${u3.far != null && u3.far >= 4.5 ? '≥' : '<'} 4,5 kg/cm²). Uji operasi hidran ${u3.ok ? 'memenuhi' : 'belum memenuhi'} kriteria INS.11/M/BW/1997 butir IV.8.`));

    // matriks titik hidran
    const matrix = (list, items, labelW, perTable) => {
      const out = [];
      for (let s = 0; s < list.length; s += perTable) {
        const chunk = list.slice(s, s + perTable);
        const colW = Math.floor((9026 - 400 - labelW) / perTable);
        const widths = [400, labelW, ...Array(chunk.length).fill(colW)];
        const head = (x) => colW >= 900 ? x.kode : ((/(\d+)\s*$/.exec(x.kode || '') || [])[1] || x.kode);
        if (s > 0) out.push(spacer(80));
        out.push(table(widths, [
          ['No', 'Butir Pemeriksaan', ...chunk.map(head)],
          ...items.map((it, i) => [String(i + 1), it, ...chunk.map(x => (x.checks || [])[i] === 'x' ? { c: X, fill: FILL.T, bold: true } : V)]),
          [{ c: 'Penilaian', bold: true, fill: GRAY, span: 2, align: AlignmentType.RIGHT }, ...chunk.map(x => { const s2 = statusOf(x); return { c: s2, fill: FILL[s2], bold: true }; })],
        ], { header: true, size: 16, aligns: [C, null, ...Array(chunk.length).fill(C)] }));
      }
      return out;
    };
    bab4.push(h2('4.6 Hidran Gedung, Hidran Halaman dan Sambungan Damkar'), sub('a. Hidran gedung (kotak hidran)'));
    if (gedung.length) {
      bab4.push(...matrix(gedung, GEDUNG_ITEMS, 3230, 10));
      bab4.push(note(`Lokasi: ${gedung.map(x => `${x.kode} ${x.lokasi || ''}`.trim()).join('; ')}. ${V} = memenuhi; ${X} = tidak memenuhi. M = Memenuhi, C = Catatan, T = Tidak memenuhi.`));
    } else bab4.push(p('Tidak terdapat hidran gedung.'));
    bab4.push(sub('b. Hidran halaman (pilar)'));
    if (halaman.length) {
      bab4.push(...(halaman.length <= 4 ? matrix(halaman, HALAMAN_ITEMS, 4826, 4) : matrix(halaman, HALAMAN_ITEMS, 3230, 10)));
      bab4.push(note(`Lokasi: ${halaman.map(x => `${x.kode} ${x.lokasi || ''}`.trim()).join('; ')}.`));
    } else bab4.push(p('Tidak terdapat hidran halaman.'));
    bab4.push(sub('c. Sambungan Damkar (siamese connection)'));
    if (nS) bab4.push(table([450, 4600, 1300, 2676], [['No', 'Butir Pemeriksaan', 'Hasil', 'Keterangan'], ...rowsSimple(H.siamese || [])], { header: true, size: 17, aligns: [C, null, C] }));
    else bab4.push(p('Instalasi tidak dilengkapi sambungan Damkar.'));
    bab4.push(
      h2('4.7 Kecukupan Persediaan Air'),
      w ? kv([
        ['Volume efektif reservoir', `${fmtNum(w.m3)} m³ (${fmtNum(w.m3 * 1000)} liter)`],
        ['Laju aliran rancangan', `${T.debitLabel ? T.debitLabel + ' ≈ ' : ''}${fmtNum(w.q)} liter/menit`],
        ['Waktu operasi tersedia', `${fmtNum(w.m3 * 1000)} ÷ ${fmtNum(w.q)} ≈ ${fmtNum(w.min)} menit`],
        ['Kriteria acuan', '≥ 30 menit pada laju aliran rancangan (SNI 03-1745-2000)'],
        ['Hasil', w.ok ? 'Memenuhi' : 'Tidak memenuhi'],
      ]) : p([t('[Isi volume reservoir dan laju aliran rancangan]')]),
    );
    const F = findings(H);
    bab4.push(h2('4.8 Temuan dan Ketidaksesuaian'));
    if (F.length) bab4.push(table([400, 1600, 2150, 1050, 2526, 1300], [
      ['No', 'Bagian / Lokasi', 'Temuan', 'Penilaian', 'Rekomendasi', 'Batas Waktu'],
      ...F.map((f, i) => [String(i + 1), f.bagian, f.temuan, { c: f.s === 'T' ? 'Tidak' : 'Catatan', fill: FILL[f.s], bold: true }, f.rek, f.batas]),
    ], { header: true, size: 17, aligns: [C, null, null, C, null, C] }));
    else bab4.push(p('Tidak terdapat temuan ketidaksesuaian pada pemeriksaan ini.'));
    bab4.push(spacer());

    // ---------- V, VI ----------
    const rekom = (H.rekomendasi && H.rekomendasi.some(x => x.trim())) ? H.rekomendasi : autoRecommendations(H);
    const bab56 = [
      h1('V. KESIMPULAN'),
      p(`Berdasarkan hasil pemeriksaan dan pengujian instalasi hidran di ${klien} pada tanggal ${tglRiksa}, disimpulkan bahwa:`),
      ...conclusions(H).map(x => nl('simpul', x)),
      h1('VI. REKOMENDASI'),
      ...rekom.filter(x => x.trim()).map(x => bullet(x.trim())),
    ];

    // ---------- VII ----------
    const W = [3008, 3010, 3008];
    const sc = (lines, wd) => new TableCell({ width: { size: wd, type: WidthType.DXA }, borders: noBorders, verticalAlign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: lines.map(([txt, st]) => new Paragraph({ alignment: C, keepNext: true, spacing: { after: 0 }, children: [t(txt, { size: st.size || 18, bold: st.bold, u: st.u })] })) });
    const bab7 = [
      h1('VII. PERNYATAAN DAN PENGESAHAN'),
      p('Laporan ini disusun berdasarkan kondisi instalasi hidran pada saat pemeriksaan dan pengujian dilaksanakan. Perubahan kondisi setelah tanggal tersebut di luar tanggung jawab PJK3. Laporan ini disampaikan kepada Pengawas Ketenagakerjaan setempat sebagai dasar penerbitan Surat Keterangan Memenuhi Syarat K3.'),
      p([t(`${v(M.kota, '[Kota]')}, ${tglLap}`, { bold: true })], { align: AlignmentType.RIGHT, before: 120, after: 200, keepNext: true }),
      new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: W, rows: [
        new TableRow({ cantSplit: true, children: [
          sc([['Diperiksa oleh,', {}], ['Ahli K3 Spesialis', { bold: true }], ['Penanggulangan Kebakaran', { bold: true }]], W[0]),
          sc([['Disetujui oleh,', {}], [pjkName, { bold: true }], ['', {}]], W[1]),
          sc([['Mengetahui,', {}], [klien, { bold: true }], ['', {}]], W[2]),
        ] }),
        new TableRow({ cantSplit: true, height: { value: 1300, rule: 'atLeast' }, children: W.map(wd => sc([['', {}]], wd)) }),
        new TableRow({ cantSplit: true, children: [
          sc([[v(P.ahli, '[Nama Ahli K3]'), { bold: true, u: true }], [`No. Lisensi: ${v(P.lisensi, '[....]')}`, { size: 16 }]], W[0]),
          sc([[v(P.direktur, '[Nama Direktur]'), { bold: true, u: true }], [v(P.jabatanDirektur, 'Direktur'), { size: 16 }]], W[1]),
          sc([[v(K.pengurus, '[Nama Pengurus]'), { bold: true, u: true }], [`${v(K.jabatanPengurus, 'Pimpinan')} (Pengurus)`, { size: 16 }]], W[2]),
        ] }),
      ] }),
      pageBreak(),
    ];

    // ---------- Lampiran ----------
    const photos = [];
    (H.photos || []).forEach(ph => photos.push({ ...ph, label: ph.caption || 'Dokumentasi' }));
    pts.forEach(x => (x.photos || []).forEach(ph => photos.push({ ...ph, label: `${x.kode}${ph.caption ? ': ' + ph.caption : ''}` })));
    const photoCell = (ph) => new TableCell({
      width: { size: 4513, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 80, right: 80 }, verticalAlign: VerticalAlign.BOTTOM,
      children: ph ? [
        new Paragraph({ alignment: C, spacing: { after: 0 }, children: [new ImageRun({ type: imgType(ph.data), data: b64ToBytes(ph.data), transformation: fit(ph, 280, 210) })] }),
        new Paragraph({ alignment: C, spacing: { before: 60, after: 0 }, children: [t(ph.label, { size: 16, bold: true })] }),
      ] : [new Paragraph({ children: [] })],
    });
    const lampiran = [h1('LAMPIRAN'), h2('Lampiran A – Dokumentasi')];
    if (photos.length) {
      const rows = [];
      for (let i = 0; i < photos.length; i += 2) rows.push(new TableRow({ cantSplit: true, children: [photoCell(photos[i]), photoCell(photos[i + 1])] }));
      lampiran.push(new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: [4513, 4513], rows }));
    } else lampiran.push(p([t('[Belum ada foto dokumentasi]', { italics: true })]));
    lampiran.push(h2('Lampiran B – Gambar Instalasi'));
    if (H.gambar && H.gambar.data) lampiran.push(new Paragraph({ alignment: C, children: [new ImageRun({ type: imgType(H.gambar.data), data: b64ToBytes(H.gambar.data), transformation: fit(H.gambar, 600, 760) })] }));
    else lampiran.push(p([t('[Sisipkan denah / skema jaringan hidran; tandai titik uji terdekat, terjauh dan tengah]', { italics: true })]));
    lampiran.push(
      h2('Lampiran C – Dokumen Pendukung'),
      bullet('Salinan SK Penunjukan PJK3 dari Kementerian Ketenagakerjaan RI.'),
      bullet('Salinan Lisensi / SKP Ahli K3 Spesialis Penanggulangan Kebakaran.'),
      bullet('Sertifikat kalibrasi peralatan uji (pitot gauge, pressure gauge, clamp meter, insulation tester).'),
      bullet('Data teknis / katalog pompa dan kurva karakteristik pengaman motor.'),
      bullet('Formulir lapangan / berita acara riksa uji yang ditandatangani kedua pihak.'),
    );

    const header = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RED, space: 2 } },
      children: [t(`Laporan Riksa Uji Instalasi Hidran  |  No. ${M.nomor || '-'}`, { size: 16, color: '666666' })] })] });
    const footer = new Footer({ children: [new Paragraph({ alignment: C, children: [t('Halaman ', { size: 16, color: '666666' }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '666666' }), t(' dari ', { size: 16, color: '666666' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: '666666' })] })] });
    const numCfg = (ref, fmt) => ({ reference: ref, levels: [{ level: 0, format: fmt, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 360 } }, run: { font: FONT } } }] });
    const portrait = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1200, left: 1440, right: 1440, header: 600, footer: 600 } } };
    return new Document({
      creator: pjkName, title: 'Laporan Hasil Riksa Uji Instalasi Hidran',
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
        { properties: portrait, headers: { default: header }, footers: { default: footer }, children: [...bab1, ...bab2, ...bab3, ...bab4, ...bab56, ...bab7, ...lampiran] },
      ],
    });
  }

  // ---------- struktur baris pemeriksaan (label tetap) ----------
  const row = (label, hasil = 'M', ket = '', extra = {}) => ({ label, hasil, ket, rek: '', batas: '', ...extra });
  function blankModule() {
    const today = new Date().toISOString().slice(0, 10);
    const s = sampleModule();
    const clear = (rows) => rows.map(r => ({ ...r, hasil: '', ket: '', rek: '', batas: '', tekanan: r.tekanan != null ? '' : undefined }));
    return {
      meta: { isSample: false, nomor: '', periode: '', tglMulai: today, tglSelesai: today, tglLaporan: today, kota: '', jenis: 'Riksa uji berkala', sebelumnya: '', petugas: '' },
      teknis: { kontraktor: '', pengesahan: '', sumberAir: '', pipa: '', specGedung: s.teknis.specGedung, specHalaman: s.teknis.specHalaman, jumlahSiamese: '1', specSiamese: '', reservoirM3: '', debitLpm: '1893', debitLabel: '500 US GPM', klasifikasi: '' },
      pompa: s.pompa.map(x => ({ pompa: x.pompa, merk: '', kapasitas: '', head: '', penggerak: x.penggerak, daya: '' })),
      alat: s.alat.map(a => ({ ...a })),
      dokumen: clear(s.dokumen), rumah: clear(s.rumah), siamese: clear(s.siamese),
      ujiPompa: s.ujiPompa.map(r => ({ ...r, tekanan: '', hasil: '', ket: '', rek: '', batas: '' })),
      ujiPompaNote: '',
      listrik: s.listrik.map(r => ({ ...r, ket: '', hasil: '', rek: '', batas: '' })),
      uji3: s.uji3.map(r => ({ titik: r.titik, kode: '', lokasi: '', pitot: '', mano: '' })),
      points: [], photos: [], gambar: null, rekomendasi: null,
    };
  }
  function sampleModule() {
    const ok = (n) => Array(n).fill('v');
    const pt = (kode, jenis, lokasi, fails = [], extra = {}) => { const checks = ok(jenis === 'halaman' ? 5 : 7); fails.forEach(i => { checks[i] = 'x'; }); return { id: kode, kode, jenis, lokasi, checks, statusOverride: '', temuan: '', rekomendasi: '', batas: '', photos: [], ...extra }; };
    return {
      meta: { isSample: true, nomor: '018/LHP-HYD/IX/2026', periode: 'Riksa Uji Berkala Tahun 2026', tglMulai: '2026-09-24', tglSelesai: '2026-09-25', tglLaporan: '2026-09-30', kota: 'Makassar', jenis: 'Riksa uji berkala (instalasi terpasang sejak 2019)', sebelumnya: 'September 2025 – Laporan No. 011/LHP-HYD/IX/2025', petugas: 'Rina Wijaya (HSE Officer); Andi Pratama (Teknisi Utility)' },
      teknis: { kontraktor: 'PT Contoh Instalindo / 2019', pengesahan: '', sumberAir: 'Ground reservoir beton 150 m³, pengisian dari PDAM dan sumur dalam', pipa: 'Pipa baja (carbon steel) SCH 40, ring main 6", cabang 4" dan 2,5", dicat merah', specGedung: 'kotak hidran berisi selang 1,5" × 30 m, nozzle dan katup 1,5"', specHalaman: 'pilar 2 × 2,5" dengan hose cabinet', jumlahSiamese: '1', specSiamese: 'siamese 2 × 2,5" di sisi gerbang utama', reservoirM3: '150', debitLpm: '1893', debitLabel: '500 US GPM', klasifikasi: 'Bahaya kebakaran sedang (KEP.186/MEN/1999)' },
      pompa: [
        { pompa: 'Jockey', merk: '', kapasitas: '25 US GPM', head: '90 m (9 kg/cm²)', penggerak: 'Motor listrik', daya: '3 kW / 2.900 rpm' },
        { pompa: 'Utama (elektrik)', merk: '', kapasitas: '500 US GPM', head: '80 m (8 kg/cm²)', penggerak: 'Motor listrik 380 V', daya: '45 kW / 2.950 rpm' },
        { pompa: 'Cadangan (diesel)', merk: '', kapasitas: '500 US GPM', head: '80 m (8 kg/cm²)', penggerak: 'Mesin diesel', daya: '75 HP / 2.950 rpm' },
      ],
      alat: [
        { nama: 'Pitot gauge', spek: '0 – 10 kg/cm²', sert: '' },
        { nama: 'Pressure gauge digital', spek: '0 – 25 bar, akurasi ±0,5%', sert: '' },
        { nama: 'Clamp meter', spek: 'AC 1.000 A, 600 V', sert: '' },
        { nama: 'Insulation tester', spek: '500 / 1.000 V DC', sert: '' },
        { nama: 'Stopwatch', spek: 'Resolusi 0,01 detik', sert: '–' },
        { nama: 'Laser distance meter & meteran', spek: '0,05 – 50 m', sert: '–' },
        { nama: 'Kamera dokumentasi', spek: '–', sert: '–' },
      ],
      dokumen: [
        row('Pengesahan / Suket instalasi sebelumnya', 'M', 'Berlaku sampai September 2026'),
        row('Gambar instalasi (as built drawing)', 'M', 'Revisi 2023, sesuai kondisi lapangan'),
        row('Katalog / data teknis pompa', 'M', 'Tersedia untuk ketiga pompa'),
        row('Petunjuk pemeliharaan & log uji mingguan pompa', 'C', 'Log uji mingguan pompa diesel tidak terisi sejak Juli 2026', { rek: 'Laksanakan dan catat uji jalan mingguan pompa diesel.', batas: '≤ 7 hari' }),
        row('Tindak lanjut syarat riksa uji sebelumnya', 'M', '3 dari 3 syarat telah dilaksanakan'),
      ],
      rumah: [
        row('Panel kontrol pompa dalam kondisi stand by (auto)', 'M', 'Ketiga pompa pada posisi AUTO'),
        row('Rumah pompa: ventilasi, penerangan, drainase, tidak dipakai sebagai gudang', 'M'),
        row('Kondisi fisik pompa dan penggerak, tidak ada kebocoran seal', 'M'),
        row('Katup hisap dan katup tekan terbuka penuh dan dikunci/disegel terbuka', 'M'),
        row('Manometer sisi hisap dan sisi tekan berfungsi', 'C', 'Manometer jalur jockey tidak kembali ke nol; label kalibrasi kedaluwarsa', { rek: 'Ganti atau kalibrasi manometer.', batas: '≤ 30 hari' }),
        row('Katup uji (test valve) dan flow meter tersedia', 'M'),
        row('Katup pengaman (relief valve) berfungsi', 'M', 'Lihat uji fungsi pompa langkah 6'),
        row('Pompa diesel: baterai, bahan bakar, oli, air radiator, knalpot', 'C', 'BBM pompa diesel 55% dari kapasitas tangki 400 L', { rek: 'Isi penuh tangki BBM pompa diesel.', batas: '≤ 7 hari' }),
        row('Persediaan air (reservoir, indikator level, katup pengisi otomatis)', 'M', 'Lihat perhitungan 4.7'),
        row('Jaringan pipa: dicat merah, tidak bocor/korosi, penyangga kokoh', 'M'),
      ],
      ujiPompa: [
        row('Tekanan jaringan dalam kondisi stand by', 'M', '', { tekanan: '8,0', setting: '8,0' }),
        row('Katup uji dibuka sedikit; pompa jockey start pada tekanan', 'M', '', { tekanan: '7,0', setting: '7,0' }),
        row('Katup uji ditutup; pompa jockey stop pada tekanan', 'M', '', { tekanan: '8,0', setting: '8,0' }),
        row('Katup uji dibuka hingga pompa utama start; tekanan saat start', 'M', '', { tekanan: '6,0', setting: '6,0' }),
        row('Tekanan operasi pompa utama (diamati ± 30 detik)', 'M', '', { tekanan: '7,8', setting: '≥ 4,5' }),
        row('Katup uji ditutup, pompa utama tetap berjalan; tekanan naik dan katup pengaman membuka', 'M', '', { tekanan: '9,5', setting: 'Relief 9,5' }),
        row('Pompa utama dimatikan; pompa cadangan diesel start pada tekanan / tekanan operasi', 'M', '', { tekanan: '5,5 / 7,7', setting: '5,5 / ≥ 4,5' }),
      ],
      ujiPompaNote: 'Pompa utama elektrik dan pompa cadangan diesel start otomatis dari sakelar tekanan. Debit pada flow meter saat uji pompa utama 1.930 L/menit (± 510 US GPM) pada 7,8 kg/cm², memenuhi kapasitas ≥ 500 US GPM. Pompa diesel juga diuji start manual dari panel: berhasil pada percobaan pertama.',
      listrik: [
        row('Sumber daya dari panel utama dengan sakelar tersendiri', 'M', 'Dari LVMDP, MCCB khusus pompa', { kriteria: 'INS.11' }),
        row('Kabel tahan api atau dalam conduit', 'M', 'Kabel FRC dalam tray tertutup', { kriteria: 'INS.11' }),
        row('Tidak ada beban lain pada rangkaian pompa', 'M', 'Tidak ada', { kriteria: 'INS.11' }),
        row('Pengaman tahan 125% arus beban penuh terus-menerus', 'M', 'MCCB 125 A ≥ 125% × 84 A (105 A)', { kriteria: '≥ 105 A' }),
        row('Pengaman membuka pada 600% arus beban penuh dalam 20 – 50 detik', 'M', '± 30 detik pada 504 A (kurva pabrikan)', { kriteria: '20 – 50 detik' }),
        row('Tidak ada pengaman beban lebih antara motor dan kontrol', 'M', 'Tidak ada', { kriteria: 'INS.11' }),
        row('Tegangan L1–L2 / L2–L3 / L3–L1', 'M', '392 / 395 / 390 V', { kriteria: '380 V ± 10%' }),
        row('Arus operasi motor pompa utama', 'M', '78 A', { kriteria: '≤ 84 A (FLA)' }),
        row('Tahanan isolasi motor pompa utama', 'M', '520 MΩ', { kriteria: '≥ 1 MΩ' }),
      ],
      uji3: [
        { titik: 'Terdekat', kode: 'H-01', lokasi: 'Lobby / dekat rumah pompa', pitot: '6,2', mano: '6,9' },
        { titik: 'Terjauh', kode: 'HP-04', lokasi: 'Halaman belakang gudang', pitot: '4,8', mano: '6,6' },
        { titik: 'Tengah', kode: 'H-06', lokasi: 'Area Produksi Line 2', pitot: '5,0', mano: '6,3' },
      ],
      siamese: [
        row('Inlet 2 × 2,5" lengkap dengan tutup, mudah dijangkau mobil pemadam', 'M', 'Di sisi gerbang utama'),
        row('Katup searah (check valve) berfungsi', 'M'),
        row('Tanda / label "SAMBUNGAN DAMKAR" terpasang', 'C', 'Label "SAMBUNGAN DAMKAR" tidak terpasang', { rek: 'Pasang label yang terlihat dari jalan akses.', batas: '≤ 30 hari' }),
      ],
      points: [
        pt('H-01', 'gedung', 'Lobby'), pt('H-02', 'gedung', 'Kantor Lt. 1'),
        pt('H-03', 'gedung', 'Gudang Bahan Baku A', [1], { temuan: 'Akses kotak hidran terhalang tumpukan palet.', rekomendasi: 'Bebaskan area minimal 1 m di depan kotak hidran; beri marka lantai.', batas: 'Segera (≤ 7 hari)' }),
        pt('H-04', 'gedung', 'Gudang Bahan Baku B'), pt('H-05', 'gedung', 'Produksi Line 1'), pt('H-06', 'gedung', 'Produksi Line 2'),
        pt('H-07', 'gedung', 'Gudang Barang Jadi', [3], { temuan: 'Selang bocor ± 3 m dari kopling.', rekomendasi: 'Ganti selang 1,5" × 30 m sesuai standar.' }),
        pt('H-08', 'gedung', 'Workshop'), pt('H-09', 'gedung', 'Kantin'), pt('H-10', 'gedung', 'Ruang Genset'),
        pt('HP-01', 'halaman', 'Gerbang utama'),
        pt('HP-02', 'halaman', 'Sisi timur', [2], { temuan: 'Tutup kopling 2,5" hilang, ulir berkarat.', rekomendasi: 'Bersihkan ulir dan pasang tutup kopling.' }),
        pt('HP-03', 'halaman', 'Parkir truk'), pt('HP-04', 'halaman', 'Belakang gudang'),
      ],
      photos: [], gambar: null, rekomendasi: null,
    };
  }

  return { GEDUNG_ITEMS, HALAMAN_ITEMS, LABEL, SECTIONS, itemsOf, autoStatus, statusOf, autoTemuan, failed, water, uji3Eval, findings, conclusions, autoRecommendations, buildHydrant, sampleModule, blankModule, fmtNum };
})();
if (typeof module !== 'undefined') module.exports = RH;
