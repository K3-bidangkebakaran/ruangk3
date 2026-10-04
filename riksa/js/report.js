/* ===== Generator Laporan Riksa Uji APAR (.docx) =====
   Berjalan di browser (global `docx`) maupun Node (require('docx')).
   buildReport(state, docx) -> docx.Document                      */
const RU = (() => {
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const ITEMS = [
    ['Ditempatkan pada posisi mudah dilihat, dicapai dan diambil', 'Ps. 4 (1)'],
    ['Tanda pemasangan tersedia, tinggi 125 cm dari lantai', 'Ps. 4 (1)–(3)'],
    ['Jarak antar APAR / kelompok APAR ≤ 15 m', 'Ps. 4 (5)'],
    ['Jenis media sesuai golongan kebakaran di area', 'Ps. 4 (4)'],
    ['Sengkang / box tidak dikunci, digembok atau diikat mati', 'Ps. 6–7'],
    ['Puncak APAR ± 1,2 m dari permukaan lantai', 'Ps. 8'],
    ['Tabung bebas karat, lubang, penyok / cacat', 'Ps. 5; 12 b'],
    ['Tekanan manometer di zona hijau / susut berat CO₂ < 10%', 'Ps. 12 a, h'],
    ['Pin pengaman dan segel utuh', 'Ps. 12 a'],
    ['Handle / tuas dan label dalam kondisi baik', 'Ps. 12 b'],
    ['Petunjuk cara pemakaian terbaca jelas', 'Ps. 14'],
    ['Selang & nozzle tidak tersumbat, retak atau rusak', 'Ps. 12 c'],
    ['Tepung kering tidak menggumpal (tercurah bebas)', 'Ps. 13 (4)'],
    ['Kartu pemeriksaan & riwayat isi ulang tersedia', 'Ps. 11'],
    ['Percobaan tekan (hidrostatik) belum lewat 5 tahun', 'Ps. 15–17'],
  ];
  // butir yang menyangkut fungsi APAR -> Tidak Layak; sisanya (penempatan/administrasi) -> Layak dgn catatan
  const FUNCTIONAL = [6, 7, 8, 9, 11, 12, 14];
  const STATUS_LABEL = { L: 'Layak', LC: 'Layak dgn catatan', TL: 'Tidak Layak' };
  const STATUS_FILL = { L: 'E2F0D9', LC: 'FFF2CC', TL: 'F8CBAD' };

  function autoStatus(u) {
    const c = u.checks || [];
    if (FUNCTIONAL.some(i => c[i] === 'x')) return 'TL';
    if (c.some(v => v === 'x')) return 'LC';
    return 'L';
  }
  const statusOf = (u) => u.statusOverride || autoStatus(u);
  const failedItems = (u) => (u.checks || []).map((v, i) => v === 'x' ? i : -1).filter(i => i >= 0);

  function terbilang(n) {
    const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    if (n === 0) return 'nol';
    const f = (x) => {
      if (x < 12) return s[x];
      if (x < 20) return f(x - 10) + ' belas';
      if (x < 100) return f(Math.floor(x / 10)) + ' puluh' + (x % 10 ? ' ' + f(x % 10) : '');
      if (x < 200) return 'seratus' + (x - 100 ? ' ' + f(x - 100) : '');
      if (x < 1000) return f(Math.floor(x / 100)) + ' ratus' + (x % 100 ? ' ' + f(x % 100) : '');
      if (x < 2000) return 'seribu' + (x - 1000 ? ' ' + f(x - 1000) : '');
      return f(Math.floor(x / 1000)) + ' ribu' + (x % 1000 ? ' ' + f(x % 1000) : '');
    };
    return f(n);
  }
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
  function addMonths(iso, n) {
    const d = parseD(iso); if (!d) return '';
    const t = d.y * 12 + (d.m - 1) + n;
    return `${MONTHS[t % 12]} ${Math.floor(t / 12)}`;
  }
  const mmYYYY = (iso) => { const d = parseD(iso); return d ? `${String(d.m).padStart(2, '0')}/${d.y}` : ''; };
  const pct = (a, n) => n ? (a / n * 100).toFixed(1).replace('.', ',') + '%' : '0%';
  const listCodes = (arr) => arr.length <= 20 ? arr.map(u => u.kode).join(', ') : `${arr.length} unit, rincian pada butir 4.5`;

  function autoTemuan(u) {
    const f = failedItems(u);
    if (!f.length) return '';
    return f.map(i => ITEMS[i][0]).join('; ') + ' – tidak memenuhi.';
  }
  function autoRekom(u) { return statusOf(u) === 'TL' ? 'Perbaiki / isi ulang / ganti komponen; pasang unit pengganti sementara.' : 'Perbaiki penempatan / pemasangan sesuai ketentuan.'; }
  const autoBatas = (u) => statusOf(u) === 'TL' ? 'Segera (≤ 7 hari)' : '≤ 30 hari';

  function autoRecommendations(S) {
    const units = S.units || [];
    const tl = units.filter(u => statusOf(u) === 'TL');
    const lc = units.filter(u => statusOf(u) === 'LC');
    const out = [];
    if (tl.length || lc.length) out.push('Pengurus segera menindaklanjuti seluruh temuan pada butir 4.5 sesuai batas waktu yang ditetapkan, kemudian menyampaikan bukti tindak lanjut (foto, nota isi ulang) kepada PJK3 untuk verifikasi.');
    if (tl.length) out.push(`Selama ${listCodes(tl)} diperbaiki, sediakan unit pengganti sementara dengan jenis dan kapasitas yang sama.`);
    out.push('Lakukan inspeksi visual internal setiap bulan oleh petugas peran kebakaran dan catat pada kartu pemeriksaan di setiap APAR.');
    out.push('Selenggarakan pelatihan penggunaan APAR bagi petugas peran kebakaran sesuai KEP.186/MEN/1999.');
    const next = addMonths(S.meta.tglSelesai || S.meta.tglMulai, 6);
    out.push(`Pemeriksaan berkala berikutnya (jangka 6 bulan) dijadwalkan paling lambat ${next || '[bulan tahun]'}.`);
    return out;
  }

  function b64ToBytes(dataUrl) {
    const b64 = dataUrl.split(',')[1];
    if (typeof atob === 'function') { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
    return Buffer.from(b64, 'base64');
  }
  const imgType = (dataUrl) => /^data:image\/png/.test(dataUrl) ? 'png' : 'jpg';
  function fit(img, maxW, maxH) { const r = Math.min(maxW / img.w, maxH / img.h, 1e9); return { width: Math.round(img.w * r), height: Math.round(img.h * r) }; }

  function buildReport(S, D) {
    const {
      Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, ImageRun,
      AlignmentType, BorderStyle, HeadingLevel, PageBreak, PageOrientation, Header, Footer,
      PageNumber, LevelFormat, VerticalAlign,
    } = D;
    const RED = '8B1A1A', GRAY = 'F2F2F2', FONT = 'Arial';
    const M = S.meta, P = S.pjk3, K = S.klien;
    const units = S.units || [];
    const N = units.length;
    const v = (x, ph) => (x && String(x).trim()) ? String(x).trim() : ph;
    const pjkName = v(P.nama, '[Nama PJK3]');
    const klien = v(K.nama, '[Nama Perusahaan]');
    const nomor = v(M.nomor, '[Nomor Laporan]');

    // ---------- helpers ----------
    const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color, underline: o.underline ? {} : undefined, highlight: o.highlight || (/^\[[^\]]*\]$/.test(text) ? 'yellow' : undefined) });
    const p = (children, o = {}) => new Paragraph({
      children: (Array.isArray(children) ? children : [children]).map(c => typeof c === 'string' ? t(c, o) : c),
      alignment: o.align || AlignmentType.JUSTIFIED,
      spacing: { before: o.before ?? 0, after: o.after ?? 100, line: o.line || 276 },
      numbering: o.numbering, keepNext: o.keepNext,
    });
    const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: FONT })], spacing: { before: 280, after: 140 }, keepNext: true });
    const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT })], spacing: { before: 200, after: 100 }, keepNext: true });
    const bullet = (text) => p(typeof text === 'string' ? [t(text)] : text, { numbering: { reference: 'bullets', level: 0 }, after: 60 });
    const num = (ref, text) => p(typeof text === 'string' ? [t(text)] : text, { numbering: { reference: ref, level: 0 }, after: 60 });
    const spacer = (after = 120) => new Paragraph({ children: [], spacing: { before: 0, after } });
    const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

    const border = { style: BorderStyle.SINGLE, size: 4, color: '808080' };
    const borders = { top: border, bottom: border, left: border, right: border };
    const noB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const noBorders = { top: noB, bottom: noB, left: noB, right: noB };

    function cell(content, width, o = {}) {
      const lines = Array.isArray(content) ? [content] : String(content ?? '').split('\n').map(x => [x]);
      const paras = lines.map(runs => new Paragraph({
        children: runs.map(r => typeof r === 'string' ? t(r, { bold: o.bold, size: o.size || 18, color: o.color }) : r),
        alignment: o.align || AlignmentType.LEFT, spacing: { before: 0, after: 0 },
      }));
      return new TableCell({
        children: paras, width: { size: width, type: WidthType.DXA },
        borders: o.noBorder ? noBorders : borders,
        shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
        margins: { top: 50, bottom: 50, left: 80, right: 80 },
        verticalAlign: VerticalAlign.CENTER, columnSpan: o.span,
      });
    }
    function table(widths, rows, o = {}) {
      const total = widths.reduce((a, b) => a + b, 0);
      return new Table({
        width: { size: total, type: WidthType.DXA }, columnWidths: widths,
        rows: rows.map((r, ri) => new TableRow({
          tableHeader: o.header && ri === 0, cantSplit: true,
          children: r.map((c, ci) => {
            const isHead = o.header && ri === 0;
            const spec = (c && typeof c === 'object' && !Array.isArray(c) && 'c' in c) ? c : { c };
            const span = spec.span || 1;
            let pos = 0; for (let k = 0; k < ci; k++) { const prev = r[k]; pos += (prev && prev.span) || 1; }
            let w = 0; for (let k = 0; k < span; k++) w += widths[pos + k];
            return cell(spec.c, w, {
              bold: isHead || spec.bold, fill: isHead ? RED : spec.fill,
              color: isHead ? 'FFFFFF' : spec.color,
              align: spec.align || (isHead ? AlignmentType.CENTER : (o.aligns ? o.aligns[pos] : undefined)),
              span: spec.span, size: o.size, noBorder: o.noBorder,
            });
          }),
        })),
      });
    }
    const kv = (rows) => table([2700, 300, 6026], rows.map(([k, val]) => [{ c: k, fill: GRAY }, ':', { c: val }]));
    const C = AlignmentType.CENTER;

    // ---------- KOP ----------
    const kop = [];
    if (P.logo && P.logo.data) {
      kop.push(new Paragraph({ alignment: C, spacing: { after: 60 }, children: [new ImageRun({ type: imgType(P.logo.data), data: b64ToBytes(P.logo.data), transformation: fit(P.logo, 220, 70) })] }));
    }
    kop.push(
      new Paragraph({ alignment: C, spacing: { after: 0 }, children: [t(P.nama ? P.nama.toUpperCase() : '[NAMA PERUSAHAAN PJK3]', { bold: true, size: 30, color: RED })] }),
      new Paragraph({ alignment: C, spacing: { after: 0 }, children: [t('Perusahaan Jasa Keselamatan dan Kesehatan Kerja (PJK3) Bidang Pemeriksaan dan Pengujian Proteksi Kebakaran', { size: 18 })] }),
      new Paragraph({ alignment: C, spacing: { after: 0 }, children: [t('SK Penunjukan PJK3 No. ', { size: 18 }), t(v(P.sk, '[Nomor SK Kemnaker]'), { size: 18 })] }),
      new Paragraph({ alignment: C, spacing: { after: 120 }, border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: RED, space: 4 } },
        children: [t(v(P.alamat, '[Alamat lengkap PJK3]'), { size: 18 }), t('  |  Telp. ', { size: 18 }), t(v(P.telp, '[Telp]'), { size: 18 }), t('  |  Email: ', { size: 18 }), t(v(P.email, '[Email]'), { size: 18 })] }),
    );

    // ---------- COVER ----------
    const tglRiksa = fmtRange(M.tglMulai, M.tglSelesai) || '[Tanggal Riksa Uji]';
    const tglLap = fmtDate(M.tglLaporan) || '[Tanggal Laporan]';
    const cover = [
      ...kop, spacer(900),
      new Paragraph({ alignment: C, spacing: { after: 120 }, children: [t('LAPORAN HASIL', { bold: true, size: 36 })] }),
      new Paragraph({ alignment: C, spacing: { after: 120 }, children: [t('PEMERIKSAAN DAN PENGUJIAN (RIKSA UJI)', { bold: true, size: 36 })] }),
      new Paragraph({ alignment: C, spacing: { after: 120 }, children: [t('ALAT PEMADAM API RINGAN (APAR)', { bold: true, size: 36, color: RED })] }),
      new Paragraph({ alignment: C, spacing: { after: 600 }, children: [t(v(M.periode, '[Periode pemeriksaan]'), { size: 24, italics: true })] }),
      table([3000, 300, 4500], [
        [{ c: 'Nomor Laporan', bold: true }, ':', nomor],
        [{ c: 'Perusahaan', bold: true }, ':', klien],
        [{ c: 'Lokasi', bold: true }, ':', v(K.alamatSingkat || K.alamat, '[Lokasi]')],
        [{ c: 'Tanggal Riksa Uji', bold: true }, ':', tglRiksa],
        [{ c: 'Tanggal Laporan', bold: true }, ':', tglLap],
        [{ c: 'Jumlah APAR Diperiksa', bold: true }, ':', `${N} unit`],
      ], { noBorder: true, size: 22 }),
      spacer(900),
      new Paragraph({ alignment: C, spacing: { after: 60 }, children: [t('Mengacu pada Peraturan Menteri Tenaga Kerja dan Transmigrasi', { size: 18 })] }),
      new Paragraph({ alignment: C, spacing: { after: 400 }, children: [t('No. PER.04/MEN/1980 tentang Syarat-syarat Pemasangan dan Pemeliharaan Alat Pemadam Api Ringan', { size: 18 })] }),
    ];
    if (M.isSample) cover.push(table([9026], [[{ c: [t('Catatan pengisian: ', { bold: true, size: 16 }), t('Data perusahaan, nomor dan hasil pada dokumen ini adalah CONTOH FIKTIF. Ganti teks berlatar kuning dan seluruh contoh isian dengan data riksa uji sebenarnya, lalu hapus kotak catatan ini sebelum diterbitkan.', { size: 16, italics: true })], fill: 'FFF8E1' }]]));
    cover.push(pageBreak());

    // ---------- BAB I ----------
    const hydroUnits = units.filter(u => u.hydro && u.hydro.done);
    const bab1 = [
      h1('I. PENDAHULUAN'),
      h2('1.1 Latar Belakang'),
      p('Berdasarkan Undang-Undang No. 1 Tahun 1970 tentang Keselamatan Kerja, setiap pengurus tempat kerja wajib mencegah, mengurangi dan memadamkan kebakaran. Alat Pemadam Api Ringan (APAR) merupakan sarana proteksi aktif pertama yang harus selalu dalam kondisi siap pakai. Peraturan Menteri Tenaga Kerja dan Transmigrasi No. PER.04/MEN/1980 mewajibkan setiap APAR diperiksa secara berkala dalam jangka 6 (enam) dan 12 (dua belas) bulan, serta dilakukan percobaan tekan paling lama setiap 5 (lima) tahun.'),
      p(`Atas permintaan ${klien}, ${pjkName} selaku PJK3 yang ditunjuk Kementerian Ketenagakerjaan RI telah melaksanakan pemeriksaan dan pengujian terhadap seluruh APAR yang terpasang di lokasi perusahaan.`),
      h2('1.2 Maksud dan Tujuan'),
      bullet('Memastikan setiap APAR memenuhi persyaratan pemasangan dan pemeliharaan sesuai PER.04/MEN/1980.'),
      bullet('Mengetahui kondisi fisik, tekanan, berat isi dan kelayakan pakai setiap unit APAR.'),
      bullet('Memberikan rekomendasi perbaikan atas ketidaksesuaian yang ditemukan.'),
      bullet('Menjadi dasar pengajuan Surat Keterangan Memenuhi Syarat K3 kepada Pengawas Ketenagakerjaan setempat.'),
      h2('1.3 Dasar Hukum'),
      num('dasar', 'Undang-Undang No. 1 Tahun 1970 tentang Keselamatan Kerja, khususnya Pasal 3 ayat (1) huruf b dan d serta Pasal 9 ayat (3).'),
      num('dasar', 'Peraturan Pemerintah No. 50 Tahun 2012 tentang Penerapan Sistem Manajemen Keselamatan dan Kesehatan Kerja (SMK3).'),
      num('dasar', 'Peraturan Menteri Tenaga Kerja dan Transmigrasi No. PER.04/MEN/1980 tentang Syarat-syarat Pemasangan dan Pemeliharaan Alat Pemadam Api Ringan.'),
      num('dasar', 'Peraturan Menteri Tenaga Kerja No. PER.04/MEN/1995 tentang Perusahaan Jasa Keselamatan dan Kesehatan Kerja.'),
      num('dasar', 'Keputusan Menteri Tenaga Kerja No. KEP.186/MEN/1999 tentang Unit Penanggulangan Kebakaran di Tempat Kerja.'),
      num('dasar', 'Instruksi Menteri Tenaga Kerja No. INS.11/M/BW/1997 tentang Pengawasan Khusus K3 Penanggulangan Kebakaran.'),
      num('dasar', 'SNI 03-3987-1995 tentang Tata Cara Perencanaan dan Pemasangan Pemadam Api Ringan untuk Pencegahan Bahaya Kebakaran pada Bangunan Rumah dan Gedung (sebagai acuan teknis).'),
      h2('1.4 Ruang Lingkup'),
      p(`Riksa uji meliputi ${N} (${terbilang(N)}) unit APAR yang terpasang di ${v(K.cakupanArea, 'area perusahaan')} ${klien}, terdiri atas pemeriksaan penempatan dan pemasangan, pemeriksaan kondisi fisik, pengukuran tekanan dan berat isi${hydroUnits.length ? ', serta percobaan tekan (uji hidrostatik) terhadap unit yang telah jatuh tempo' : ''}.`),
    ];

    // ---------- BAB II ----------
    const bab2 = [
      h1('II. DATA UMUM'),
      h2('2.1 Data Perusahaan (Pemilik APAR)'),
      kv([
        ['Nama Perusahaan', klien],
        ['Alamat', v(K.alamat, '[Alamat]')],
        ['Bidang Usaha', v(K.bidang, '[Bidang usaha]')],
        ['Pengurus / Penanggung Jawab', K.pengurus ? `${K.pengurus}${K.jabatanPengurus ? ` (${K.jabatanPengurus})` : ''}` : '[Nama Pengurus]'],
        ['Petugas Pendamping', v(K.petugas, '[Nama petugas]')],
        ['Jumlah Tenaga Kerja', K.jumlahTK ? `${K.jumlahTK} orang` : '[Jumlah]'],
        ['Klasifikasi Potensi Bahaya', v(K.klasifikasi, '[Klasifikasi]')],
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
        ['Percobaan Tekan', hydroUnits.length ? `Dilakukan pada ${hydroUnits.length} unit yang jatuh tempo 5 tahun (${listCodes(hydroUnits)})` : 'Tidak ada unit yang jatuh tempo pada periode ini'],
        ['Riksa Uji Sebelumnya', v(M.sebelumnya, '–')],
      ]),
    ];

    // ---------- BAB III ----------
    const alat = (S.alat || []).filter(a => a.nama);
    const bab3 = [
      h1('III. METODE DAN PERALATAN'),
      h2('3.1 Metode Pemeriksaan'),
      num('metode', [t('Pemeriksaan dokumen: ', { bold: true }), t('kartu pemeriksaan, riwayat isi ulang, tanggal produksi dan cap percobaan tekan pada tabung.')]),
      num('metode', [t('Pemeriksaan penempatan: ', { bold: true }), t('visibilitas, aksesibilitas, tanda pemasangan, tinggi pemasangan, jarak antar APAR dan kesesuaian jenis media dengan golongan kebakaran (Pasal 4–9).')]),
      num('metode', [t('Pemeriksaan visual kondisi fisik: ', { bold: true }), t('tabung, segel, pin pengaman, handle, label, petunjuk pemakaian, selang dan nozzle (Pasal 5, 12 dan 14).')]),
      num('metode', [t('Pengukuran tekanan: ', { bold: true }), t('pembacaan manometer dan verifikasi dengan pressure gauge terkalibrasi untuk tipe stored pressure.')]),
      num('metode', [t('Penimbangan: ', { bold: true }), t('APAR CO₂ ditimbang dan dibandingkan dengan berat yang tertera; susut ≥ 10% wajib diisi ulang (Pasal 12 huruf h) dan dilakukan percobaan tekan (Pasal 16).')]),
      num('metode', [t('Pemeriksaan isi: ', { bold: true }), t('sampel tepung kering diperiksa agar tercurah bebas dan tidak menggumpal (Pasal 13 ayat (4)).')]),
      num('metode', [t('Percobaan tekan (uji hidrostatik): ', { bold: true }), t('tabung diuji dengan tekanan coba 1,5 kali tekanan kerja dan tidak kurang dari 20 kg/cm² selama 30 detik (Pasal 15), lalu tanggal pengujian dicap pada pelat logam di badan tabung (Pasal 17).')]),
      h2('3.2 Peralatan yang Digunakan'),
      table([600, 3200, 2600, 2626], [
        ['No', 'Nama Peralatan', 'Spesifikasi', 'No. Sertifikat Kalibrasi'],
        ...(alat.length ? alat : [{ nama: '[Nama peralatan]', spek: '', sert: '' }]).map((a, i) => [String(i + 1), a.nama, a.spek || '–', a.sert || '–']),
      ], { header: true, aligns: [C] }),
      h2('3.3 Kriteria Penilaian'),
      table([2200, 6826], [
        ['Status', 'Kriteria'],
        [{ c: 'Layak', fill: STATUS_FILL.L, bold: true }, 'Seluruh butir pemeriksaan memenuhi persyaratan PER.04/MEN/1980; APAR siap digunakan.'],
        [{ c: 'Layak dengan catatan', fill: STATUS_FILL.LC, bold: true }, 'APAR berfungsi dan siap digunakan, namun terdapat ketidaksesuaian penempatan/pemasangan yang wajib diperbaiki pengurus.'],
        [{ c: 'Tidak Layak', fill: STATUS_FILL.TL, bold: true }, 'Terdapat ketidaksesuaian pada fungsi APAR (tekanan, berat, kerusakan fisik, selang/nozzle) sehingga tidak boleh diandalkan sampai diperbaiki, diisi ulang atau diganti.'],
      ], { header: true }),
    ];

    // ---------- BAB IV a ----------
    const counts = { L: 0, LC: 0, TL: 0 };
    units.forEach(u => counts[statusOf(u)]++);
    const bab4a = [
      h1('IV. HASIL PEMERIKSAAN DAN PENGUJIAN'),
      h2('4.1 Data dan Status APAR'),
      table([450, 900, 1950, 1050, 650, 650, 900, 1326, 1150], [
        ['No', 'Kode', 'Lokasi', 'Media', 'Kap.', 'Thn Prod.', 'Isi Ulang Terakhir', 'Tekanan / Berat Isi', 'Status'],
        ...units.map((u, i) => { const s = statusOf(u); return [String(i + 1), u.kode || '–', u.lokasi || '–', u.media || '–', u.kap || '–', u.thn || '–', u.isiUlang || '–', u.bacaan || '–', { c: STATUS_LABEL[s], fill: STATUS_FILL[s], bold: true }]; }),
      ], { header: true, size: 16, aligns: [C, C, null, null, C, C, C, C, C] }),
    ];
    if (S.keteranganTabel) bab4a.push(p([t('Keterangan: ' + S.keteranganTabel, { size: 16, italics: true })], { before: 80 }));
    bab4a.push(
      h2('4.2 Rekapitulasi'),
      table([4513, 2256, 2257], [
        ['Status', 'Jumlah Unit', 'Persentase'],
        [{ c: 'Layak', fill: STATUS_FILL.L }, String(counts.L), pct(counts.L, N)],
        [{ c: 'Layak dengan catatan', fill: STATUS_FILL.LC }, String(counts.LC), pct(counts.LC, N)],
        [{ c: 'Tidak Layak', fill: STATUS_FILL.TL }, String(counts.TL), pct(counts.TL, N)],
        [{ c: 'Total', bold: true }, { c: String(N), bold: true }, { c: N ? '100%' : '0%', bold: true }],
      ], { header: true, aligns: [null, C, C] }),
      spacer(),
      h2('4.3 Hasil Percobaan Tekan (Uji Hidrostatik)'),
    );
    if (hydroUnits.length) {
      bab4a.push(table([900, 1000, 1200, 1500, 900, 1100, 1100, 1326], [
        ['Kode', 'Thn Prod.', 'Tekanan Kerja', 'Tekanan Coba', 'Durasi', 'Kebocoran', 'Deformasi', 'Hasil'],
        ...hydroUnits.map(u => { const h = u.hydro; const ok = h.hasil !== 'Gagal'; return [u.kode, u.thn || '–', h.kerja || '–', h.coba || '–', h.durasi || '30 detik', h.bocor || 'Tidak ada', h.deformasi || 'Tidak ada', { c: ok ? 'Lulus' : 'Gagal', fill: ok ? STATUS_FILL.L : STATUS_FILL.TL, bold: true }]; }),
      ], { header: true, size: 17, aligns: Array(8).fill(C) }));
      const failedH = hydroUnits.filter(u => u.hydro.hasil === 'Gagal');
      const tglUji = mmYYYY(M.tglMulai);
      let txt = `Tekanan coba memenuhi ketentuan Pasal 15 ayat (3), yaitu 1,5 kali tekanan kerja dan tidak kurang dari 20 kg/cm², ditahan selama 30 detik. Tanggal percobaan tekan (${tglUji || '[MM/YYYY]'}) telah dicap pada pelat logam di badan tabung sesuai Pasal 17. Percobaan tekan berikutnya paling lambat ${addMonths(M.tglMulai, 60) || '[bulan tahun]'}.`;
      if (failedH.length) txt += ` Unit yang tidak lulus percobaan tekan (${listCodes(failedH)}) tidak boleh digunakan kembali dan wajib diganti.`;
      bab4a.push(p([t(txt, { size: 18 })], { before: 80 }));
    } else {
      bab4a.push(p('Tidak ada APAR yang jatuh tempo percobaan tekan pada periode pemeriksaan ini.'));
    }

    // ---------- BAB IV b: checklist landscape, 12 unit per tabel ----------
    const X = '✗', V = '✓', NA = '–';
    const sym = (u, i) => { const c = (u.checks || [])[i]; return c === 'x' ? X : c === 'na' ? NA : V; };
    const shortCode = (u, idx) => { const m = /(\d+)\s*$/.exec(u.kode || ''); return m ? m[1] : String(idx + 1); };
    const bab4b = [h2('4.4 Lembar Periksa (Checklist) per Unit')];
    const chunks = [];
    for (let i = 0; i < Math.max(N, 1); i += 12) chunks.push(units.slice(i, i + 12));
    chunks.forEach((chunk, ci) => {
      if (ci > 0) bab4b.push(pageBreak());
      if (chunks.length > 1) bab4b.push(p([t(`Tabel ${ci + 1} dari ${chunks.length} – ${chunk[0].kode} s/d ${chunk[chunk.length - 1].kode}`, { bold: true, size: 18 })], { after: 80, keepNext: true }));
      const fixed = [450, 4300, 1300];
      const avail = 15398 - 6050;
      const n = Math.max(chunk.length, 1);
      const uw = Math.floor(avail / 12);
      const widths = [...fixed, ...Array(n).fill(uw)];
      if (n === 12) widths[widths.length - 1] += avail - uw * 12;
      const head = ['No', 'Butir Pemeriksaan', 'Dasar', ...(chunk.length ? chunk.map((u, k) => shortCode(u, ci * 12 + k)) : ['–'])];
      const rows = ITEMS.map((it, i) => [String(i + 1), it[0], it[1], ...(chunk.length ? chunk.map(u => { const m = sym(u, i); return { c: m, fill: m === X ? 'F8CBAD' : undefined, bold: m === X }; }) : ['–'])]);
      const statusRow = [{ c: 'Status Kelayakan', bold: true, fill: GRAY, span: 3, align: AlignmentType.RIGHT }, ...(chunk.length ? chunk.map(u => { const s = statusOf(u); return { c: s, fill: STATUS_FILL[s], bold: true }; }) : ['–'])];
      bab4b.push(table(widths, [head, ...rows, statusRow], { header: true, size: 16, aligns: [C, null, C, ...Array(n).fill(C)] }));
    });
    bab4b.push(p([t(`Keterangan: ${V} = memenuhi; ${X} = tidak memenuhi; ${NA} = tidak berlaku. Nomor kolom = nomor kode APAR (01 = APAR-01). Status: L = Layak, LC = Layak dengan catatan, TL = Tidak Layak. "Ps." = Pasal PER.04/MEN/1980.`, { size: 16, italics: true })], { before: 80 }));

    // ---------- BAB IV c: temuan ----------
    const findUnits = units.filter(u => statusOf(u) !== 'L' || (u.temuan && u.temuan.trim()));
    const bab4c = [h2('4.5 Temuan dan Ketidaksesuaian')];
    if (findUnits.length) {
      bab4c.push(table([400, 1600, 2100, 1100, 2526, 1300], [
        ['No', 'Unit / Lokasi', 'Temuan', 'Dasar', 'Rekomendasi', 'Batas Waktu'],
        ...findUnits.map((u, i) => [
          String(i + 1), `${u.kode}\n${u.lokasi || ''}`,
          v(u.temuan, autoTemuan(u) || '–'),
          failedItems(u).map(k => ITEMS[k][1]).join('; ') || '–',
          v(u.rekomendasi, autoRekom(u)),
          v(u.batas, autoBatas(u)),
        ]),
      ], { header: true, size: 17, aligns: [C, null, null, null, null, C] }));
    } else {
      bab4c.push(p('Tidak terdapat temuan ketidaksesuaian pada pemeriksaan ini.'));
    }
    bab4c.push(spacer());

    // ---------- V & VI ----------
    const tl = units.filter(u => statusOf(u) === 'TL'), lc = units.filter(u => statusOf(u) === 'LC');
    const lulusH = hydroUnits.filter(u => u.hydro.hasil !== 'Gagal');
    const simpul = [
      `${counts.L} unit APAR dinyatakan LAYAK dan memenuhi persyaratan K3 sesuai PER.04/MEN/1980.`,
    ];
    if (lc.length) simpul.push(`${lc.length} unit APAR (${listCodes(lc)}) dinyatakan LAYAK DENGAN CATATAN; unit berfungsi baik namun penempatan/pemasangannya wajib diperbaiki.`);
    if (tl.length) simpul.push(`${tl.length} unit APAR (${listCodes(tl)}) dinyatakan TIDAK LAYAK dan tidak boleh diandalkan sampai diisi ulang/diperbaiki serta diperiksa ulang oleh PJK3.`);
    if (hydroUnits.length) simpul.push(lulusH.length === hydroUnits.length ? `Percobaan tekan terhadap ${listCodes(hydroUnits)} memenuhi syarat (Pasal 15).` : `Dari ${hydroUnits.length} unit yang dilakukan percobaan tekan, ${lulusH.length} unit memenuhi syarat (Pasal 15).`);
    simpul.push(tl.length || lc.length
      ? 'Secara keseluruhan, sistem APAR di lokasi BELUM SEPENUHNYA MEMENUHI SYARAT K3. Surat Keterangan Memenuhi Syarat dapat diajukan setelah seluruh temuan pada butir 4.5 ditindaklanjuti dan diverifikasi.'
      : 'Secara keseluruhan, sistem APAR di lokasi MEMENUHI SYARAT K3 dan laporan ini dapat diajukan sebagai dasar penerbitan Surat Keterangan Memenuhi Syarat K3.');
    const rekom = (S.rekomendasi && S.rekomendasi.length) ? S.rekomendasi : autoRecommendations(S);
    const bab56 = [
      h1('V. KESIMPULAN'),
      p(`Berdasarkan hasil pemeriksaan dan pengujian terhadap ${N} (${terbilang(N)}) unit APAR di ${klien} pada tanggal ${tglRiksa}, disimpulkan bahwa:`),
      ...simpul.map(s => num('simpul', s)),
      h1('VI. REKOMENDASI'),
      ...rekom.filter(r => r.trim()).map(r => bullet(r.trim())),
    ];

    // ---------- VII ----------
    const W = [3008, 3010, 3008];
    const sc = (lines, w) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: noBorders, verticalAlign: VerticalAlign.TOP,
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: lines.map(([txt, st]) => new Paragraph({ alignment: C, keepNext: true, spacing: { after: 0 }, children: [t(txt, { size: st.size || 18, bold: st.bold, underline: st.u })] })) });
    const sigTable = new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: W, rows: [
      new TableRow({ cantSplit: true, children: [
        sc([['Diperiksa oleh,', {}], ['Ahli K3 Spesialis', { bold: true }], ['Penanggulangan Kebakaran', { bold: true }]], W[0]),
        sc([['Disetujui oleh,', {}], [pjkName, { bold: true }], ['', {}]], W[1]),
        sc([['Mengetahui,', {}], [klien, { bold: true }], ['', {}]], W[2]),
      ] }),
      new TableRow({ cantSplit: true, height: { value: 1300, rule: 'atLeast' }, children: W.map(w => sc([['', {}]], w)) }),
      new TableRow({ cantSplit: true, children: [
        sc([[v(P.ahli, '[Nama Ahli K3]'), { bold: true, u: true }], [`No. Lisensi: ${v(P.lisensi, '[....]')}`, { size: 16 }]], W[0]),
        sc([[v(P.direktur, '[Nama Direktur]'), { bold: true, u: true }], [v(P.jabatanDirektur, 'Direktur'), { size: 16 }]], W[1]),
        sc([[v(K.pengurus, '[Nama Pengurus]'), { bold: true, u: true }], [`${v(K.jabatanPengurus, 'Pimpinan')} (Pengurus)`, { size: 16 }]], W[2]),
      ] }),
    ] });
    const bab7 = [
      h1('VII. PERNYATAAN DAN PENGESAHAN'),
      p('Laporan ini disusun berdasarkan kondisi APAR pada saat pemeriksaan dan pengujian dilaksanakan. Perubahan kondisi setelah tanggal tersebut di luar tanggung jawab PJK3. Laporan ini disampaikan kepada Pengawas Ketenagakerjaan setempat sebagai dasar penerbitan Surat Keterangan Memenuhi Syarat K3.'),
      p([t(`${v(M.kota, '[Kota]')}, ${tglLap}`, { bold: true })], { align: AlignmentType.RIGHT, before: 120, after: 200, keepNext: true }),
      sigTable,
      pageBreak(),
    ];

    // ---------- Lampiran ----------
    const photos = [];
    units.forEach(u => (u.photos || []).forEach(ph => photos.push({ ...ph, label: `${u.kode}${ph.caption ? ': ' + ph.caption : ''}` })));
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
    } else {
      lampiran.push(p([t('[Belum ada foto dokumentasi]', { italics: true })]));
    }
    lampiran.push(h2('Lampiran B – Denah Penempatan APAR'));
    if (S.denah && S.denah.data) lampiran.push(new Paragraph({ alignment: C, children: [new ImageRun({ type: imgType(S.denah.data), data: b64ToBytes(S.denah.data), transformation: fit(S.denah, 600, 760) })] }));
    else lampiran.push(p([t('[Sisipkan denah lokasi dengan titik dan kode APAR]', { italics: true })]));
    lampiran.push(
      h2('Lampiran C – Dokumen Pendukung'),
      bullet('Salinan SK Penunjukan PJK3 dari Kementerian Ketenagakerjaan RI.'),
      bullet('Salinan Lisensi / SKP Ahli K3 Spesialis Penanggulangan Kebakaran.'),
      bullet('Sertifikat kalibrasi peralatan uji (pressure gauge, timbangan, pompa hidrostatik).'),
      bullet('Formulir lapangan / berita acara riksa uji yang ditandatangani kedua pihak.'),
    );

    // ---------- header/footer & dokumen ----------
    const header = new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RED, space: 2 } },
      children: [t(`Laporan Riksa Uji APAR  |  No. ${M.nomor || '-'}`, { size: 16, color: '666666' })],
    })] });
    const footer = new Footer({ children: [new Paragraph({
      alignment: C,
      children: [t('Halaman ', { size: 16, color: '666666' }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '666666' }), t(' dari ', { size: 16, color: '666666' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: '666666' })],
    })] });
    const numCfg = (ref, fmt) => ({ reference: ref, levels: [{ level: 0, format: fmt, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 360 } }, run: { font: FONT } } }] });
    const portrait = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1200, left: 1440, right: 1440, header: 600, footer: 600 } } };
    const landscape = { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1100, bottom: 1000, left: 720, right: 720, header: 500, footer: 500 } } };
    const hf = { headers: { default: header }, footers: { default: footer } };

    return new Document({
      creator: pjkName, title: 'Laporan Hasil Riksa Uji APAR',
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
        { properties: portrait, ...hf, children: [...bab1, ...bab2, ...bab3, ...bab4a] },
        { properties: landscape, ...hf, children: bab4b },
        { properties: portrait, ...hf, children: [...bab4c, ...bab56, ...bab7, ...lampiran] },
      ],
    });
  }

  // ---------- data contoh (sama dengan laporan awal) ----------
  function sampleState() {
    const ok = () => Array(15).fill('v');
    const mk = (kode, lokasi, media, kap, thn, isiUlang, bacaan, fails = [], extra = {}) => {
      const checks = ok();
      if (!media.startsWith('Powder')) checks[12] = 'na';
      fails.forEach(i => { checks[i] = 'x'; });
      return { id: kode, kode, lokasi, media, kap, merk: '', thn, isiUlang, bacaan, checks, statusOverride: '', temuan: '', rekomendasi: '', batas: '', hydro: { done: false, kerja: '14 bar', coba: '21 bar (1,5×)', durasi: '30 detik', bocor: 'Tidak ada', deformasi: 'Tidak ada', hasil: 'Lulus' }, photos: [], ...extra };
    };
    const H = { done: true, kerja: '14 bar', coba: '21 bar (1,5×)', durasi: '30 detik', bocor: 'Tidak ada', deformasi: 'Tidak ada', hasil: 'Lulus' };
    return {
      version: 1,
      meta: { isSample: true, nomor: '017/LHP-APAR/IX/2026', periode: 'Pemeriksaan Berkala Semester II Tahun 2026', tglMulai: '2026-09-22', tglSelesai: '2026-09-23', tglLaporan: '2026-09-28', kota: 'Makassar', jenis: 'Berkala 12 bulan (PER.04/MEN/1980 Pasal 11 ayat (1) huruf b), termasuk pemeriksaan 6 bulan (Pasal 12)', sebelumnya: 'Maret 2026 – Laporan No. 004/LHP-APAR/III/2026' },
      pjk3: { nama: '', sk: '', alamat: '', telp: '', email: '', ahli: '', lisensi: '', teknisi: '', direktur: '', jabatanDirektur: 'Direktur', logo: null },
      klien: { nama: 'PT Contoh Sentosa Abadi', alamat: 'Jl. Kawasan Industri Raya No. 10, Makassar, Sulawesi Selatan', alamatSingkat: 'Jl. Kawasan Industri Raya No. 10, Makassar', cakupanArea: 'gedung kantor, area produksi, gudang dan fasilitas penunjang', bidang: 'Industri pengolahan makanan ringan', pengurus: 'Budi Santoso', jabatanPengurus: 'Plant Manager', petugas: 'Rina Wijaya (HSE Officer)', jumlahTK: '185', klasifikasi: 'Kebakaran ringan–sedang (Kelas A, B dan C)' },
      alat: [
        { nama: 'Pressure gauge digital', spek: '0 – 40 bar, akurasi ±0,5%', sert: '' },
        { nama: 'Timbangan digital', spek: 'Kapasitas 50 kg, resolusi 10 g', sert: '' },
        { nama: 'Pompa uji hidrostatik', spek: 'Maks. 60 bar, dengan manometer', sert: '' },
        { nama: 'Laser distance meter', spek: '0,05 – 50 m', sert: '' },
        { nama: 'Meteran gulung', spek: '5 m', sert: '–' },
        { nama: 'Kamera dokumentasi', spek: '–', sert: '–' },
      ],
      keteranganTabel: 'tekanan kerja nominal APAR powder dan foam tipe stored pressure 14 bar (zona hijau manometer). Berat isi CO₂ ditentukan dengan penimbangan dikurangi berat tabung kosong yang tertera.',
      units: [
        mk('APAR-01', 'Lobby / Resepsionis', 'Powder ABC', '6 kg', '2023', '03/2026', '14 bar (hijau)'),
        mk('APAR-02', 'Ruang Kantor Lt. 1', 'Powder ABC', '6 kg', '2022', '03/2026', '14 bar (hijau)'),
        mk('APAR-03', 'Ruang Server', 'CO₂', '5 kg', '2022', '09/2025', '4,9 kg (-2%)'),
        mk('APAR-04', 'Panel Listrik Utama', 'CO₂', '5 kg', '2021', '09/2024', '4,4 kg (-12%)', [7], { temuan: 'Berat isi CO₂ 4,4 kg dari 5,0 kg (susut 12%).', rekomendasi: 'Isi ulang CO₂ dan lakukan percobaan tekan sebelum dipasang kembali. Pasang unit pengganti sementara.' }),
        mk('APAR-05', 'Gudang Bahan Baku A', 'Powder ABC', '6 kg', '2021', '03/2026', '14 bar (hijau)', [2], { hydro: H, temuan: 'Jarak ke APAR-06 18 m (melebihi 15 m).', rekomendasi: 'Tambah 1 unit APAR Powder ABC 6 kg di antara APAR-05 dan APAR-06.' }),
        mk('APAR-06', 'Gudang Bahan Baku B', 'Powder ABC', '6 kg', '2023', '03/2025', '8 bar (merah)', [2, 7], { temuan: 'Jarum manometer di zona merah (8 bar). Isi ulang terakhir 03/2025. Jarak ke APAR-05 18 m.', rekomendasi: 'Isi ulang (refill) dan ganti segel; pasang unit pengganti sementara.' }),
        mk('APAR-07', 'Area Produksi Line 1', 'Powder ABC', '9 kg', '2024', '03/2026', '14 bar (hijau)', [5], { temuan: 'Puncak APAR berada 1,45 m dari lantai.', rekomendasi: 'Turunkan sengkang sehingga puncak APAR ± 1,2 m dari lantai.' }),
        mk('APAR-08', 'Area Produksi Line 2', 'Powder ABC', '9 kg', '2024', '03/2026', '14 bar (hijau)', [1], { temuan: 'Tanda pemasangan (segitiga merah) tidak terpasang.', rekomendasi: 'Pasang tanda pemasangan sesuai Lampiran I PER.04/MEN/1980 pada ketinggian 125 cm.' }),
        mk('APAR-09', 'Workshop / Bengkel', 'Powder ABC', '6 kg', '2021', '03/2026', '14 bar (hijau)', [], { hydro: H }),
        mk('APAR-10', 'Dapur / Kantin', 'Foam AFFF', '9 L', '2023', '03/2026', '14 bar (hijau)'),
        mk('APAR-11', 'Ruang Genset & BBM', 'Foam AFFF', '9 L', '2022', '03/2026', '14 bar (hijau)', [11], { temuan: 'Selang pancar retak di dekat sambungan kepala tabung.', rekomendasi: 'Ganti selang dengan suku cadang sesuai spesifikasi pabrikan.' }),
        mk('APAR-12', 'Pos Satpam', 'Powder ABC', '3 kg', '2024', '03/2026', '14 bar (hijau)'),
      ],
      rekomendasi: null,
      denah: null,
    };
  }

  return { ITEMS, FUNCTIONAL, STATUS_LABEL, autoStatus, statusOf, failedItems, autoRecommendations, autoTemuan, fmtRange, fmtDate, buildReport, sampleState };
})();
if (typeof module !== 'undefined') module.exports = RU;
