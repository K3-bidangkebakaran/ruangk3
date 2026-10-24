/* DIBUAT OTOMATIS oleh pic/tools/build-wrd.js dari daftar-hadir/index.html — JANGAN diedit manual (ubah kode di website lalu jalankan ulang).
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
const CSS = ":host{all:initial;display:block;--accent:#f58220;--accent-d:#c9661a;font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,Arial,sans-serif;font-size:14px;color:#1d1d1f}*{box-sizing:border-box;margin:0;padding:0}[hidden]{display:none!important}.sign-hint{display:none}\n.page{width:210mm;height:297mm;margin:0 auto 16px;background:#fff;position:relative;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.18);font-family:Arial,Helvetica,sans-serif;color:#1d1d1f;font-size:10.5pt}\n.kop-head{position:absolute;top:0;left:0;width:100%}\n.kop-foot{position:absolute;bottom:0;left:0;width:100%}\n.content{position:absolute;top:40mm;bottom:22mm;left:18mm;right:18mm}\n.page h1{text-align:center;font-size:15pt;letter-spacing:.5px;margin-bottom:5mm;text-decoration:underline;text-underline-offset:3px}\n.page h1 small{font-size:10pt;font-weight:400;text-decoration:none}\ntable.info{border-collapse:collapse;margin-bottom:5mm}\ntable.info td{padding:1.1mm 0;vertical-align:top}\ntable.info .k{width:32mm}table.info .c{width:5mm}\ntable.grid{width:100%;border-collapse:collapse;table-layout:fixed}\ntable.grid th{background:var(--accent);color:#fff;font-size:10pt;padding:2.5mm 2mm;border:1px solid var(--accent-d)}\ntable.grid td{border:1px solid #888;padding:0 2mm;height:12.5mm;font-size:10pt;word-wrap:break-word}\ntable.grid td.no{text-align:center}\ntd.sign{position:relative;padding:0}\n.page,.page *{-webkit-print-color-adjust:exact;print-color-adjust:exact}\ntable.grid tr.batal td{background:#ff6b6b}\ntable.grid tr.remedial td:not(.ket):not(.lastd){background:#fff200}\ntable.grid tr.batal .ttd{display:none}\ntable.grid td.ket{text-align:center;font-weight:700;font-size:9pt;padding:0 1mm}\ntable.grid tr.days th{font-size:8.5pt;padding:1.5mm 1mm;line-height:1.25}\ntable.grid tr.days th span{font-weight:400;font-size:8pt}\ntable.grid.dense th,table.grid.dense td{padding-left:.6mm;padding-right:.6mm}table.grid.dense tr.days th{font-size:8pt;padding:1.2mm .3mm}table.grid.dense tr.days th span{font-size:6pt;letter-spacing:-.2px}table.grid.dense th{font-size:8.5pt}table.grid.dense td{font-size:9pt}table.grid.multi .ttd{font-size:7.5pt;left:1.2mm;top:1mm}\n.ttd{position:absolute;top:1.5mm;font-size:8.5pt;color:#555}.ttd.l{left:2mm}.ttd.r{left:50%}\n.sig-cell{position:absolute;top:1mm;bottom:1mm;display:flex;align-items:center;justify-content:center}\n.sig-cell img{max-width:100%;max-height:10.5mm;display:block}\n.sig-cell.l{left:5mm;width:calc(50% - 5mm)}.sig-cell.r{left:calc(50% + 3mm);right:1mm}\n.sig-cell.c{left:4mm;right:1mm}\n.sign-block{width:62mm;margin:5mm 0 0 auto;text-align:center;line-height:1.5}\n.sign-block .space{height:18mm;display:flex;align-items:center;justify-content:center}\n.ttd-img{max-height:18mm;max-width:58mm;display:block}\ntable.doku{table-layout:fixed}\ntable.doku td{height:44mm;padding:2mm}\ntable.doku tr.batal td{background:#ff6b6b;color:#000}\ntable.doku tr.remedial td:not(.foto){background:#fff200;color:#000}\ntable.grid.doku tr.remedial td.foto{background:transparent}\ntable.doku.dk .ph{width:46mm;height:30.7mm}table.doku.dk .ph-img{width:46mm;height:30.7mm}\ntable.doku.dk td{padding:2mm 1.5mm}table.doku.dk td.nama,table.doku.dk td.inst{font-size:9pt}\ntable.doku.sf td{height:46mm}table.doku.sf .ph,table.doku.sf .ph-img{width:30mm;height:40mm;object-fit:cover}table.doku.sf td.nama,table.doku.sf td.inst{font-size:9.5pt}\ntable.doku td.inst{font-size:9.5pt}\ntable.doku td.nama{font-weight:600;padding-left:3mm}\ntable.doku td.foto{text-align:center}\n.ph{height:40mm;width:60mm;margin:0 auto;border-radius:1.5mm;background:repeating-linear-gradient(45deg,#f3f4f6 0 10px,#eceef1 10px 20px);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#9aa0a6;gap:4px;font-size:9pt}\n.ph-img{width:60mm;height:40mm;display:block;margin:0 auto;border-radius:1mm;object-fit:contain}\n.pg-lap{font-family:Calibri,Carlito,\"Liberation Sans Narrow\",\"Arial Narrow\",Arial,sans-serif;color:#000;font-size:11pt}\n.pg-lap .lp-h{text-align:center;font-weight:700;font-size:14pt;line-height:1.3}\n.pg-lap .lp-h.s3{font-size:13pt}\n.pg-lap .lp-h small{font-size:10pt;font-weight:400}\n.pg-lap .lp-h.d{font-size:14pt}\n.pg-lap .lp-h{text-wrap:balance;overflow-wrap:anywhere}\n.pg-lap.x1 .lp-h{font-size:12.5pt}.pg-lap.x1 .lp-h.s3,.pg-lap.x1 .lp-h.d{font-size:12pt}\n.pg-lap.x2 .lp-h{font-size:11pt}.pg-lap.x2 .lp-h.s3,.pg-lap.x2 .lp-h.d{font-size:10.5pt}\n.pg-lap.pg-dy .content{display:flex;flex-direction:column}\n.pg-lap.pg-dy .content>.lp-h,.pg-lap.pg-dy .content>.lp-gap{flex:none}\n.pg-lap .lp-gap{height:2.5mm}\ntable.lap{width:190mm;margin-left:-8mm;border-collapse:collapse;table-layout:fixed}\ntable.lap th{background:#ffff54;color:#000;font-size:11pt;font-weight:700;border:1px solid #000;padding:.2mm 1.5mm;text-align:center;line-height:1.15}\ntable.lap.nl th{background:#ffd84a}\ntable.lap td{border:1px solid #000;padding:.1mm 1.5mm;font-size:11pt;line-height:1.15;height:4.8mm;vertical-align:middle;word-wrap:break-word}\ntable.lap td.c{text-align:center}\ntable.lap.nr th{background:#d9d9d9}\ntable.lap.rd th{background:#fff;font-size:10pt;border:1px solid #000}\ntable.lap.rd td{height:4.7mm;padding:.1mm 1.2mm;font-size:9.5pt;line-height:1.15;vertical-align:middle}\ntable.lap.rd td.gy{background:#e7e6e6}\ntable.lap.rd td.hr{font-size:10pt}\ntable.lap.rd tr.sep td{height:2.4mm;padding:0;background:#595959}\ntable.lap.nr td{height:17mm;padding:1mm 1.5mm;font-size:11pt;line-height:1.25}\ntable.lap.nr td.mt{text-align:left}\ntable.lap.nr .bl{display:flex;gap:1.5mm;line-height:1.25}\ntable.lap.nr .bl i{font-style:normal;flex:none;width:3mm}\ntable.lap.nr .nip{margin-top:.5mm}\ntable.lap.nr td.sg img{display:block;max-width:26mm;max-height:15mm;margin:0 auto}\ntable.lap td.k{text-align:center;color:#3b3b3b}\ntable.lap tr.merah td{background:#ff6b6b;color:#000;font-weight:700}\n.pg-lap .lp-dt{width:87mm;margin:4mm 0 0 auto;text-align:center}\n.pg-lap .lp-sgs{display:flex;margin-top:1mm}\n.pg-lap .lp-sg{width:87mm;text-align:center}\n.pg-lap .lp-sg .jab{min-height:11mm;line-height:1.3}\n.pg-lap .lp-sg .sp{height:19mm;display:flex;align-items:center;justify-content:center}\n.pg-lap .lp-sg .sp img{max-height:18mm;max-width:60mm}\n.pg-lap .lp-sg .nm{font-weight:700;text-decoration:underline;min-height:5mm}\n.pg-lap .lp-sg .nip{font-size:10.5pt}\n.pg-lap .lp-pn{margin-top:5mm;line-height:1.35}\n.pg-lap .lp-pn .e{padding-left:1.5mm}.pg-lap .lp-pn .e i{display:inline-block;width:6mm;font-style:normal}\n.pg-lap .lp-pn .t{padding-left:7.6mm}\n.pg-lap .lp-dir{width:88mm;margin:3mm 0 0 93mm;text-align:center;line-height:1.35}\n.pg-lap .lp-dir img{display:block;width:22mm;height:22mm;margin:1mm auto}\n.pg-lap .lp-dir .n{font-weight:700;text-decoration:underline}\n.pg-lap .lp-fo{height:94mm;display:flex;align-items:center;justify-content:center}\n.pg-lap.pg-dy .lp-fo{flex:1 1 0;min-height:0;height:auto;max-height:94mm;position:relative}\n.pg-lap.pg-dy .lp-fo .none{height:100%;max-height:94mm}\n.pg-lap.pg-dy .lp-fo img{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);height:100%;width:160mm;max-width:100%}\n.pg-lap .lp-fo img{height:94mm;width:auto;max-width:160mm;object-fit:contain;display:block} \n.pg-lap .lp-fo .none{width:141mm;height:94mm;border:1px dashed #b8bcc4;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#9aa0a6;gap:4px;font-size:10pt;background:repeating-linear-gradient(45deg,#f6f7f8 0 10px,#eff0f2 10px 20px)}";
const MATERI_KAT = [
  { id: "reg", judul: "Regulasi Kebakaran (Kelas D)", grp: "wasnaker", isi: ["Dasar-dasar dan kebijakan K3", "K3 Penanggulangan Kebakaran", "UU No 1 Tahun 1970", "Kepmenaker No 186 Tahun 1999", "Dasar-dasar pengaman kebakaran", "Teori Api dan Anatomi Kebakaran"] },
  { id: "teori", judul: "Teori Kebakaran (Kelas D)", grp: "ahli", isi: ["Prinsip-prinsip pencegahan", "Teknik Pemadaman Kebakaran", "Sistem Proteksi Pasif (Komprehensif dll)", "Sistem Proteksi Aktif (Apar dan Hydrant)"] },
  /* Pesawat Angkat & Angkut. isi = poin yang tampil di Absensi Narasumber; sesi = isi tiap sesi belajar di Rundown (urut: 08.00-10.00, 10.15-12.00, 13.00-15.00, 15.15-17.00); app = kolom Aplikasi (mis. ZOOM) */
  { id: "ang1", judul: "Regulasi Pesawat Angkat", grp: "wasnaker", isi: ["Kebijakan dan Dasar-dasar K3", "Undang-Undang No.1 Tahun 1970", "Permenaker No.8 Tahun 2020"], sesi: [["Kebijakan dan Dasar-dasar K3"], ["Undang-Undang No.1 Tahun 1970"], ["Permenaker No.8 Tahun 2020"], ["Permenaker No.8 Tahun 2020"]] },
  { id: "prakw", judul: "Praktek", grp: "wasnaker", isi: ["Praktek"], sesi: [["Praktek"]] },
  { id: "crane2", judul: "Crane Teknis 1", grp: "praktisi", isi: ["Pengetahuan Dasar Crane", "Pengetahuan Dasar Kelistrikan", "Pengetahuan Job Safety Analysis", "Sebab-Sebab Kecelakaan", "Pengetahuan Tenaga Penggerak & Hidrolik Penggerak", "Perangkat Keselamatan Kerja (Safety Devices)"], sesi: [["Pengetahuan Dasar Crane", "Pengetahuan Dasar Kelistrikan"], ["Pengetahuan Job Safety Analysis", "Sebab-Sebab Kecelakaan"], ["Pengetahuan Tenaga Penggerak & Hidrolik Penggerak"], ["Perangkat Keselamatan Kerja (Safety Devices)"]] },
  { id: "crane3", judul: "Crane Teknis 2", grp: "praktisi", isi: ["Faktor-faktor yang mempengaruhi beban kerja aman", "Pengoperasian Aman", "Perawatan dan Pemeriksaan Harian", "Stabilitas"], sesi: [["Faktor-faktor yang mempengaruhi beban kerja aman"], ["Pengoperasian Aman"], ["Perawatan dan Pemeriksaan Harian"], ["Stabilitas"]] },
  { id: "crane4", judul: "Crane Teknis 3 (Kelas 1)", grp: "praktisi", isi: ["Tali Kawat Baja (08.00 – 10.30)", "Alat Bantu Angkat dan Pengikatan (10.30 – 13.45)", "Menghitung Berat Beban (13.45 – 16.15)"], sesi: [["Tali Kawat Baja"], ["Alat Bantu Angkat dan Pengikatan"], ["Menghitung Berat Beban"]] },
  { id: "conv2", judul: "Conveyor Teknis 1", grp: "praktisi", isi: ["Pengoperasian aman pada belt Conveyor", "Pengetahuan Job Safety Analysis", "Sebab-Sebab Kecelakaan", "Pengetahuan Tenaga Penggerak & Hidrolik Penggerak", "Perangkat Keselamatan Kerja (Safety Devices)"], sesi: [["Pengoperasian aman pada belt Conveyor"], ["Pengetahuan Job Safety Analysis", "Sebab-Sebab Kecelakaan"], ["Pengetahuan Tenaga Penggerak & Hidrolik Penggerak"], ["Perangkat Keselamatan Kerja (Safety Devices)"]] },
  { id: "prakp", judul: "Conveyor Teknis 2 (Praktek)", grp: "praktisi", isi: ["Praktek"], sesi: [["Praktek"], ["Praktek"], ["Praktek"]] },
  { id: "eval", judul: "Evaluasi Teori", grp: "kemnaker", isi: ["Evaluasi Teori"], sesi: [["Evaluasi Teori"], ["Evaluasi Teori"]], app: "ZOOM" },
  /* Rigger (Juru Ikat) berdiri sendiri, tanpa Crane */
  { id: "rig1", judul: "Rigger Teknis 1", grp: "praktisi", isi: ["Pengetahuan Tali Kawat Baja", "Pengetahuan Alat Bantu angkat", "Menghitung Berat Beban", "Pengetahuan Cara Mengikat", "Sebab-Sebab Kecelakaan Kerja dan Penanganan-nya", "Tanda Isyarat atau Aba-Aba Pengoperasian Keran Angkat", "Pengoperasian Aman", "Pemeriksaan dan Perawatan Harian"], sesi: [["Pengetahuan Tali Kawat Baja", "Pengetahuan Alat Bantu angkat"], ["Menghitung Berat Beban", "Pengetahuan Cara Mengikat"], ["Sebab-Sebab Kecelakaan Kerja dan Penanganan-nya", "Tanda Isyarat atau Aba-Aba Pengoperasian Keran Angkat"], ["Pengoperasian Aman", "Pemeriksaan dan Perawatan Harian"]] },
  { id: "rig2", judul: "Rigger Teknis 2", grp: "wasnaker", isi: ["Pengetahuan Dasar Keran Angkat Hoist Crane", "Pengetahuan Dasar Kelistrikan", "Pengetahuan Tali Kawat Baja", "Pengetahuan Alat Bantu Angkat"], sesi: [["Pengetahuan Dasar Keran Angkat Hoist Crane"], ["Pengetahuan Dasar Kelistrikan"], ["Pengetahuan Tali Kawat Baja"], ["Pengetahuan Alat Bantu Angkat"]] },
  { id: "rigp", judul: "Evaluasi Praktek", grp: "praktisi", isi: ["Evaluasi Praktek"], sesi: [["Evaluasi Praktek"], ["Evaluasi Praktek"], ["Evaluasi Praktek"], ["Evaluasi Praktek"]] },
  { id: "evalw", judul: "Evaluasi Teori", grp: "wasnaker", isi: ["Evaluasi Teori"], sesi: [["Evaluasi Teori"]] },
  /* K3 Lingkungan Kerja B3: Ahli K3 Kimia (Hari 1-12) & Ruang Terbatas. grp "*" = materi tampil untuk narasumber mana pun */
  { id: "kim1", judul: "Kimia 1 – Dasar & Penyimpanan Bahan Kimia", grp: "harso", isi: ["Pengetahuan Dasar Bahan Kimia Berbahaya", "Penyimpanan dan penanganan Bahan Kimia Berbahaya"], sesi: [["Pengetahuan Dasar Bahan Kimia Berbahaya"], ["Pengetahuan Dasar Bahan Kimia Berbahaya"], ["Penyimpanan dan penanganan Bahan Kimia Berbahaya"], ["Penyimpanan dan penanganan Bahan Kimia Berbahaya"]] },
  { id: "kim2", judul: "Kimia 2 – Hygiene Industri & Toksikologi", grp: "harso", isi: ["Hygiene Industry", "Pengantar Toksikologi Industri", "PAK Paparan Faktor Kimia"], sesi: [["Hygiene Industry"], ["Hygiene Industry"], ["Pengantar Toksikologi Industri"], ["PAK Paparan Faktor Kimia"]] },
  { id: "kim3", judul: "Kimia 3 – Inspeksi Fasilitas & Pengendalian Teknis", grp: "harso", isi: ["Teknik dan Prosedur Inspeksi Fasilitas Kimia", "Pengendalian Teknis BKB"], sesi: [["Teknik dan Prosedur Inspeksi Fasilitas Kimia"], ["Teknik dan Prosedur Inspeksi Fasilitas Kimia"], ["Pengendalian Teknis BKB"], ["Pengendalian Teknis BKB"]] },
  { id: "kim4", judul: "Kimia 4 – LDKB & Tanggap Darurat Kimia", grp: "harso", isi: ["Klasifikasi dan Komunikasi Bahaya Kimia (LDKB & LABEL)", "Tanggap Darurat Kimia"], sesi: [["Klasifikasi dan Komunikasi Bahaya Kimia (LDKB & LABEL)"], ["Klasifikasi dan Komunikasi Bahaya Kimia (LDKB & LABEL)"], ["Tanggap Darurat Kimia"], ["Tanggap Darurat Kimia"]] },
  { id: "kim5", judul: "Kimia 5 – Penilaian Resiko & Major Hazard", grp: "harso", isi: ["Identifikasi Bahaya & Penilaian Resiko Faktor Kimia", "Pengendalian Bahaya Besar / Major Hazard Control"], sesi: [["Identifikasi Bahaya & Penilaian Resiko Faktor Kimia"], ["Identifikasi Bahaya & Penilaian Resiko Faktor Kimia"], ["Pengendalian Bahaya Besar / Major Hazard Control"], ["Pengendalian Bahaya Besar / Major Hazard Control"]] },
  { id: "kim6", judul: "Kimia 6 – Regulasi K3 Kimia", grp: "dinas", isi: ["Undang-Undang No. 1 tahun 1970", "Kebijakan K3 Nasional", "Peraturan Perundang-Undangan K3 bidang Kimia di tempat kerja"], sesi: [["Undang-Undang No. 1 tahun 1970"], ["Kebijakan K3 Nasional"], ["Peraturan Perundang-Undangan K3 bidang Kimia di tempat kerja"], ["Peraturan Perundang-Undangan K3 bidang Kimia di tempat kerja"]] },
  { id: "kim7", judul: "Kimia 7 – APD & Ruang Terbatas", grp: "wendri", isi: ["Manajemen APD", "Prosedur K3 di Ruang Terbatas / Confined Space"], sesi: [["Manajemen APD"], ["Manajemen APD"], ["Prosedur K3 di Ruang Terbatas / Confined Space"], ["Prosedur K3 di Ruang Terbatas / Confined Space"]] },
  { id: "kim8", judul: "Kimia 8 – Korosi & Monitoring Kontaminan", grp: "wendri", isi: ["Pencegahan Korosi", "Teknik & Methoda Monitoring & Analisa Kontaminan di Udara"], sesi: [["Pencegahan Korosi"], ["Pencegahan Korosi"], ["Teknik & Methoda Monitoring & Analisa Kontaminan di Udara"], ["Teknik & Methoda Monitoring & Analisa Kontaminan di Udara"]] },
  { id: "kim9", judul: "Kimia 9 – Kelembagaan K3 & SMK3", grp: "elien", isi: ["Kelembagaan & Keahlian K3", "Pengenalan SMK3", "Audit SMK3"], sesi: [["Kelembagaan & Keahlian K3"], ["Kelembagaan & Keahlian K3"], ["Pengenalan SMK3"], ["Audit SMK3"]] },
  { id: "kim10", judul: "Kimia 10 – P3K, Limbah & Audit SMK3", grp: "elien", isi: ["P3K Kimia", "Pengelolaan Limbah Kimia Berbahaya", "Audit SMK3"], sesi: [["P3K Kimia"], ["P3K Kimia"], ["Pengelolaan Limbah Kimia Berbahaya"], ["Audit SMK3"]] },
  { id: "kim11", judul: "Kimia 11 – PKL & Laporan", grp: "elien", isi: ["PKL", "Penyusunan Laporan"], sesi: [["PKL"], ["PKL"], ["Penyusunan Laporan"], ["Penyusunan Laporan"]] },
  { id: "kim12", judul: "Kimia 12 – Evaluasi & Seminar", grp: "kemnaker", isi: ["Evaluasi", "Seminar"], sesi: [["Evaluasi"], ["Evaluasi"], ["Seminar"], ["Seminar"]] },
  { id: "prt1", judul: "Penyelamat RT 1 – Regulasi & Izin Kerja", grp: "*", isi: ["Peraturan Perundang-Undangan K3 Ruang Terbatas", "Dasar-Dasar K3 Ruang Terbatas", "Dasar K3 Ruang Terbatas", "Prosedur Ijin Kerja di Ruang Terbatas"], sesi: [["Peraturan Perundang-Undangan K3 Ruang Terbatas"], ["Peraturan Perundang-Undangan K3 Ruang Terbatas", "Dasar-Dasar K3 Ruang Terbatas"], ["Dasar K3 Ruang Terbatas", "Prosedur Ijin Kerja di Ruang Terbatas"], ["Prosedur Ijin Kerja di Ruang Terbatas"]] },
  { id: "prt2", judul: "Penyelamat RT 2 – Tanggap Darurat, APD & Penyelamatan", grp: "*", isi: ["Prosedur Tanggap Darurat & Komunikasi di Ruang Terbatas", "P3K di Ruang Terbatas", "Alat Pelindung Diri/APD di Ruang Terbatas dan Alat Bantu Pernafasan", "Teknik Penyelamatan di Ruang Terbatas"], sesi: [["Prosedur Tanggap Darurat & Komunikasi di Ruang Terbatas"], ["P3K di Ruang Terbatas", "Alat Pelindung Diri/APD di Ruang Terbatas dan Alat Bantu Pernafasan"], ["Alat Pelindung Diri/APD di Ruang Terbatas dan Alat Bantu Pernafasan", "Teknik Penyelamatan di Ruang Terbatas"], ["Teknik Penyelamatan di Ruang Terbatas"]] },
  { id: "trt1", judul: "Teknisi RT 1 – Tanggap Darurat, APD & P3K", grp: "*", isi: ["Rencana Prosedur Tanggap Darurat & P3K", "Alat Pelindung Diri di Ruang Terbatas", "Teknik Penyelamatan di Ruang Terbatas", "Teknik P3K di Ruang Terbatas"], sesi: [["Rencana Prosedur Tanggap Darurat & P3K"], ["Alat Pelindung Diri di Ruang Terbatas"], ["Teknik Penyelamatan di Ruang Terbatas"], ["Teknik P3K di Ruang Terbatas"]] },
  { id: "trt2", judul: "Teknisi RT 2 – Risiko Bahaya & Program Memasuki RT", grp: "*", isi: ["Karakteristik Bahan Kimia Berbahaya", "Identifikasi Resiko Bahaya Ruang Terbatas", "Program Memasuki Ruang Terbatas"], sesi: [["Karakteristik Bahan Kimia Berbahaya"], ["Identifikasi Resiko Bahaya Ruang Terbatas"], ["Identifikasi Resiko Bahaya Ruang Terbatas", "Program Memasuki Ruang Terbatas"], ["Program Memasuki Ruang Terbatas"]] },
  { id: "trt3", judul: "Teknisi RT 3 – Deteksi Gas & Log Out Tag Out", grp: "*", isi: ["Teknik Pengukuran dan Deteksi Gas Ruang Terbatas", "Prosedur Log Out Tag Out"], sesi: [["Teknik Pengukuran dan Deteksi Gas Ruang Terbatas"], ["Teknik Pengukuran dan Deteksi Gas Ruang Terbatas"], ["Prosedur Log Out Tag Out"], ["Prosedur Log Out Tag Out"]] },
  { id: "trt4", judul: "Teknisi RT 4 – Regulasi & Izin Kerja", grp: "*", isi: ["Peraturan Perundang-Undangan K3 Ruang Terbatas", "Dasar-Dasar K3 Ruang Terbatas", "Prosedur Ijin Kerja di Ruang Terbatas"], sesi: [["Peraturan Perundang-Undangan K3 Ruang Terbatas"], ["Dasar-Dasar K3 Ruang Terbatas"], ["Dasar-Dasar K3 Ruang Terbatas"], ["Prosedur Ijin Kerja di Ruang Terbatas"]] },
  { id: "rtev", judul: "Evaluasi & Praktek (Ruang Terbatas)", grp: "*", isi: ["Evaluasi", "Praktek"], sesi: [["Evaluasi"], ["Evaluasi"], ["Praktek"], ["Praktek"]] },
  /* Teknisi K3 Deteksi Gas (3 hari: Hari 1-2 online, Hari 3 offline); narasumber diisi sendiri */
  { id: "tdg1", judul: "Deteksi Gas 1", grp: "*", isi: ["Dasar-Dasar K3", "Kebijakan K3", "Peraturan Perundang-Undangan K3 Ruang Terbatas"], sesi: [["Dasar-Dasar K3"], ["Kebijakan K3"], ["Peraturan Perundang-Undangan K3 Ruang Terbatas"], ["Peraturan Perundang-Undangan K3 Ruang Terbatas"]], app: "ONLINE" },
  { id: "tdg2", judul: "Deteksi Gas 2", grp: "*", isi: ["Prosedur Ijin Kerja di Ruang Terbatas", "Karakteristik Gas Atmosfir", "Pengenalan Alat Deteksi Gas", "Metode Deteksi Gas Atmosfir"], sesi: [["Prosedur Ijin Kerja di Ruang Terbatas"], ["Karakteristik Gas Atmosfir", "Pengenalan Alat Deteksi Gas"], ["Metode Deteksi Gas Atmosfir"], ["Metode Deteksi Gas Atmosfir"]], app: "ONLINE" },
  { id: "tdg3", judul: "Deteksi Gas 3", grp: "*", isi: ["Evaluasi Online", "Evaluasi Praktek"], sesi: [["Evaluasi Online"], ["Evaluasi Online"], ["Evaluasi Praktek"], ["Evaluasi Praktek"]], app: "OFFLINE" }
];
const naraNew = () => ({ kid: "", nama: "", nip: "", inst: "", mid: "", mtxt: "", ttd: "" });
const NR_KEY = /^(\d{4}-\d{2}-\d{2})(?:_(\d+))?$/, NR_MAX = 4;
const nrIso = k => (NR_KEY.exec(k) || [])[1] || "";
const nrOff = (L, k) => !!(L && L.nrOff && L.nrOff[k]);
const nrKeys = (L, d) => nrOff(L, d) ? [] : [d, ...Object.keys(L.nr || {}).filter(k => { const m = NR_KEY.exec(k); return m && m[1] === d && m[2] && !nrOff(L, k); }).sort((a, b) => +a.split("_")[1] - +b.split("_")[1])];
const nrKosong = r => !(r && (r.kid || r.nama || r.mtxt || r.ttd || r.inst));
const nrCetak = (L, days) => days.flatMap(d => nrKeys(L, d).filter((k, i) => i === 0 || !nrKosong((L.nr || {})[k])));
const kelasKey = l => "k" + fnv(String(l)).split(":")[0];
const nrEf = r => (r && r.kid ? r : naraNew());
function nrMigrasi(ev) { // isian narasumber per alat (versi sebelumnya, lap.nrk) digabung ke satu isian bersama (lap.nr); yang sudah terisi tidak ditimpa
  const L = ev && ev.lap; if (!L || !L.nrk || !Object.keys(L.nrk).length || isB3(ev.acara)) return; // B3: isian per program dipertahankan
  L.nr = L.nr || {};
  Object.keys(L.nrk).forEach(kk => Object.keys(L.nrk[kk] || {}).forEach(d => { const r = L.nrk[kk][d]; if (r && r.kid && !(L.nr[d] && L.nr[d].kid)) L.nr[d] = { ...r }; }));
  L.nrk = {};
}
const lapDefault = () => ({
  nilai: true, hasil: true, harian: true, nara: true, selfie: false, rundown: null, nr: {}, nrk: {}, nrOffK: {}, batch: "", nKota: "", nTgl: "",
  s1: { jab: "PENGAWAS KETENAGAKERJAAN\nSULAWESI TENGAH", nama: "", nip: "", ttd: "" },
  s2: { jab: "AHLI PENANGGULANGAN KEBAKARAN", nama: "", ttd: "" },
  hari: {}
});
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function kelasList(a) {
  const o = [], src = Array.isArray(a && a.kelas) ? a.kelas : String((a && a.kelas) || "").split(/\r?\n/);
  src.forEach(k => { k = String(k == null ? "" : k).replace(/\s+/g, " ").trim(); if (k && !o.includes(k)) o.push(k); });
  return o;
}
const J_DAMKAR = "K3 PENANGGULANGAN KEBAKARAN", J_ANGKAT = "K3 PESAWAT ANGKAT PESAWAT ANGKUT";
const J_B3 = "K3 LINGKUNGAN KERJA BAHAN BERBAHAYA DAN BERACUN";
const isB3 = a => !!a && a.jenis === "b3";
const fotoDua = a => !!a && (!!a.damkar || a.jenis === "b3");
const judulB3Kelas = k => `${J_B3} (${String(k).toUpperCase()})`;
const jenisOf = a => a.jenis != null && a.jenis !== "" ? a.jenis : ((a.kegiatan || "").trim() || a.damkar || a.papa ? "lain" : "");
const judulAngkatKelas = k => `${J_ANGKAT} (OPERATOR ${String(k).toUpperCase()})`;
function kelasEv(ev, k) {
  const ks = kelasList(ev.acara), a = ev.acara, kg = (a.kegiatan || "").trim(), hk = hariKelas(ev, k);
  return {
    ...ev, kelasNama: k,
    peserta: ev.peserta.filter(p => (p.nama || "").trim() && (k ? p.kelas === k : !ks.includes(p.kelas))),
    acara: { ...a, kegiatan: k ? (a.jenis === "angkat" ? judulAngkatKelas(k) : a.jenis === "b3" ? judulB3Kelas(k) : (kg ? kg + " \u2013 " + k : k)) : a.kegiatan, ...(hk ? { hari: hk, tanggal: hk[0], tanggal2: hk[hk.length - 1] } : {}) }, // alat selain Kelas 1: hanya 4 hari pertama
    lap: isB3(a) // B3: narasumber tiap program sendiri-sendiri (lap.nrk[kunciProgram]); alat lain: satu isian untuk semua
      ? { ...ev.lap, nr: ((ev.lap.nrk || {})[kelasKey(k)]) || {}, nrOff: ((ev.lap.nrOffK || {})[kelasKey(k)]) || {}, nrHari: hariKelas(ev, k) }
      : { ...ev.lap, nr: ev.lap.nr || {}, nrHari: hariKelas(ev, k) } // narasumber: satu isian untuk semua alat; hari yang dicetak mengikuti kelas
  };
}
function kelasGroups(ev) { // [{kelas, ev}] ; bukan PAPA = satu kelompok tanpa nama kelas
  if (!ev.acara.papa) return [{ kelas: "", ev }];
  nrMigrasi(ev);
  const out = [];
  [...kelasList(ev.acara), ""].forEach(k => { const e = kelasEv(ev, k); if (e.peserta.length) out.push({ kelas: k, ev: e }); });
  return out.length ? out : [{ kelas: "", ev: kelasEv(ev, "") }];
}
const fmtTglPendek = iso => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? "" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(d);
};
const joinDan = l => l.length > 1 ? l.slice(0, -1).join(", ") + " dan " + l[l.length - 1] : (l[0] || "");
function hariTanggal(a, days) {
  days = (days || hariList(a)).filter(Boolean);
  if (!days.length) return "";
  if (days.length === 1) return fmtTglPendek(days[0]);
  const ds = days.map(toD);
  const bln = d => new Intl.DateTimeFormat("id-ID", { month: "long" }).format(d);
  const runs = [];
  ds.forEach((d, i) => { if (i && Math.round((d - ds[i - 1]) / 864e5) === 1) runs[runs.length - 1].push(d); else runs.push([d]); });
  const tgl = joinDan(runs.map((r, i) => {
    const s = r[0], e = r[r.length - 1], nx = runs[i + 1] && runs[i + 1][0];
    const cross = s.getMonth() !== e.getMonth() || s.getFullYear() !== e.getFullYear();
    let t = String(s.getDate());
    if (cross) t += ` ${bln(s)}${s.getFullYear() !== e.getFullYear() ? " " + s.getFullYear() : ""}`;
    if (r.length > 1) t += ` – ${e.getDate()}`;
    if (cross || !nx || nx.getMonth() !== e.getMonth() || nx.getFullYear() !== e.getFullYear()) t += ` ${bln(e)}`;
    if (!nx || nx.getFullYear() !== e.getFullYear()) t += ` ${e.getFullYear()}`;
    return t;
  }));
  return tgl;
}
const jam = t => (t || "").replace(":", ".");
function waktu(a) {
  if (!a.jamMulai && !a.jamSelesai) return "";
  const s = a.jamSelesai ? `${jam(a.jamMulai)} – ${jam(a.jamSelesai)}` : `${jam(a.jamMulai)} – selesai`;
  return `${s} ${a.zona || ""}`.trim();
}
const dots = "................................";
const CAM = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
let PAGE_X = "";
const page = (inner, cls) => `<section class="page ${cls}${/pg-lap/.test(cls) && PAGE_X ? " " + PAGE_X : ""}"><img class="kop-head" src="${KOP_HEAD}" alt=""><div class="content">${inner}</div><img class="kop-foot" src="${KOP_FOOT}" alt=""></section>`;
const v = x => esc(x) || "&nbsp;";
const DK_PER = 4, MAX_DAYS = 14;
const toD = iso => { const d = new Date((iso || "") + "T00:00:00"); return isNaN(d) ? null : d; };
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function hariList(a) {
  if (Array.isArray(a.hari) && a.hari.length) {
    const u = [...new Set(a.hari.filter(Boolean))].sort();
    return u.length ? u.slice(0, MAX_DAYS) : [""];
  }
  const s = toD(a.tanggal); if (!s) return [""];
  let e = toD(a.tanggal2); if (!e || e < s) e = s;
  const out = [];
  for (const d = new Date(s); d <= e && out.length < MAX_DAYS; d.setDate(d.getDate() + 1)) out.push(isoOf(d));
  return out;
}
const hariPendek = iso => { const d = toD(iso); return d ? d.getDate() + "/" + (d.getMonth() + 1) + "/" + String(d.getFullYear()).slice(2) : ""; };
const BLN_UP = i => BULAN[i].toUpperCase();
function rentangUp(days) { // "20 – 22 AGUSTUS 2026"
  const ds = days.map(toD).filter(Boolean); if (!ds.length) return "";
  const s = ds[0], e = ds[ds.length - 1];
  if (+s === +e) return `${s.getDate()} ${BLN_UP(s.getMonth())} ${s.getFullYear()}`;
  if (s.getFullYear() !== e.getFullYear()) return `${s.getDate()} ${BLN_UP(s.getMonth())} ${s.getFullYear()} – ${e.getDate()} ${BLN_UP(e.getMonth())} ${e.getFullYear()}`;
  if (s.getMonth() !== e.getMonth()) return `${s.getDate()} ${BLN_UP(s.getMonth())} – ${e.getDate()} ${BLN_UP(e.getMonth())} ${e.getFullYear()}`;
  return `${s.getDate()} – ${e.getDate()} ${BLN_UP(e.getMonth())} ${e.getFullYear()}`;
}
function lapTexts(ev) {
  const a = ev.acara, L = ev.lap || lapDefault(), days = hariList(a).filter(Boolean);
  const kota = (L.nKota || a.kota || "").trim(), iso = L.nTgl || days[days.length - 1] || "", d = toD(iso);
  const tglTtd = d ? `${new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(d).toLowerCase()} ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : "";
  const batch = (L.batch || "").trim().toUpperCase();
  return {
    keg: (a.kegiatan || "").trim().toUpperCase(),
    tgl1: (days.length ? hariTanggal(a, days).toUpperCase().replace(/ – /g, "-") + ` (${days.length} HARI)` : "") + (batch ? ` (${batch})` : ""),
    rentang: rentangUp(days), batch,
    ttd: `${kota}${kota && tglTtd ? ", " : ""}${tglTtd}`,
    days: days.map((iso, i) => { const x = toD(iso); return { iso, title: `DAY ${i + 1} (${x.getDate()} ${BLN_UP(x.getMonth())} ${x.getFullYear()})` }; })
  };
}
const rdOn = ev => { const r = (ev.lap || {}).rundown; return r == null ? (jenisOf(ev.acara) === "angkat" || jenisOf(ev.acara) === "b3") : !!r; };
const RD_A = [["07.45 – 08.00", "open"], ["08.00 – 10.00", "s"], ["10.00 – 10.15", "br"], ["10.15 – 12.00", "s"], ["12.00 – 13.00", "iso"], ["13.00 – 15.00", "s"], ["15.00 – 15.15", "br"], ["15.15 – 17.00", "s"]];
const RD_B = [["08.00 – 08.15", "open"], ["08.15 – 10.00", "s"], ["10.00 – 10.15", "br"], ["10.15 – 12.00", "s"], ["12.00 – 13.00", "iso"], ["13.00 – 17.00", "s"]];
const RD_TXT = { open: ["Pembukaan, Registrasi, (Absen Pagi)"], openB: ["Pembukaan, (Absen Pagi)"], b3a: ["Pembukaan, Absensi"], b3: ["Absensi Peserta"], br: ["Coffee Break"], iso: ["ISOMA"] };
const rdRole = (inst, nama) => { const t = /wasnaker/i.test(inst || "") ? "Wasnaker" : String(inst || "").trim(); return t && t !== String(nama || "").trim() ? t : ""; };
function rdSesiRow(r) { // sesi belajar yang dipakai satu baris narasumber: dari katalog (sesi) atau dibagi rata dari poin materi
  const m = r.mid && r.mid !== "manual" ? MATERI_KAT.find(x => x.id === r.mid) : null;
  if (m && m.sesi) return m.sesi.map(l => ({ lines: l.slice(), app: m.app || "" }));
  const lines = String(r.mtxt || "").split("\n").map(x => x.trim()).filter(Boolean);
  if (!lines.length) return [{ lines: [], app: "" }];
  const n = Math.min(lines.length, 4), out = Array.from({ length: n }, () => ({ lines: [], app: "" }));
  lines.forEach((x, i) => out[Math.min(n - 1, Math.floor(i * n / lines.length))].lines.push(x));
  return out;
}
function rdBuild(ev) { // [{ iso, i, rows:[{w, k, t:[], app, pj, ns}] }]
  const L = ev.lap || {}, days = hariList(ev.acara).filter(Boolean);
  return days.map((iso, i) => {
    const blocks = nrKeys(L, iso).filter(k => (L.nr || {})[k] && L.nr[k].kid).map(k => { const r = nrEf(L.nr[k]); return { r, ses: rdSesiRow(r) }; });
    let total = blocks.reduce((n, b) => n + b.ses.length, 0);
    for (let j = blocks.length - 1; j >= 0 && total > 4; j--) { // maksimal 4 sesi sehari: kelebihan digabung ke sesi terakhir narasumber itu
      const b = blocks[j], cut = Math.min(total - 4, b.ses.length - 1);
      if (cut > 0) { const t = b.ses.splice(b.ses.length - cut, cut); b.ses[b.ses.length - 1].lines.push(...t.flatMap(x => x.lines)); total -= cut; }
    }
    const B = total > 0 && total <= 3, grid = B ? RD_B : RD_A, flat = [];
    blocks.forEach((b, bi) => b.ses.forEach(se => flat.push({ ...se, bi })));
    let si = 0; const rows = grid.map(([w, k]) => {
      if (k === "s") { const se = flat[si++]; return { w, k, t: se ? se.lines : [], app: se ? se.app : "", bi: se ? se.bi : -1 }; }
      const b3 = isB3(ev.acara); // B3: pembukaan hanya di hari pertama program, hari lain "Absensi Peserta"; tanpa PJK3
      return { w, k, t: k === "open" ? (b3 ? (i === 0 ? RD_TXT.b3a : RD_TXT.b3) : (B ? RD_TXT.openB : RD_TXT.open)) : RD_TXT[k], app: "", bi: -1, pj: k === "open" && !b3 };
    });
    blocks.forEach((b, bi) => { // sel Narasumber digabung dari sesi pertama sampai sesi terakhir narasumber itu
      const idx = rows.map((r, j) => r.bi === bi ? j : -1).filter(j => j >= 0); if (!idx.length) return;
      rows[idx[0]].ns = { start: 1, span: idx[idx.length - 1] - idx[0] + 1, r: b.r };
      for (let j = idx[0] + 1; j <= idx[idx.length - 1]; j++) rows[j].ns = { skip: 1 };
    });
    return { iso, i, rows };
  });
}
function rdTitle(ev) { // [baris 1, baris 2]
  const keg = (ev.acara.kegiatan || "").trim().toUpperCase(), rg = rentangUp(hariList(ev.acara).filter(Boolean)), m = /^(.*?)\s*(\(.*\))\s*$/.exec(keg);
  return m ? [`JADWAL PEMBINAAN ${m[1]}`.trim(), `${m[2]} ${rg}`.trim()] : [`JADWAL PEMBINAAN ${keg}`.trim(), rg];
}
const rdTgl = iso => { const d = toD(iso); return d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : ""; };
const rdLines = r => r.t.length > 1 && r.k === "s" ? r.t.map(x => "- " + x) : r.t;
function renderSet(S) { // S = kegiatan (atau kegiatan turunan satu kelas); menutupi S global
  const a = S.acara;
  const days = hariList(a), multi = days.length > 1, dense = multi && days.length > 7;
  const list = S.peserta.filter(p => (p.nama || "").trim() || p.instansi || p.foto);
  const rows = list.concat(Array.from({ length: Math.max(0, +a.barisKosong || 0) }, () => ({ nama: "", instansi: "" })));

  const info = `<table class="info">
    <tr><td class="k">Kegiatan</td><td class="c">:</td><td>${v(a.kegiatan)}</td></tr>
    <tr><td class="k">Tanggal</td><td class="c">:</td><td>${v(hariTanggal(a, days))}</td></tr>
    <tr><td class="k">Waktu</td><td class="c">:</td><td>${v(waktu(a))}</td></tr>
    <tr><td class="k">Tempat</td><td class="c">:</td><td>${v(a.tempat)}</td></tr></table>`;
  const infoMini = `<table class="info"><tr><td class="k">Kegiatan</td><td class="c">:</td><td>${v(a.kegiatan)}</td></tr></table>`;
  const cols = multi
    ? `<colgroup><col style="width:${dense ? 8 : 9}mm"><col style="width:${dense ? 31 : days.length > 4 ? 40 : 46}mm"><col style="width:${dense ? 26 : days.length > 4 ? 30 : 34}mm">${days.map(() => "<col>").join("")}<col style="width:${dense ? 17 : days.length > 4 ? 22 : 24}mm"></colgroup>`
    : `<colgroup><col style="width:9mm"><col><col style="width:46mm"><col style="width:42mm"><col style="width:26mm"></colgroup>`;
  const thead = multi
    ? `<thead><tr><th rowspan="2">No</th><th rowspan="2">Nama Peserta</th><th rowspan="2">Instansi / Perusahaan</th><th colspan="${days.length}">${dense ? "Tanda Tangan (Hari ke-)" : "Tanda Tangan"}</th><th rowspan="2">Keterangan</th></tr>
       <tr class="days">${days.map((d, k) => `<th>${dense ? k + 1 : "Hari " + (k + 1)}<br><span>${esc(dense ? hariPendek(d).split("/").slice(0, 2).join("/") : hariPendek(d))}</span></th>`).join("")}</tr></thead>`
    : `<thead><tr><th>No</th><th>Nama Peserta</th><th>Instansi / Perusahaan</th><th>Tanda Tangan</th><th>Keterangan</th></tr></thead>`;
  const nCol = 4 + days.length;
  const sign = `<div class="sign-block" title="Klik untuk menggoreskan tanda tangan penyelenggara"><div>${esc(a.kota || "")}${a.kota ? ", " : ""}${esc(fmtTglPendek(a.tglTtd))}<br>${esc(a.jabatanTtd || "")}${a.jabatanTtd ? "," : ""}</div><div class="space">${a.ttd ? `<img class="ttd-img" src="${a.ttd}" alt="">` : (orgLocked() ? `<span class="sign-hint">🔒 TTD mulai ${esc(fmtTglPendek(lastDay(a)))}</span>` : `<span class="sign-hint">✍️ Klik untuk tanda tangan</span>`)}</div><div>( ${a.namaTtd ? "<b><u>" + esc(a.namaTtd) + "</u></b>" : dots} )</div></div>`;

  // --- daftar hadir: pagination by measuring real height (handles long names that wrap)
  const tbl = body => `<table class="grid${multi ? " multi" : ""}${dense ? " dense" : ""}">${cols}${thead}<tbody>${body}</tbody></table>`;
  const sigImg = (p, k, cls) => !p.batal && p.ttd && days[k] && p.ttd[days[k]] ? `<span class="sig-cell ${cls}"><img src="${p.ttd[days[k]]}" alt=""></span>` : "";
  const rowHtml = (p, no) => {
    const rem = !!p.remedial && !p.batal, lastK = days.length - 1;
    const ttd = multi
      ? days.map((d, k) => rem && k < lastK ? `<td class="sign"></td>` : `<td class="sign${rem ? " lastd" : ""}"><span class="ttd l">${no}.</span>${sigImg(p, k, "c")}</td>`).join("")
      : `<td class="sign${rem ? " lastd" : ""}"><span class="ttd ${no % 2 ? "l" : "r"}">${no}.</span>${sigImg(p, 0, no % 2 ? "l" : "r")}</td>`;
    const cls = p.batal ? "batal" : rem ? "remedial" : "";
    return `<tr${cls ? ` class="${cls}" title="${p.batal ? "Cancel" : "Remedial (hanya hari terakhir)"}"` : ""}><td class="no">${no}</td><td>${v(p.nama)}</td><td>${v(p.instansi)}</td>${ttd}<td class="ket">${p.batal ? "Cancel" : rem ? "Remedial" : ""}</td></tr>`;
  };
  const dhBody = (c, pi, start, withSign) => `<h1>DAFTAR HADIR PESERTA${pi ? " <small>(lanjutan)</small>" : ""}</h1>${pi ? infoMini : info}
      ${c.length ? tbl(c.map((p, k) => rowHtml(p, start + k + 1)).join("")) : (pi ? "" : tbl(`<tr><td colspan="${nCol}" style="text-align:center;color:#999">Belum ada peserta</td></tr>`))}
      ${withSign ? sign : ""}`;
  const meas = measurer();
  const fits = (body, cls) => {
    meas.innerHTML = `<section class="page ${cls || ""}"><div class="content">${body}</div></section>`;
    const c = meas.querySelector(".content"), last = c.lastElementChild;
    return !last || last.getBoundingClientRect().bottom <= c.getBoundingClientRect().bottom + 0.5;
  };
  const ch = []; let cur = [], start = 0;
  for (const r of rows) {
    cur.push(r);
    if (cur.length > 1 && !fits(dhBody(cur, ch.length, start, false))) {
      cur.pop(); ch.push(cur); start += cur.length; cur = [r];
    }
  }
  ch.push(cur);
  { // pastikan blok tanda tangan muat di halaman terakhir
    const li = ch.length - 1, lastStart = rows.length - ch[li].length, moved = [];
    while (ch[li].length > 1 && !fits(dhBody(ch[li], li, lastStart, true))) moved.unshift(ch[li].pop());
    if (moved.length) ch.push(moved);
  }
  meas.innerHTML = "";

  let html = "", no0 = 0; const sec = {}; // urutan cetak: Daftar Hadir, Nilai, Absensi Narasumber, Dok. Harian, Dok. Peserta, Lulus/Tidak Lulus
  ch.forEach((c, pi) => { html += page(dhBody(c, pi, no0, pi === ch.length - 1), "pg-dh"); no0 += c.length; });
  sec.dh = html; html = "";


  // --- dokumentasi chunks (baris Cancel merah & Remedial kuning mengikuti daftar hadir; mode Damkar = 2 kolom foto)
  const dk = list, dkOn = fotoDua(a);
  const dch = [];
  for (let j = 0; j < dk.length; j += DK_PER) dch.push(dk.slice(j, j + DK_PER));
  if (!dch.length) dch.push([]);
  const fk = dkOn ? ["foto", "foto2"] : ["foto"], nFoto = fk.length;
  dch.forEach((c, pi) => {
    const tr = c.map((p, k) => {
      const n = pi * DK_PER + k + 1, bt = !!p.batal, rem = !bt && !!p.remedial;
      const fotos = fk.map(key => `<td class="foto">${bt ? "" : p[key] ? `<img class="ph-img" src="${p[key]}" alt="">` : `<div class="ph">${CAM}<span>Belum ada foto</span></div>`}</td>`).join("");
      return `<tr${bt ? ' class="batal"' : rem ? ' class="remedial"' : ""}><td class="no">${n}</td><td class="nama">${v(p.nama)}</td><td class="inst">${v(p.instansi)}</td>${fotos}</tr>`;
    }).join("") || `<tr><td colspan="${3 + nFoto}" style="text-align:center;color:#999">Belum ada peserta</td></tr>`;
    const wd = dkOn ? [9, 32, 32] : [10, 45, 44];
    html += page(`<h1>DOKUMENTASI PESERTA${pi ? " <small>(lanjutan)</small>" : ""}</h1>
      <table class="info"><tr><td class="k">Nama Kegiatan</td><td class="c">:</td><td>${v(a.kegiatan)}</td></tr></table>
      <table class="grid doku${dkOn ? " dk" : ""}"><thead><tr><th style="width:${wd[0]}mm">No</th><th style="width:${wd[1]}mm">Nama Peserta</th><th style="width:${wd[2]}mm">Instansi / Perusahaan</th>${dkOn ? "<th>Foto 1</th><th>Foto 2</th>" : "<th>Foto</th>"}</tr></thead><tbody>${tr}</tbody></table>`, "pg-dk");
  });


  // --- lembar laporan: Daftar Nilai, Daftar Nama (keterangan), Dokumentasi Harian
  const L = S.lap, LT = lapTexts(S), lpPeserta = S.peserta.filter(p => (p.nama || "").trim());
  PAGE_X = (LT.keg || "").length > 100 ? "x2" : (LT.keg || "").length > 58 ? "x1" : "";
  const up = s => esc(String(s || "").toUpperCase());
  const lapChunk = (rows, bodyFn) => {
    const chs = []; let cur = [], st = 0;
    for (const r of rows) {
      cur.push(r);
      if (cur.length > 1 && !fits(bodyFn(cur, chs.length, st, false), "pg-lap")) { cur.pop(); chs.push(cur); st += cur.length; cur = [r]; }
    }
    chs.push(cur);
    const li = chs.length - 1, ls = rows.length - chs[li].length, moved = [];
    while (chs[li].length > 1 && !fits(bodyFn(chs[li], li, ls, true), "pg-lap")) moved.unshift(chs[li].pop());
    if (moved.length) chs.push(moved);
    return chs;
  };
  const colg = W => `<colgroup>${W.map(w => `<col style="width:${w}mm">`).join("")}</colgroup>`;
  const empty = n => `<tr><td colspan="${n}" class="c" style="color:#999">Belum ada peserta</td></tr>`;
  let nNl = 0, nLn = 0, nDy = 0, nNr = 0, nRd = 0;
  sec.dk = html; html = "";

  let nSf = 0;
  if (L.selfie) { // Absen Selfie: satu tabel per hari (No, Nama, Perusahaan, Absen Pagi, Absen Siang), diletakkan setelah Daftar Hadir
    const dyN = hariList(a).filter(Boolean), dh = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    dyN.forEach((d, hi) => {
      const sch = []; for (let j = 0; j < Math.max(dk.length, 1); j += DK_PER) sch.push(dk.slice(j, j + DK_PER));
      sch.forEach((c, pi) => {
        const slot = (p, k) => { const u = p.sf && p.sf[d] && p.sf[d][k]; return `<td class="foto">${p.batal ? "" : u ? `<img class="ph-img sf" src="${u}" alt="">` : `<div class="ph sf">${CAM}<span>Belum absen</span></div>`}</td>`; };
        const tr = c.map((p, k) => { const bt = !!p.batal, rem = !bt && !!p.remedial; return `<tr${bt ? ' class="batal"' : rem ? ' class="remedial"' : ""}><td class="no">${pi * DK_PER + k + 1}</td><td class="nama">${v(p.nama)}</td><td class="inst">${v(p.instansi)}</td>${slot(p, "p")}${slot(p, "s")}</tr>`; }).join("") || `<tr><td colspan="5" style="text-align:center;color:#999">Belum ada peserta</td></tr>`;
        html += page(`<h1>ABSEN SELFIE PESERTA${pi ? " <small>(lanjutan)</small>" : ""}</h1>
      <table class="info"><tr><td class="k">Nama Kegiatan</td><td class="c">:</td><td>${v(a.kegiatan)}</td></tr><tr><td class="k">Hari / Tanggal</td><td class="c">:</td><td>Hari ke-${hi + 1} · ${esc(dh.format(toD(d)))}</td></tr></table>
      <table class="grid doku sf"><thead><tr><th style="width:9mm">No</th><th style="width:36mm">Nama Peserta</th><th style="width:34mm">Instansi / Perusahaan</th><th>Absen Pagi</th><th>Absen Siang</th></tr></thead><tbody>${tr}</tbody></table>`, "pg-sf");
        nSf++;
      });
    });
  }
  sec.sf = html; html = "";
  if (L.nilai) {
    const rows = lpPeserta.filter(p => !p.batal);
    const tbl = (c, st) => `<table class="lap nl">${colg([10, 46, 64, 35, 35])}<thead><tr><th>NO</th><th>NAMA</th><th>INSTANSI</th><th>NILAI UJIAN TEORI</th><th>NILAI UJIAN PRAKTEK</th></tr></thead><tbody>${c.map((p, k) => `<tr><td class="c">${st + k + 1}</td><td>${up(p.nama)}</td><td>${up(p.instansi)}</td><td class="c">${esc(p.ut)}</td><td class="c">${esc(p.up)}</td></tr>`).join("") || empty(5)}</tbody></table>`;
    const sg = s => `<div class="lp-sg"><div class="jab">${esc(s.jab || "").replace(/\n/g, "<br>")}</div><div class="sp">${s.ttd ? `<img src="${s.ttd}" alt="">` : ""}</div><div class="nm">${esc(s.nama || "") || "&nbsp;"}</div>${s.nip ? `<div class="nip">NIP. ${esc(s.nip)}</div>` : ""}</div>`;
    const head = pi => pi ? `<div class="lp-h">DAFTAR NILAI PESERTA <small>(lanjutan)</small></div><div class="lp-gap"></div>`
      : `<div class="lp-h">DAFTAR NILAI PESERTA</div><div class="lp-h">${esc(LT.keg) || "&nbsp;"}</div><div class="lp-h s3">TANGGAL : ${esc(LT.tgl1)}</div><div class="lp-gap"></div>`;
    const bodyN = (c, pi, st, tail) => head(pi) + tbl(c, st) + (tail ? `<div class="lp-dt">${esc(LT.ttd) || "&nbsp;"}</div><div class="lp-sgs">${sg(L.s1)}${sg(L.s2)}</div>` : "");
    const chs = lapChunk(rows, bodyN); let n0 = 0;
    chs.forEach((c, pi) => { html += page(bodyN(c, pi, n0, pi === chs.length - 1), "pg-lap pg-nl"); n0 += c.length; });
    nNl = chs.length;
  }
  sec.nl = html; html = "";
  if (L.hasil) {
    const ket = p => p.batal ? ["CANCEL", 1] : p.hasil === "tidak" ? ["TIDAK LULUS", 1] : p.hasil === "lulus" ? ["LULUS", 0] : ["", 0];
    const tbl = (c, st) => `<table class="lap">${colg([10.5, 64, 89, 26.5])}<thead><tr><th>NO</th><th>NAMA</th><th>INSTANSI</th><th>KETERANGAN</th></tr></thead><tbody>${c.map((p, k) => { const [t, red] = ket(p); return `<tr${red ? ' class="merah"' : ""}><td class="c">${st + k + 1}</td><td>${up(p.nama)}</td><td class="c">${up(p.instansi)}</td><td class="k">${t}</td></tr>`; }).join("") || empty(4)}</tbody></table>`;
    const tail = `<div class="lp-pn"><div class="e"><i>E.</i>PENUTUP</div><div class="t">Demikian Laporan ini kami sampaikan dengan data yang sebenar benarnya</div></div><div class="lp-dir"><div>HORMAT KAMI,</div><div>LINTAS PENGEMBANGAN MANAJEMEN INDONESIA</div><img src="${LAP_QR}" alt=""><div class="n">CHRISTIEN CHANDRA PANCA</div><div>DIREKTUR UTAMA</div></div>`;
    const head = pi => `<div class="lp-h">DAFTAR NAMA PESERTA ${esc(LT.keg)}${pi ? " <small>(lanjutan)</small>" : ""}</div>${pi ? "" : `<div class="lp-h">${esc((LT.batch ? `(BATCH ${LT.batch}) ` : "") + LT.rentang)}</div>`}<div class="lp-gap"></div>`;
    const bodyL = (c, pi, st, t) => head(pi) + tbl(c, st) + (t ? tail : "");
    const chs = lapChunk(lpPeserta, bodyL); let n0 = 0;
    chs.forEach((c, pi) => { html += page(bodyL(c, pi, n0, pi === chs.length - 1), "pg-lap pg-ln"); n0 += c.length; });
    nLn = chs.length;
  }
  sec.ln = html; html = "";
  if (L.harian) {
    LT.days.forEach(({ iso, title }) => {
      const h = L.hari[iso] || { materi: "", fotos: [] }, fs = h.fotos || [], np = Math.max(1, Math.ceil(fs.length / 2));
      for (let pg = 0; pg < np; pg++) {
        const slot = k => { const u = fs[pg * 2 + k]; return `<div class="lp-fo">${u ? `<img src="${u}" alt="">` : (!fs.length ? `<div class="none">${CAM}<span>Belum ada foto</span></div>` : "")}</div>`; };
        html += page(`<div class="lp-h">DOKUMENTASI ${esc(LT.keg)}</div><div class="lp-h">${esc(LT.rentang)}${LT.batch ? ` (BATCH ${esc(LT.batch)})` : ""}</div><div class="lp-gap"></div><div class="lp-h d">${esc(title)}</div><div class="lp-h d">MATERI${h.materi ? "&nbsp; " + up(h.materi) : ""}</div><div class="lp-gap"></div>${slot(0)}${slot(1)}`, "pg-lap pg-dy");
        nDy++;
      }
    });
  }
  sec.dy = html; html = "";
  if (L.nara) { // Absensi Narasumber: satu baris per hari kegiatan
    const WN = [27, 50, 31, 52, 30], hrNama = d => new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(d);
    const bul = t => String(t || "").split("\n").map(x => x.trim()).filter(Boolean).map(x => `<div class="bl"><i>↓</i><span>${esc(x)}</span></div>`).join("");
    const rowN = key => {
      const iso = nrIso(key), first = key === iso, r = nrEf((L.nr || {})[key]), d = toD(iso), nip = (r.kid && r.kid !== "_m") || r.nip ? `<div class="nip">NIP : ${esc(r.nip)}</div>` : "";
      return `<tr><td class="c">${first ? `${esc(hrNama(d))}<br>${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : ""}</td><td><div>${esc(r.nama)}</div>${nip}</td><td class="c">${esc(r.inst)}</td><td class="mt">${bul(r.mtxt)}</td><td class="c sg">${r.ttd ? `<img src="${r.ttd}" alt="">` : ""}</td></tr>`;
    };
    const tblN = c => `<table class="lap nr">${colg(WN)}<thead><tr><th>Hari / Tanggal</th><th>Narasumber</th><th>Instansi</th><th>Materi</th><th>Tanda Tangan</th></tr></thead><tbody>${c.map(rowN).join("") || empty(5)}</tbody></table>`;
    const headN = pi => `<div class="lp-h">ABSENSI NARASUMBER${pi ? " <small>(lanjutan)</small>" : ""}</div>${pi ? "" : `<div class="lp-h">${esc(LT.keg) || "&nbsp;"}</div><div class="lp-h s3">TANGGAL : ${esc(LT.rentang)}${LT.batch ? ` (BATCH ${esc(LT.batch)})` : ""}</div>`}<div class="lp-gap"></div>`;
    const bodyR = (c, pi, st, tail) => headN(pi) + tblN(c) + (tail ? sign : "");
    const chs = lapChunk(nrCetak(L, LT.days.map(x => x.iso).filter(i => !L.nrHari || L.nrHari.includes(i))), bodyR);
    chs.forEach((c, pi) => { html += page(bodyR(c, pi, 0, pi === chs.length - 1), "pg-lap pg-nr"); });
    nNr = chs.length;
  }
  sec.nr = html; html = "";
  if (rdOn(S)) { // Rundown: halaman pertama
    const WR = [17, 24, 64, 8, 22, 55], [t1, t2] = rdTitle(S), RD = rdBuild(S);
    const nsHtml = r => r.pj ? `<td class="c">PJK3</td>` : r.ns && r.ns.start ? `<td class="c" rowspan="${r.ns.span}"><b><u>${esc(r.ns.r.nama)}</u></b>${rdRole(r.ns.r.inst, r.ns.r.nama) ? `<br>${esc(rdRole(r.ns.r.inst, r.ns.r.nama))}` : ""}</td>` : r.ns && r.ns.skip ? "" : `<td></td>`;
    const dayHtml = d => `<tr><td class="c hr" rowspan="${d.rows.length + 1}"><b>Hari<br>Ke – ${d.i + 1}</b></td><td class="c"><b><i>${rdTgl(d.iso)}</i></b></td><td></td><td></td><td></td><td></td></tr>`
      + d.rows.map(r => { const g = r.k === "br" || r.k === "iso" ? " gy" : ""; return `<tr><td class="c${g}">${r.w}</td><td class="${g.trim()}">${rdLines(r).map(esc).join("<br>")}</td><td></td><td class="c"><b>${esc(r.app)}</b></td>${nsHtml(r)}</tr>`; }).join("");
    const headRd = pi => `<div class="lp-h">${esc(t1)}${pi ? " <small>(lanjutan)</small>" : ""}</div><div class="lp-h s3">${esc(t2)}</div><div class="lp-gap"></div>`;
    const bodyRd = c => headRd(c._pi || 0) + `<table class="lap rd">${colg(WR)}<thead><tr><th>HARI</th><th>WAKTU</th><th>MATERI &amp; PEMBINAAN</th><th></th><th>APLIKASI</th><th>NARSUM</th></tr></thead><tbody>${c.map(dayHtml).join(`<tr class="sep"><td colspan="6"></td></tr>`)}</tbody></table>`;
    const chs = lapChunk(RD, (c, pi, st, tail) => { c._pi = pi; return bodyRd(c); });
    chs.forEach((c, pi) => { c._pi = pi; html += page(bodyRd(c), "pg-lap pg-rd"); });
    nRd = chs.length;
  }
  sec.rd = html; html = "";
  html = (sec.rd || "") + (sec.dh || "") + (sec.sf || "") + (sec.nl || "") + (sec.nr || "") + (sec.dy || "") + (sec.dk || "") + (sec.ln || ""); // urutan laporan: Daftar Hadir, Daftar Nilai, Absensi Narasumber, Dok. Harian, Dok. Peserta, Lulus/Tidak Lulus
  meas.innerHTML = "";
  return { html, nd: ch.length, nk: dch.length, noFoto: dk.filter(p => !p.batal && !fotoOk(p, dkOn)).length, nPes: dk.length, nNl, nLn, nDy, nNr, nRd, nSf };
}
const fotoOk = (p, dk) => !!p.foto && (!dk || !!p.foto2);
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
function lastDay(a) { const d = hariList(a); return d[d.length - 1] || ""; }
function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + ":" + str.length; }
const LAP_QR = "data:image/png;base64,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";
window.Wrd = { CSS, renderSet, kelasGroups, rdOn, kelasKey, hariList, fotoDua, isB3, jenisOf, hariTanggal, waktu, lapTexts, nrKeys, nrOff, nrEf, naraNew, NR_KEY };
})();
