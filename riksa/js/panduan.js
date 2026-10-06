/* ===== Petunjuk pengisian (Riksa Uji) =====
   Teks "cara mengisi / cara memeriksa / cara menghitung" untuk setiap kolom & butir pemeriksaan, agar asisten pemeriksa
   tahu apa yang harus dilakukan. Semua teks ada di berkas ini; app.js hanya memanggil PD.* saat menggambar formulir.
   Bisa disembunyikan lewat tombol "Petunjuk" di pojok kanan atas (disimpan di perangkat). */
const PD = (() => {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const how = (t) => t ? `<small class="how">${esc(t)}</small>` : '';

  /* ---------- kolom tunggal: kunci = data-path atau id elemen ---------- */
  const FIELD = {
    // laporan APAR
    'apar.meta.nomor': 'Nomor surat laporan sesuai penomoran PJK3: nomor urut / LHP-APAR / bulan (angka Romawi) / tahun, mis. 017/LHP-APAR/IX/2026.',
    'apar.meta.periode': 'Jenis periode pemeriksaan, mis. "Pemeriksaan Berkala Semester II Tahun 2026".',
    'apar.meta.tglMulai': 'Hari pertama petugas memeriksa di lokasi perusahaan (bukan tanggal laporan).',
    'apar.meta.tglSelesai': 'Hari terakhir petugas memeriksa di lokasi. Bila hanya sehari, samakan dengan tanggal mulai.',
    'apar.meta.tglLaporan': 'Tanggal laporan diterbitkan/ditandatangani. Harus sama atau setelah tanggal selesai riksa.',
    'apar.meta.kota': 'Kota tempat laporan diterbitkan (biasanya kota kantor PJK3). Tampil di bagian pengesahan.',
    'apar.meta.jenis': 'Pilih sesuai pemeriksaan hari ini: berkala 12 bulan (sudah termasuk pemeriksaan 6 bulan), berkala 6 bulan, atau pemeriksaan pertama untuk APAR baru dipasang.',
    'apar.meta.sebelumnya': 'Tulis nomor dan tanggal laporan riksa uji sebelumnya, mis. "012/LHP-APAR/III/2026, 20 Maret 2026". Tulis "Pertama kali" bila belum pernah diriksa uji.',
    'apar.keteranganTabel': 'Catatan umum di bawah tabel 4.1, mis. jumlah APAR yang tidak ditemukan atau tidak diperiksa beserta alasannya, atau kondisi khusus area. Boleh dikosongkan.',
    // laporan hidran
    'hyd.meta.nomor': 'Nomor surat laporan sesuai penomoran PJK3: nomor urut / LHP-HYD / bulan (angka Romawi) / tahun, mis. 018/LHP-HYD/IX/2026.',
    'hyd.meta.periode': 'Jenis periode pemeriksaan, mis. "Riksa Uji Berkala Tahun 2026".',
    'hyd.meta.tglMulai': 'Hari pertama petugas memeriksa di lokasi perusahaan (bukan tanggal laporan).',
    'hyd.meta.tglSelesai': 'Hari terakhir petugas memeriksa di lokasi. Bila hanya sehari, samakan dengan tanggal mulai.',
    'hyd.meta.tglLaporan': 'Tanggal laporan diterbitkan/ditandatangani. Harus sama atau setelah tanggal selesai riksa.',
    'hyd.meta.kota': 'Kota tempat laporan diterbitkan (biasanya kota kantor PJK3).',
    'hyd.meta.jenis': 'Tulis "Riksa uji berkala" untuk pemeriksaan rutin, atau "Riksa uji pertama" untuk instalasi yang baru dipasang. Boleh ditambah keterangan, mis. "(instalasi terpasang sejak 2019)".',
    'hyd.meta.sebelumnya': 'Tulis nomor dan tanggal laporan riksa uji sebelumnya. Tulis "Pertama kali" bila belum pernah diriksa uji.',
    'hyd.meta.petugas': 'Nama karyawan perusahaan yang mendampingi riksa uji hidran. Kosongkan bila sama dengan petugas pendamping di data perusahaan.',
    'hyd.teknis.kontraktor': 'Nama perusahaan pemasang instalasi dan tahun pemasangannya. Lihat dokumen pengesahan atau gambar as built, mis. "PT Contoh Instalindo / 2019".',
    'hyd.teknis.pengesahan': 'Nomor dan tanggal surat pengesahan/pemeriksaan instalasi yang terakhir beserta masa berlakunya. Didapat dari pemeriksaan dokumen (butir 4.1).',
    'hyd.teknis.klasifikasi': 'Tingkat bahaya kebakaran tempat kerja: ringan, sedang atau berat (acuan KEP.186/MEN/1999). Tanyakan atau lihat dokumen pengesahan, mis. "Bahaya kebakaran sedang".',
    'hyd.teknis.sumberAir': 'Asal air dan jenis penampungannya, dilihat langsung di lokasi, mis. "Ground reservoir beton 150 m³, diisi dari PDAM dan sumur dalam".',
    'hyd.teknis.pipa': 'Bahan, ukuran dan warna jaringan pipa. Lihat gambar as built lalu cocokkan di lapangan, mis. "Pipa baja SCH 40, ring main 6″, cabang 4″ dan 2,5″, dicat merah".',
    'hyd.teknis.specGedung': 'Perlengkapan satu kotak hidran gedung (lihat isi kotak): ukuran katup, panjang/ukuran selang, nozzle. Mis. "Katup 1,5″, selang 1,5″ × 30 m, nozzle".',
    'hyd.teknis.specHalaman': 'Perlengkapan hidran halaman (pilar): ukuran kopling, selang dan nozzle dalam hose cabinet. Mis. "Kopling 2,5″, selang 2,5″ × 30 m × 2, nozzle, kunci pilar".',
    'hyd.teknis.jumlahSiamese': 'Hitung sambungan Damkar (siamese connection) di luar bangunan yang dipakai mobil pemadam untuk memasok air ke jaringan. Isi angka saja.',
    'hyd.teknis.specSiamese': 'Ukuran dan jumlah inlet pada sambungan Damkar, mis. "2 × 2,5″ dengan tutup dan check valve".',
    'hyd.teknis.reservoirM3': 'Volume air EFEKTIF (yang benar-benar bisa dipompa), bukan volume bak penuh. Hitung: panjang × lebar × tinggi air efektif (m). Tinggi efektif = muka air normal dikurangi bagian di bawah lubang hisap pompa. Contoh 10 × 5 × 3 = 150 m³.',
    'hyd.teknis.debitLpm': 'Kapasitas pompa utama dalam liter/menit (nameplate atau dokumen). Dari US GPM: 1 US GPM = 3,785 L/menit, mis. 500 US GPM × 3,785 = 1.893 L/menit. Nilai ini dipakai menghitung lama persediaan air (butir 4.7).',
    'hyd.teknis.debitLabel': 'Tulisan kapasitas yang muncul di laporan, mis. "500 US GPM".',
    'hyd.ujiPompaNote': 'Tulis hal penting saat uji pompa: debit pada flow meter saat pompa utama berjalan (L/menit; bandingkan dengan kapasitas rancangan di atas), hasil start manual, suara/getaran tidak wajar, pompa yang tidak bisa diuji beserta alasannya.',
    // PJK3
    'shared.pjk3.nama': 'Nama lengkap perusahaan PJK3 pelaksana, mis. "PT ...". Tampil di sampul dan kop.',
    'shared.pjk3.sk': 'Nomor dan tanggal SK penunjukan PJK3 dari Kemnaker sesuai dokumen resmi.',
    'shared.pjk3.alamat': 'Alamat kantor PJK3 lengkap untuk kop/halaman pengesahan.',
    'shared.pjk3.telp': 'Nomor telepon kantor PJK3 yang bisa dihubungi.',
    'shared.pjk3.email': 'Alamat email resmi PJK3.',
    'shared.pjk3.ahli': 'Nama Ahli K3 Spesialis Penanggulangan Kebakaran yang menandatangani laporan, lengkap dengan gelar.',
    'shared.pjk3.lisensi': 'Nomor lisensi/SKP Ahli K3 sesuai kartu atau sertifikatnya.',
    'shared.pjk3.teknisi': 'Nama teknisi yang mendampingi ahli K3 saat pemeriksaan.',
    'shared.pjk3.direktur': 'Nama direktur PJK3 yang menyetujui laporan.',
    // perusahaan pemilik
    'shared.klien.nama': 'Nama perusahaan yang diriksa uji, sesuai surat permintaan atau dokumen perusahaan.',
    'shared.klien.bidang': 'Bidang usaha singkat, mis. "Industri makanan", "Pergudangan".',
    'shared.klien.alamat': 'Alamat lengkap lokasi yang diriksa uji (jalan, kelurahan, kecamatan, kota).',
    'shared.klien.alamatSingkat': 'Lokasi pendek untuk sampul, mis. "Kawasan Industri Makassar (KIMA)".',
    'shared.klien.cakupanArea': 'Area atau bangunan yang dicakup pemeriksaan APAR, mis. "Gedung kantor, pabrik, gudang dan area parkir". Tulis juga area yang TIDAK diperiksa bila ada.',
    'shared.klien.pengurus': 'Nama pimpinan / penanggung jawab K3 perusahaan yang menerima dan menyetujui hasil.',
    'shared.klien.jabatanPengurus': 'Jabatan pengurus di atas, mis. "Manajer HSE", "Direktur".',
    'shared.klien.petugas': 'Nama karyawan perusahaan yang mendampingi petugas selama pemeriksaan.',
    'shared.klien.jumlahTK': 'Jumlah seluruh tenaga kerja di lokasi, isi angka saja (sesuai data perusahaan).',
    'shared.klien.klasifikasi': 'Tingkat potensi bahaya kebakaran (ringan / sedang / berat) dan golongan api dominan (A, B, C). Mis. "Sedang; dominan golongan A dan B".',
  };

  /* ---------- blok petunjuk di atas bagian tertentu (kunci = data-howblk di index.html) ---------- */
  const BLOCK = {
    'alat-apar': ['Cara mengisi peralatan uji',
      'Tulis hanya alat yang benar-benar dipakai saat riksa uji ini, satu baris per alat.',
      'Kolom 1 Nama peralatan: mis. Pressure gauge digital, Timbangan, Meteran, Stopwatch.',
      'Kolom 2 Spesifikasi: rentang ukur dan ketelitian dari badan alat, mis. "0 – 25 bar, akurasi ±0,5%".',
      'Kolom 3 No. sertifikat kalibrasi: salin dari sertifikat yang masih berlaku. Isi "–" bila alat tidak perlu kalibrasi (meteran, stopwatch, kamera).'],
    'alat-hyd': ['Cara mengisi peralatan uji',
      'Tulis hanya alat yang benar-benar dipakai saat riksa uji ini, satu baris per alat.',
      'Kolom 1 Nama peralatan: mis. Pitot gauge, Pressure gauge digital, Clamp meter, Insulation tester (megger), Stopwatch.',
      'Kolom 2 Spesifikasi: rentang ukur dan ketelitian dari badan alat, mis. "Pitot 0 – 10 kg/cm²".',
      'Kolom 3 No. sertifikat kalibrasi: salin dari sertifikat yang masih berlaku. Isi "–" bila alat tidak perlu kalibrasi (stopwatch, meteran, kamera).'],
    'pompa': ['Cara mengisi data pompa',
      'Salin dari pelat nama (nameplate) setiap pompa, satu baris per pompa (jockey, utama elektrik, cadangan diesel).',
      'Pompa: jenisnya. Merk / tipe: dari pelat nama pompa.',
      'Kapasitas: debit nominal, mis. "500 US GPM" atau "1.893 L/menit".',
      'Head / tekanan: mis. "80 m (8 kg/cm²)". Perkiraan: 10 m kolom air ≈ 1 kg/cm² ≈ 1 bar.',
      'Penggerak: motor listrik (tulis tegangan, mis. 380 V) atau mesin diesel.',
      'Daya / putaran: mis. "45 kW / 2.950 rpm". Catat juga arus beban penuh (FLA) motor dari pelat nama di catatan uji pompa; dibutuhkan di butir 4.4 listrik.'],
    'nilai': ['Cara menilai setiap butir (Memenuhi / Catatan / Tidak)',
      'Memenuhi: kondisi sesuai ketentuan.',
      'Catatan: ada kekurangan kecil atau administratif yang tidak mengganggu fungsi; perbaikan ≤ 30 hari.',
      'Tidak: kekurangan yang mengganggu fungsi atau keselamatan; perbaikan segera ≤ 7 hari.',
      'Untuk Catatan/Tidak, isi kolom Keterangan dengan fakta yang dilihat atau diukur (angka, kondisi, lokasi), lalu Rekomendasi dan Batas waktu. Kolom ini baru tampil setelah memilih Catatan/Tidak.'],
    'crow-dokumen': ['Cara mengisi bagian ini',
      'Minta dokumen ke petugas perusahaan, lihat isinya langsung, lalu nilai.',
      'Keterangan: tulis nomor/tanggal dokumen, masa berlaku, atau jumlah yang tersedia (bukan hanya "ada").'],
    'crow-rumah': ['Cara mengisi bagian ini',
      'Periksa langsung di rumah pompa dengan mata dan tangan. Jangan memutar/ mematikan apa pun yang belum diizinkan petugas.',
      'Keterangan: tulis kondisi yang dilihat atau angka bacaan (mis. BBM 55%, manometer tidak kembali ke nol). Boleh dikosongkan bila Memenuhi dan tidak ada hal khusus.'],
    'crow-ujiPompa': ['Cara mengisi uji fungsi pompa',
      'Dua orang: satu di manometer/panel pompa, satu di katup uji. Lakukan berurutan langkah 1 sampai 7 dan jangan melompati langkah.',
      'Tekanan terukur: angka yang TERBACA di manometer pada saat kejadian langkah itu, satuan kg/cm². Boleh dua angka, mis. "5,5 / 7,7". 1 bar ≈ 1,02 kg/cm²; 1 psi ≈ 0,07 kg/cm².',
      'Setting rancangan: nilai yang seharusnya, dari setelan pressure switch atau dokumen pompa. Bila terukur jauh berbeda dari setting, nilai Catatan/Tidak dan tulis temuan.',
      'Temuan / Rekomendasi / Batas waktu hanya tampil bila memilih Catatan atau Tidak.'],
    'crow-listrik': ['Cara mengisi instalasi listrik pompa',
      'Hasil ukur / temuan: tulis angka hasil ukur lengkap dengan satuan (V, A, MΩ, detik) atau "Ada / Tidak ada".',
      'Kriteria: batas yang harus dipenuhi (sudah terisi dari standar). Ubah bila angka batas motor ini berbeda.',
      'Cara menghitung batas dari arus beban penuh (FLA, dibaca di pelat nama motor): batas 125% = 1,25 × FLA; titik 600% = 6 × FLA. Contoh FLA 84 A: 1,25 × 84 = 105 A dan 6 × 84 = 504 A.',
      'Tegangan: 380 V ± 10% berarti 342 – 418 V.',
      'KESELAMATAN: pengukuran dalam panel hanya oleh teknisi berwenang dengan APD; tahanan isolasi hanya setelah sumber dimatikan dan dikunci (lock out).'],
    'crow-siamese': ['Cara mengisi bagian ini',
      'Periksa dari luar bangunan, dari posisi mobil pemadam. Keterangan: tulis lokasi sambungan Damkar dan kondisi yang dilihat.'],
    'uji3': ['Cara melakukan dan mengisi uji 3 titik',
      'Siapkan di tiap titik: selang + nozzle terpasang, pitot gauge, dan satu orang di pompa untuk membaca manometer. Pompa utama berjalan (dari uji pompa).',
      'Urutan: buka titik terdekat → baca → titik sebelumnya TETAP terbuka, buka titik terjauh → baca → buka titik tengah → baca. Setiap pembacaan dilakukan bersamaan di titik dan di manometer pompa.',
      'Cara baca pitot: arahkan ujung pitot ke tengah pancaran air, sekitar setengah diameter nozzle dari ujung nozzle, tunggu jarum stabil.',
      'Kode titik: kode hidran yang diuji (sama dengan kode di tab Titik Hidran). Lokasi: nama area titik tersebut.',
      'Pitot nozzle: angka pitot gauge saat air mengalir (kg/cm²). Manometer pompa: angka manometer sisi tekan pompa pada saat yang sama (kg/cm²).',
      'Kriteria penilaian (otomatis): angka tidak boleh lebih dari 7 kg/cm²; pitot titik terjauh minimal 4,5 kg/cm².'],
    'air': ['Cara menghitung persediaan air (4.7)',
      'Lama air (menit) = volume efektif (m³) × 1.000 ÷ laju aliran rancangan (L/menit). Memenuhi bila ≥ 30 menit.',
      'Contoh: 150 m³ × 1.000 ÷ 1.893 L/menit = ± 79 menit (memenuhi). Hitung berjalan otomatis setelah kedua angka diisi di tab Data Laporan.'],
    'gen-foto': ['Foto yang dibutuhkan',
      'Panel pompa (posisi AUTO), pelat nama pompa, manometer saat uji, pitot gauge saat uji, plang/label sambungan Damkar, dan temuan penting. Foto harus jelas dan terbaca.'],
    'apar-foto': ['Cara foto dokumentasi',
      'Satu foto utuh APAR dari depan (tabung, tanda pemasangan dan lokasi terlihat) dan satu foto dekat label/manometer. Untuk setiap butir ✗ tambah foto dekat kerusakannya (karat, segel putus, selang retak).'],
    'denah-apar': ['Cara mengisi denah',
      'Foto atau pindai denah lantai/area yang sudah ditandai posisi APAR dan diberi nomor sama dengan kode unit (APAR-01, dst.). Pastikan nomor terbaca.'],
    'denah-hyd': ['Cara mengisi gambar instalasi',
      'Foto atau pindai gambar as built/skema jaringan hidran yang menandai rumah pompa, reservoir, titik hidran bernomor sesuai kode, dan sambungan Damkar.'],
    'hyd-foto': ['Cara foto dokumentasi',
      'Satu foto utuh kotak/pilar hidran dari depan (kode dan lokasi terlihat). Untuk setiap butir \u2717 tambah foto dekat kerusakannya (selang bocor, kopling berkarat, tutup hilang, akses terhalang).'],
    'ck-apar': ['Cara mengisi checklist 15 butir',
      '\u2713 = memenuhi, \u2717 = tidak memenuhi, \u2013 = tidak berlaku. Periksa tiap butir langsung di tabung lalu tekan tombolnya; baca petunjuk abu-abu di bawah tiap butir.',
      'Tombol "Semua \u2713" mengisi semua butir sebagai memenuhi; pakai untuk unit yang kondisinya baik lalu ubah butir yang \u2717 saja.',
      'Status unit tampil otomatis di kanan atas: \u2717 pada butir fungsi (tabung, tekanan, pin, tuas, selang, tepung, uji tekan) \u2192 Tidak Layak; \u2717 pada butir lain \u2192 Layak dengan catatan.'],
    'ck-hyd': ['Cara mengisi checklist',
      '\u2713 = memenuhi, \u2717 = tidak memenuhi. Periksa tiap butir langsung di titik hidran lalu tekan tombolnya; baca petunjuk abu-abu di bawah tiap butir.',
      'Tombol "Semua \u2713" mengisi semua butir sebagai memenuhi; pakai untuk titik yang kondisinya baik lalu ubah butir yang \u2717 saja.',
      'Penilaian titik otomatis: \u2717 pada butir fungsi (gedung: katup, selang, kopling, nozzle; halaman: pilar, katup, hose cabinet) \u2192 Tidak memenuhi; \u2717 pada butir lain \u2192 Catatan.'],
    'kesimpulan': ['Cara memakai halaman ini',
      'Kesimpulan dan temuan disusun otomatis dari penilaian yang sudah diisi. Tidak perlu diketik; bila ada yang janggal, kembali ke unit/butir terkait dan perbaiki penilaiannya.'],
    'unit-apar': ['Cara memakai daftar unit',
      'Satu kartu = satu tabung APAR. Tekan "+ Tambah APAR", isi identitas, foto, lalu centang checklist 15 butir. Kode, media dan kapasitas unit sebelumnya otomatis disalin agar pengisian cepat; periksa kembali sebelum lanjut.'],
    'unit-hyd': ['Cara memakai daftar titik',
      'Satu kartu = satu titik hidran. Gunakan "+ Hidran gedung" untuk kotak hidran di dalam bangunan, "+ Hidran halaman" untuk pilar di luar bangunan. Isi identitas, foto, lalu checklist.'],
  };

  /* ---------- editor unit APAR & titik hidran: kunci = data-u / data-h / id ---------- */
  const EDITOR = {
    kode: 'Nomor urut unik, mis. APAR-01 atau H-01 / HP-01. Samakan dengan nomor di denah/gambar instalasi dan stiker unit. Terisi otomatis berurutan.',
    lokasi: 'Nama ruang/area + patokan supaya mudah ditemukan lagi, mis. "Gudang Bahan Baku A, dekat pintu utara, tiang C3". Wajib diisi.',
    media: 'Pilih sesuai label di badan tabung (Powder ABC, CO₂, Foam AFFF, dst.). Selain Powder, butir 13 (tepung menggumpal) otomatis "–".',
    kap: 'Isi dari label tabung lengkap dengan satuan, mis. "6 kg" (powder/CO₂) atau "9 L" (air/foam).',
    merk: 'Merek pabrik dari label atau badan tabung. Kosongkan bila tidak terbaca.',
    thn: 'Tahun produksi 4 angka, tercetak/di-stamp pada leher, dasar tabung atau label. Dipakai menghitung umur untuk batas uji tekan 5 tahun (butir 15).',
    isiUlang: 'Bulan/tahun isi ulang terakhir dari tag atau stiker servis, format BB/TTTT, mis. 03/2026. Kosongkan bila tidak ada catatan.',
    bacaan: 'Tulis hasil baca saat ini. APAR bertekanan: posisi jarum manometer, mis. "14 bar (hijau)". CO₂ tanpa manometer: berat hasil timbang, mis. "13,3 kg (penuh 14,0 kg)". Dipakai untuk butir 8.',
    jenis: 'Hidran gedung = kotak hidran berselang 1,5″ di dalam bangunan. Hidran halaman = pilar hidran 2,5″ di luar bangunan. Mengganti jenis mengatur ulang checklist.',
    statusOverride_apar: 'Biarkan "Otomatis dari checklist" kecuali ada alasan khusus. Aturan otomatis: ✗ pada butir fungsi (7, 8, 9, 10, 12, 13, 15) → Tidak Layak; ✗ pada butir lain (penempatan/administrasi) → Layak dengan catatan; semua ✓ atau – → Layak.',
    statusOverride_hyd: 'Biarkan "Otomatis dari checklist" kecuali ada alasan khusus. Aturan otomatis: ✗ pada butir fungsi (gedung butir 3–6; halaman butir 1, 2, 4) → Tidak memenuhi; ✗ pada butir lain → Catatan; semua ✓ → Memenuhi.',
    batas: 'Jangka waktu perbaikan yang diminta. Kosong = otomatis: berat (Tidak Layak / Tidak) ≤ 7 hari, ringan (dengan catatan) ≤ 30 hari.',
    temuan: 'Tulis kekurangan yang ditemukan secara spesifik: butir apa dan kondisinya apa. Kosong = disusun otomatis dari butir ✗ (contoh tampil abu-abu di dalam kolom).',
    rekomendasi: 'Tindakan perbaikan yang diminta, mis. "Isi ulang dan ganti segel" atau "Bebaskan area 1 m di depan kotak hidran". Kosong = rekomendasi otomatis.',
    'h-done': 'Centang bila pada riksa uji ini tabung benar-benar diuji tekan (bukan hanya dicek umurnya). Tabung yang lebih dari 5 tahun wajib diuji.',
    kerja: 'Tekanan kerja normal dari label tabung, mis. "14 bar".',
    coba: 'Tekanan uji = 1,5 × tekanan kerja. Contoh 14 bar × 1,5 = 21 bar. Atau ikuti ketentuan pabrik.',
    durasi: 'Lama tekanan coba ditahan tanpa turun, mis. "30 detik" (ikuti prosedur alat uji).',
    bocor: 'Amati badan, sambungan dan katup selama tekanan ditahan. Tulis "Tidak ada" atau letak kebocoran. Jarum tekanan tidak boleh turun.',
    deformasi: 'Setelah tekanan dilepas, periksa tabung menggembung atau berubah bentuk permanen. Tulis "Tidak ada" atau uraiannya.',
    hasil: 'Lulus bila tidak bocor dan tidak ada deformasi permanen. Selain itu pilih Gagal (tabung tidak boleh dipakai lagi).',
  };

  /* ---------- butir checklist APAR (urut sama dengan RU.ITEMS) ---------- */
  const APAR = [
    'Berdiri 5–10 m dari APAR: tabung harus langsung terlihat, tidak tertutup palet, mesin, pintu atau tiang, dan bisa diambil dalam beberapa langkah. ✓ bila terlihat dan terjangkau; ✗ bila tersembunyi atau terhalang.',
    'Cari rambu/tanda APAR (segitiga merah) tepat di atas APAR. Ukur dengan meteran dari lantai ke tanda: harus ± 125 cm. ✗ bila tanda tidak ada atau tingginya jelas berbeda.',
    'Ukur jarak jalan kaki (bukan garis lurus) ke APAR terdekat berikutnya dengan meteran atau laser distance meter. ✓ bila ≤ 15 m; ✗ bila lebih (area kurang terlindungi).',
    'Baca golongan/media di label lalu cocokkan dengan bahaya di sekitarnya: A (kayu, kertas, kain) → air/foam/powder ABC; B (cairan & gas mudah terbakar) → foam/powder/CO₂; C (peralatan listrik hidup) → powder/CO₂, JANGAN air atau foam. ✗ bila tidak cocok, mis. APAR air di dekat panel listrik.',
    'Coba angkat APAR dari gantungan atau box dengan tangan saja. ✓ bila bisa diambil tanpa kunci atau alat; ✗ bila digembok, diikat kawat/tali mati, atau box tertutup tanpa cara buka cepat.',
    'Ukur dari lantai ke puncak (bagian paling atas) tabung dengan meteran: ± 1,2 m (toleransi beberapa cm). Dasar tabung sebaiknya tidak menempel lantai agar tidak berkarat. ✗ bila jelas terlalu tinggi atau terlalu rendah.',
    'Putar dan periksa seluruh badan tabung, terutama dasar, sambungan las dan leher: cari karat mengelupas/berlubang, penyok, goresan dalam, cat melepuh. Karat tipis di permukaan masih ✓ (catat di temuan); karat tebal, lubang atau penyok dalam ✗.',
    'APAR bertekanan (powder, foam, air, clean agent): lihat jarum manometer, harus di zona HIJAU; di zona merah atau di nol ✗. APAR CO₂ (tanpa manometer): timbang tabung. Susut (%) = (berat penuh pada label − berat timbang) ÷ berat isi CO₂ × 100; ✗ bila ≥ 10%. Contoh isi 5 kg, penuh 14,0 kg, ditimbang 13,3 kg: 0,7 ÷ 5 × 100 = 14% ✗. Tulis hasilnya di kolom "Tekanan / berat isi".',
    'Pin pengaman harus terpasang di tuas dan segel (plastik/kawat) tidak putus. Segel putus atau pin hilang berarti APAR mungkin pernah dipakai atau diutak-atik: ✗, lalu periksa tekanan/berat dan isi ulang.',
    'Gerakkan tuas dengan tangan, pin tetap terpasang dan JANGAN disemprotkan: harus lancar, tidak patah, macet atau berkarat. Label/stiker pada tabung masih menempel dan terbaca.',
    'Baca label petunjuk di badan tabung (tarik pin → arahkan nozzle ke pangkal api → tekan tuas → sapukan). ✓ bila tulisan/gambar jelas dan menghadap keluar; ✗ bila pudar, terhapus, atau menghadap dinding.',
    'Tekuk selang perlahan dari ujung ke ujung: tidak ada retak, getas, sobek atau bocor. Lihat lubang nozzle/horn dengan senter: tidak tersumbat debu, cat atau sarang serangga. ✗ bila rusak atau tersumbat.',
    'HANYA untuk APAR powder. Balik tabung beberapa kali atau ketuk bagian bawah dengan telapak tangan, rasakan tepung bergerak bebas. ✗ bila terasa padat atau keras seperti batu. Untuk media lain pilih "–" (otomatis bila media bukan Powder).',
    'Cari kartu/tag pemeriksaan di tabung: harus ada tanggal pemeriksaan terakhir dan catatan isi ulang. ✓ bila tersedia dan terisi; ✗ bila tidak ada atau kosong.',
    'Cari tahun produksi atau tanggal uji tekan terakhir (di leher/dasar tabung atau label). Hitung: tahun ini − tahun produksi/uji terakhir. ✓ bila ≤ 5 tahun; ✗ bila lebih dari 5 tahun (wajib uji hidrostatik, isi bagian Percobaan tekan di bawah). Contoh: produksi 2019, sekarang 2026 → 7 tahun ✗.',
  ];

  /* ---------- butir checklist hidran ---------- */
  const HYD = {
    gedung: [
      'Lihat dari jarak ± 5 m: kotak mudah terlihat, bertanda "HIDRAN" yang terbaca. Buka pintu kotak dengan tangan: ✓ bila tidak terkunci (kotak kaca: ada palu/cara pecah cepat).',
      'Lihat ruang di depan kotak: tidak ada palet, rak, kendaraan atau barang lain, jalur ± 1 m bebas. ✗ bila terhalang.',
      'Putar katup 1,5″ perlahan sampai terbuka penuh lalu tutup lagi: tidak macet, tangkai dan sambungan tidak merembes. Pastikan arah nozzle aman sebelum membuka. ✗ bila macet atau bocor. (Butir fungsi: ✗ → Tidak memenuhi.)',
      'Gelar selang sampai habis dan ukur: panjang 30 m. Tekuk sepanjang selang: tidak retak, getas atau sobek. Kebocoran paling jelas saat selang berisi air (uji 3 titik). ✗ bila kurang panjang, getas atau bocor. (Butir fungsi.)',
      'Goyang kopling selang–katup dan selang–nozzle dengan tangan: harus kuat, tidak lepas. Lihat karet gasket di dalam kopling: ada dan tidak retak/aus. ✗ bila longgar atau gasket hilang/rusak. (Butir fungsi.)',
      'Pastikan nozzle ada. Putar pengatur semprotan (jet–kabut) atau tuasnya: bergerak lancar dan lubang tidak tersumbat. ✗ bila hilang, macet atau tersumbat. (Butir fungsi.)',
      'Lihat kotak: karat tembus, engsel patah, kaca pecah, kunci rusak, cat memudar. Karat ringan cukup dicatat di temuan; ✗ bila kerusakan nyata (hanya jadi Catatan).',
    ],
    halaman: [
      'Goyang pilar dengan tangan: harus kokoh, tidak bocor/merembes di badan atau dasar, cat merah masih jelas. ✗ bila goyah, bocor atau cat hilang. (Butir fungsi: ✗ → Tidak memenuhi.)',
      'Dengan kunci pilar, buka katup perlahan sampai penuh lalu tutup: mudah diputar, tidak macet, tangkai tidak bocor. (Butir fungsi.)',
      'Lihat kedua mulut kopling 2,5″: ulir tidak rusak atau berkarat, tutup kopling ada dan bisa dibuka-pasang, rantai tutup utuh. ✗ bila tutup hilang atau ulir rusak.',
      'Buka hose cabinet: harus ada 2 selang 2,5″ × 30 m, nozzle dan kunci pilar. ✗ bila ada yang kurang. (Butir fungsi.)',
      'Pastikan mobil pemadam bisa mendekat: jalan menuju pilar bebas dari parkir, pagar atau tanaman, dan ruang ± 1 m di sekeliling pilar kosong. ✗ bila terhalang.',
    ],
  };

  /* ---------- baris pemeriksaan (tab Pompa & Uji): kunci = bagian, indeks = urutan ---------- */
  const CROW = {
    dokumen: [
      'Minta surat pengesahan/suket instalasi terakhir. Catat nomor dan masa berlakunya di Keterangan. Catatan/Tidak bila kedaluwarsa atau tidak ada.',
      'Minta gambar as built, lalu cocokkan di lapangan: jumlah dan lokasi hidran, jalur pipa, rumah pompa. Tulis revisi/tahun gambar dan apakah sesuai kondisi lapangan.',
      'Minta katalog/kurva pompa. Tulis pompa mana saja yang katalognya tersedia (mis. "Tersedia untuk ketiga pompa").',
      'Lihat buku log uji jalan mingguan pompa (khususnya pompa diesel): terisi rutin dan terbaru? Tulis terakhir diisi kapan. Catatan bila ada minggu yang bolong.',
      'Bandingkan dengan laporan riksa uji sebelumnya: berapa syarat/temuan yang diminta dan berapa yang sudah dikerjakan. Tulis "x dari y syarat telah dilaksanakan".',
    ],
    rumah: [
      'Buka panel pompa: selector tiap pompa di posisi AUTO, lampu power menyala, tidak ada alarm. Catat bila ada pompa yang MANUAL atau OFF.',
      'Lihat ruangan: ventilasi dan penerangan berfungsi, lantai tidak tergenang (ada drainase), tidak ada barang gudang atau bahan mudah terbakar. Catatan/Tidak bila dipakai sebagai gudang.',
      'Periksa tiap pompa dan penggerak dengan mata dan tangan: tidak ada rembesan di seal/gland, baut kendor, getaran atau suara tidak wajar, karat berat.',
      'Lihat posisi tuas/handwheel katup di sisi hisap dan tekan: harus terbuka penuh dan ada kunci/segel/rantai yang menahannya tetap terbuka.',
      'Lihat manometer sisi hisap dan tekan: jarum kembali ke nol saat tidak bertekanan, kaca tidak buram/retak, ada stiker kalibrasi yang masih berlaku. Bandingkan bacaan dengan pressure gauge pembanding bila ada.',
      'Pastikan katup uji (test valve) ada, bisa dioperasikan, dan flow meter terpasang serta terbaca.',
      'Cari katup pengaman (relief valve) pada jalur tekan pompa: tidak macet, tidak bocor. Fungsinya diuji pada uji pompa langkah 6.',
      'Pompa diesel: periksa tegangan baterai dan charger menyala, level BBM (catat dalam % atau liter, sebaiknya ≥ ⅔ tangki), oli mesin, air radiator, serta knalpot tidak bocor.',
      'Reservoir: lihat indikator level atau ukur tinggi air, cek katup pengisi otomatis (float valve) bekerja dan tidak bocor. Kecukupan air dihitung di butir 4.7 (volume ÷ laju aliran).',
      'Susuri pipa yang terlihat: dicat merah, tidak bocor atau berkorosi parah, penyangga (hanger/support) kokoh, tidak ada sambungan menetes.',
    ],
    ujiPompa: [
      'Semua pompa AUTO dan tidak ada aliran: baca manometer jaringan. Catat di Tekanan terukur. Setting = tekanan normal jaringan (cut-out jockey) menurut rancangan.',
      'Buka katup uji sedikit sehingga tekanan turun perlahan. Catat tekanan pada saat pompa jockey mulai berjalan (suara motor).',
      'Tutup katup uji, tunggu jockey mengisi tekanan sampai berhenti sendiri. Catat tekanan saat jockey berhenti.',
      'Buka katup uji lebih lebar (melebihi kemampuan jockey) sampai pompa utama start otomatis. Catat tekanan saat pompa utama mulai berputar.',
      'Biarkan pompa utama berjalan ± 30 detik dengan katup uji terbuka. Catat tekanan sisi tekan saat sudah stabil dan bandingkan dengan Setting rancangan.',
      'Tutup katup uji sementara pompa utama tetap berjalan: tekanan naik. Catat tekanan saat relief valve membuka; tidak boleh melewati batas tekanan pipa/pompa.',
      'Matikan pompa utama (stop atau putus listrik) sambil katup uji terbuka: pompa cadangan diesel harus start. Tulis "tekanan start / tekanan operasi", mis. 5,5 / 7,7.',
    ],
    listrik: [
      'Telusuri dari panel utama (LVMDP): harus ada MCCB/sakelar khusus pompa kebakaran yang diberi label, bukan percabangan dari beban lain. Tulis asal sumber di Hasil ukur.',
      'Lihat jenis kabel (FRC/ tahan api) atau apakah dalam conduit/tray tertutup. Tulis jenis kabel yang terlihat.',
      'Periksa single line diagram dan panel: tidak ada beban lain (lampu, stop kontak, dll.) di rangkaian pompa. Tulis "Tidak ada" bila bersih.',
      'Baca arus beban penuh (FLA) motor di pelat nama, hitung 125% = 1,25 × FLA, lalu cocokkan dengan rating MCCB/pengaman. Pengaman harus ≥ hasil hitung agar tidak trip. Contoh FLA 84 A → 105 A, MCCB 125 A memenuhi.',
      'Hitung 600% = 6 × FLA (contoh 84 A → 504 A). Lihat kurva trip pabrikan pengaman pada titik tersebut: waktu buka harus 20 – 50 detik. Tulis waktu dari kurva.',
      'Periksa panel kontrol motor: tidak boleh ada overload relay (thermal relay) di antara pengaman dan motor. Tulis "Tidak ada" bila tidak ditemukan.',
      'Ukur dengan multimeter/clamp meter: tegangan antar fasa L1–L2, L2–L3, L3–L1. Tulis ketiga angka. Batas 380 V ± 10% = 342 – 418 V.',
      'Ukur arus tiap fasa dengan clamp meter saat pompa utama berjalan. Tulis arus tertinggi dan bandingkan dengan FLA di pelat nama (harus tidak melebihi).',
      'Matikan dan kunci sumber (lock out), lepas kabel motor, ukur dengan insulation tester (megger 500/1.000 V DC) antara tiap fasa dan bodi/ground. Tulis nilai terkecil dalam MΩ. Batas ≥ 1 MΩ.',
    ],
    siamese: [
      'Lihat dari jalan akses: inlet 2 × 2,5″ lengkap dengan tutup dan ulir baik, mudah dijangkau mobil pemadam, tidak terhalang kendaraan atau tanaman. Tulis lokasinya.',
      'Cari tanda panah arah aliran pada katup searah dan periksa tidak ada rembesan balik keluar dari inlet saat jaringan bertekanan. Nilai Memenuhi bila terpasang dan berfungsi.',
      'Cari plat/label "SAMBUNGAN DAMKAR" yang terlihat dari jalan akses. Catatan bila tidak ada atau tidak terbaca.',
    ],
  };

  /* ---------- FIRE ALARM ---------- */
  Object.assign(FIELD, {
    'fa.meta.nomor': 'Nomor surat laporan sesuai penomoran PJK3: nomor urut / LHP-FA / bulan (angka Romawi) / tahun, mis. 020/LHP-FA/X/2026.',
    'fa.meta.periode': 'Jenis periode pemeriksaan, mis. "Riksa Uji Berkala Tahun 2026".',
    'fa.meta.tglMulai': 'Hari pertama petugas memeriksa di lokasi perusahaan (bukan tanggal laporan).',
    'fa.meta.tglSelesai': 'Hari terakhir petugas memeriksa di lokasi. Bila hanya sehari, samakan dengan tanggal mulai.',
    'fa.meta.tglLaporan': 'Tanggal laporan diterbitkan/ditandatangani. Harus sama atau setelah tanggal selesai riksa.',
    'fa.meta.kota': 'Kota tempat laporan diterbitkan (biasanya kota kantor PJK3). Tampil di bagian pengesahan.',
    'fa.meta.jenis': 'Tulis jenis pemeriksaan hari ini: riksa uji pertama (instalasi baru/setelah modifikasi) atau riksa uji berkala, beserta tahun pemasangan bila diketahui.',
    'fa.meta.sebelumnya': 'Tulis nomor dan tanggal laporan riksa uji Fire Alarm sebelumnya, mis. "012/LHP-FA/IX/2025, 20 September 2025". Tulis "Pertama kali" bila belum pernah diriksa uji.',
    'fa.meta.petugas': 'Nama dan jabatan petugas perusahaan yang mendampingi pemeriksaan Fire Alarm. Kosongkan bila sama dengan petugas di data perusahaan.',
    'fa.teknis.kontraktor': 'Nama perusahaan pemasang dan tahun pemasangan, dari dokumen instalasi atau label panel, mis. "PT Contoh Proteksi / 2019".',
    'fa.teknis.pengesahan': 'Nomor dan tanggal Surat Keterangan/pengesahan instalasi alarm kebakaran dari instansi ketenagakerjaan, bila ada.',
    'fa.teknis.sistem': 'Konvensional = detektor dibagi per zona (panel hanya tahu zona yang menyala). Addressable = tiap detektor punya alamat sendiri (panel tahu detektor yang mana). Hybrid = gabungan.',
    'fa.teknis.klasifikasi': 'Klasifikasi bahaya kebakaran tempat kerja menurut KEP.186/MEN/1999 (ringan, sedang, atau berat). Tanyakan ke pengurus atau lihat dokumen unit penanggulangan kebakaran.',
    'fa.teknis.merkPanel': 'Salin dari label/pelat di panel: merk, tipe dan nomor seri. Foto labelnya sebagai dokumentasi.',
    'fa.teknis.jumlahZona': 'Hitung dari panel (jumlah lampu zona) atau gambar, mis. "8 zona" atau "2 loop, 120 alamat".',
    'fa.teknis.lokasiPanel': 'Tempat panel utama dipasang, mis. "Pos satpam, lobi utama". Idealnya di tempat yang dijaga atau dipantau 24 jam.',
    'fa.teknis.repeater': 'Tulis jumlah dan lokasi panel repeater/annunciator, mis. "Ada, 1 unit di ruang HSE", atau "Tidak ada".',
    'fa.teknis.sumberDaya': 'Ringkas sumber daya panel: tegangan AC utama, serta jenis, tegangan, kapasitas dan jumlah baterai cadangan, mis. "Utama 220 V AC; cadangan baterai 12 V / 7 Ah × 2".',
    'fa.teknis.pemantauan': 'Apakah sinyal alarm diteruskan ke pos pemantau luar, pemadam kebakaran atau layanan monitoring? Tulis tujuannya, atau "Tidak ada".',
    'fa.baterai.iSiaga': 'Arus seluruh sistem saat normal (panel + semua detektor), dalam ampere. Ambil dari spesifikasi pabrikan panel, atau ukur dengan clamp DC / multimeter seri baterai saat AC diputus dan tidak ada alarm. Gunakan titik desimal atau koma, mis. 0,35.',
    'fa.baterai.iAlarm': 'Arus seluruh sistem saat alarm penuh (semua bell, strobe dan indikator aktif), dalam ampere. Dari spesifikasi atau ukur saat tombol DRILL ditekan, mis. 1,8.',
    'fa.baterai.jamSiaga': 'Lama baterai harus sanggup menyuplai saat AC mati, dalam jam. Umumnya 24 jam; pakai nilai dari standar yang dipakai PJK3.',
    'fa.baterai.menitAlarm': 'Lama alarm yang harus tetap bunyi setelah masa siaga, dalam menit. Umumnya 5 menit; pakai nilai dari standar yang dipakai PJK3.',
    'fa.baterai.kapTerpasang': 'Kapasitas baterai terpasang dalam Ah dari label baterai. Dua baterai 12 V yang dihubung seri (jadi 24 V) tetap berkapasitas sama dengan satu baterai (mis. 7 Ah); bila dihubung paralel kapasitasnya dijumlahkan.',
    'fa.ujiNote': 'Tulis waktu respons yang terukur dan hal penting lain saat uji simulasi, mis. "Detektor asap rata-rata 14 detik, detektor panas 25 detik; batas pabrikan 60 detik".',
  });
  Object.assign(EDITOR, {
    fjenis: 'Pilih sesuai jenis detektor di zona ini (lihat badan detektor atau gambar). Bila satu zona berisi dua jenis, buat dua baris zona dengan kode berurutan, mis. Z-05 dan Z-05B.',
    terpasang: 'Hitung semua detektor jenis ini di zona, ruang demi ruang termasuk ruang plafon, lalu cocokkan dengan gambar. Tulis angka saja.',
    diuji: 'Jumlah detektor yang benar-benar diuji dengan pemicu hari ini. Idealnya sama dengan jumlah terpasang. Bila lebih sedikit, zona dinilai Catatan.',
    berfungsi: 'Dari yang diuji, hitung yang membunyikan alarm di panel pada zona yang benar. Tidak boleh lebih besar dari jumlah diuji. Selisihnya adalah detektor rusak (catat nomor atau lokasinya di Temuan).',
    tinggi: 'Tinggi plafon dari lantai di zona (meter), diukur dengan meteran laser. Tulis yang tertinggi bila bervariasi, mis. "6,0".',
    jarak: 'Jarak antar detektor terbesar dan luas pantau per detektor, mis. "8 m / 64 m²" (jarak × jarak). Bandingkan dengan batas pada tabel standar.',
    statusOverride_fa: 'Biarkan "Otomatis" kecuali ada alasan khusus. Aturan otomatis: ✗ pada butir 1, 4, 6, 8 (jarak/luas, terhalang, jenis tidak sesuai, area tidak terlindungi) → Tidak memenuhi; detektor tidak berfungsi lebih dari 10% dari yang diuji → Tidak memenuhi; detektor rusak ≤ 10%, belum semua diuji, atau ✗ pada butir lain → Catatan.',
  });
  EDITOR.kode = EDITOR.kode.replace('APAR-01 atau H-01 / HP-01', 'APAR-01, H-01 / HP-01, atau Z-01 untuk zona detektor');
  Object.assign(BLOCK, {
    'alat-fa': ['Cara mengisi peralatan uji',
      'Tulis hanya alat yang benar-benar dipakai saat riksa uji ini, satu baris per alat.',
      'Kolom 1 Nama peralatan: mis. Multimeter digital, Insulation tester (megger), Earth tester, Sound level meter, Heat tester, Smoke tester (aerosol), Stopwatch.',
      'Kolom 2 Spesifikasi: rentang ukur dan ketelitian dari badan alat, mis. "Megger 500 V DC, 0 – 2.000 MΩ".',
      'Kolom 3 No. sertifikat kalibrasi: salin dari sertifikat yang masih berlaku. Isi "–" bila alat tidak perlu kalibrasi (heat/smoke tester, stopwatch, kamera).'],
    'perangkat': ['Cara mengisi rekapitulasi perangkat',
      'Jumlah detektor (4 baris pertama) boleh dikosongkan: otomatis dijumlah dari zona di tab Zona Detektor. Isi manual hanya bila berbeda dari yang tercatat di zona.',
      'Titik panggil manual (MCP), alarm bell/horn, strobe dan voice alarm: hitung di lapangan dan cocokkan dengan gambar, lalu isi jumlahnya.',
      'Merk/tipe: salin dari label perangkat. Kosongkan bila tidak terbaca.'],
    'f-nilai': BLOCK['nilai'],
    'crow-fa_dokumen': ['Cara mengisi bagian ini',
      'Minta dokumen ke petugas perusahaan, lihat isinya langsung, lalu nilai.',
      'Keterangan: tulis nomor/tanggal dokumen, masa berlaku, atau jumlah yang tersedia (bukan hanya "ada").'],
    'crow-fa_panel': ['Cara mengisi bagian ini',
      'Periksa panel kontrol langsung di tempat. Tulis hal yang terlihat (lampu yang menyala, zona yang disable, pesan di layar) pada Keterangan.',
      'Foto panel dari depan saat kondisi normal sebagai dokumentasi.'],
    'crow-fa_sumber': ['Cara mengisi bagian ini',
      'Ukur dengan multimeter (hasil ukur ditulis dengan satuan V, A) dan bandingkan dengan kolom Kriteria. Nilai tidak boleh sekadar "ada".',
      'Pengukuran baterai saat AC diputus dilakukan bersama uji fungsi (butir 4.9 nomor 10) dengan izin pengelola.'],
    'baterai': ['Cara menghitung kapasitas baterai minimum',
      'Arus siaga: jumlah arus panel dan semua detektor saat normal (dari spesifikasi pabrikan atau diukur). Arus alarm: arus saat semua bell dan strobe aktif.',
      'Rumus: kapasitas minimum (Ah) = 1,25 × (arus siaga × jam siaga + arus alarm × menit alarm ÷ 60). Angka 1,25 adalah cadangan 25%.',
      'Contoh: 0,35 A × 24 jam = 8,4 Ah; 1,8 A × 5 menit ÷ 60 = 0,15 Ah; jumlah 8,55 Ah × 1,25 = 10,7 Ah. Baterai terpasang 14 Ah → memenuhi.',
      'Lama siaga dan lama alarm: pakai nilai standar yang dipegang PJK3 (umumnya 24 jam dan 5 menit). Hasil dan pilihan Memenuhi/Tidak tampil otomatis dan masuk ke laporan.'],
    'crow-fa_mcp': ['Cara mengisi bagian ini',
      'Uji setiap MCP satu per satu bersama petugas yang melihat panel. Tulis jumlah dan hasil ukur (tinggi dalam m, jarak dalam m, tekanan suara dalam dB(A)).',
      'Tekanan suara diukur dengan sound level meter setinggi telinga di titik paling jauh/bising saat alarm bunyi; ukur bising latar saat alarm mati sebagai pembanding.'],
    'crow-fa_kabel': ['Cara mengisi bagian ini',
      'Pengukuran tahanan isolasi dilakukan saat kabel dilepas dari panel dan perangkat (sumber dimatikan dan dikunci). Tulis nilai terkecil dalam MΩ.',
      'Tahanan pentanahan diukur dengan earth tester pada titik pentanahan panel. Tulis nilainya dalam Ω.'],
    'unit-fa': ['Cara memakai daftar zona',
      'Satu kartu = satu zona (atau satu kelompok detektor sejenis dalam satu ruang). Tekan "+ Tambah zona", isi identitas dan jumlah detektor, foto, lalu centang pemeriksaan penempatan.',
      'Jenis detektor, tinggi plafon dan jarak dari zona sebelumnya otomatis disalin agar pengisian cepat; periksa kembali sebelum lanjut.',
      'Total detektor, persentase berfungsi dan rekap per jenis tampil otomatis di laporan.'],
    'crow-fa_uji': ['Cara melakukan dan mengisi uji simulasi',
      'Beritahu pengelola dan petugas pemantau sebelum menguji, dan siapkan satu orang di depan panel yang membaca layar.',
      'Hasil pengamatan: tulis apa yang benar-benar terjadi (zona yang tampil, bell berbunyi atau tidak, waktu dalam detik).',
      'Nilai Memenuhi bila sama dengan Hasil yang diharapkan; Catatan bila ada kekurangan kecil; Tidak bila fungsi gagal.'],
    'crow-fa_interface': ['Cara mengisi bagian ini',
      'Aktifkan alarm penuh (dengan izin) lalu amati tiap sistem terkait. Pilih "Ya" atau "Tidak ada" pada Terpasang.',
      'Bila tidak ada, kosongkan penilaian. Bila ada, nilai Memenuhi jika responsnya sesuai yang diharapkan.'],
    'gen-foto-fa': ['Foto yang dibutuhkan',
      'Panel kontrol (kondisi normal dan saat alarm), label panel dan baterai, pengukuran tegangan, uji detektor dengan tester, uji MCP, pengukuran suara, dan temuan penting. Foto harus jelas dan terbaca.'],
    'fa-foto': ['Cara foto dokumentasi',
      'Satu foto suasana zona (detektor terlihat di plafon) dan satu foto dekat untuk detektor yang rusak, terhalang atau kotor. Untuk setiap butir ✗ tambah foto buktinya.'],
    'ck-fa': ['Cara mengisi pemeriksaan penempatan',
      '✓ = memenuhi, ✗ = tidak memenuhi. Periksa tiap butir langsung di zona, lalu tekan tombolnya; baca petunjuk abu-abu di bawah tiap butir.',
      'Tombol "Semua ✓" mengisi semua butir sebagai memenuhi; pakai untuk zona yang baik lalu ubah butir yang ✗ saja.',
      'Penilaian zona otomatis: ✗ pada butir 1, 4, 6, 8 → Tidak memenuhi; ✗ pada butir lain → Catatan.'],
    'denah-fa': ['Cara mengisi gambar instalasi',
      'Foto atau pindai denah per lantai yang menandai letak panel, zona (kode sama dengan tab Zona Detektor), detektor, MCP dan bell. Tandai detektor yang tidak berfungsi.'],
  });
  Object.assign(CROW, {
    fa_dokumen: [
      'Minta Surat Keterangan/pengesahan instalasi alarm kebakaran dan laporan riksa uji sebelumnya. Lihat masa berlakunya; tulis nomor dan tanggalnya.',
      'Minta gambar terpasang (as built) dan diagram zona. Cocokkan jumlah dan nama zona dengan panel dan 2–3 ruangan di lapangan. Tulis revisi atau tahun gambar.',
      'Minta katalog panel, detektor, MCP dan bell beserta sertifikat produk (SNI, UL, FM atau lembaga uji lain). Tulis yang tersedia dan yang tidak.',
      'Minta buku petunjuk operasi dan prosedur saat alarm berbunyi; pastikan mudah dibaca petugas jaga. Tulis ada/tidak dan lokasinya.',
      'Lihat buku log pemeliharaan: uji bulanan/berkala terisi rutin? Catat tanggal terakhir diisi dan jumlah alarm palsu yang tercatat. Catatan bila ada bulan yang kosong.',
      'Bandingkan dengan laporan riksa uji sebelumnya: berapa syarat/temuan yang diminta dan berapa yang sudah dikerjakan. Tulis "x dari y syarat telah dilaksanakan".',
      'Tanyakan regu/petugas penanggulangan kebakaran; minta SK penunjukan atau bukti pelatihan (KEP.186/MEN/1999). Tanya satu petugas: apa yang dilakukan saat alarm berbunyi.',
    ],
    fa_panel: [
      'Lihat lokasi panel: mudah dicapai, dekat pos yang dijaga atau dipantau, tidak tertutup barang, penerangan cukup. Tulis lokasinya.',
      'Pada kondisi normal: lampu POWER/AC menyala, tidak ada lampu FAULT/TROUBLE, tidak ada alarm atau lampu disable menyala. Tulis kondisi yang terlihat.',
      'Tekan LAMP TEST: semua lampu indikator dan buzzer harus menyala. Catat lampu yang mati.',
      'Hitung zona di panel dan cocokkan dengan gambar; label tiap zona harus terbaca dan sesuai ruangannya. Tulis jumlah zona.',
      'Periksa tombol SILENCE, RESET, ACKNOWLEDGE dan DRILL tersedia dan responsif. Hasil fungsinya diuji pada butir 4.9.',
      'Periksa indikator DISABLE/BYPASS atau menu status: tidak boleh ada zona/perangkat dinonaktifkan tanpa alasan tertulis. Tulis zona yang disable dan alasannya.',
      'Cek tanggal dan jam panel, lalu buka event log: lihat alarm/gangguan terakhir. Tulis berapa kejadian yang belum ditindaklanjuti.',
      'Buka pintu panel (dengan izin): kabel rapi, terminal berlabel, tidak ada kabel lepas, tidak ada debu/serangga/air. Panel terkunci.',
      'Bila ada repeater/annunciator, bandingkan tampilannya dengan panel utama saat uji alarm. Tulis "Tidak ada" bila tidak terpasang.',
    ],
    fa_sumber: [
      'Telusuri catu daya panel sampai panel distribusi: harus ada MCB/MCCB khusus alarm kebakaran berlabel "ALARM KEBAKARAN – JANGAN DIMATIKAN", bukan percabangan beban lain. Tulis asal sumbernya.',
      'Ukur tegangan AC pada terminal masuk panel dengan multimeter. Batas 220 V ± 10% = 198 – 242 V. Tulis angkanya.',
      'Ukur tegangan baterai saat AC normal (floating). Baterai 12 V biasanya 13,5 – 13,8 V; sistem 24 V biasanya 27,0 – 27,6 V; atau lihat spesifikasi panel.',
      'Matikan AC panel (bersama uji fungsi, dengan izin), biarkan alarm aktif beberapa menit, lalu ukur tegangan baterai. Tidak boleh di bawah batas minimum pabrikan (umumnya 21,6 V untuk sistem 24 V).',
      'Putus AC: panel harus pindah ke baterai otomatis, lampu AC FAIL muncul, panel tidak mati atau reset sendiri. Tulis hasilnya.',
      'Ukur arus pengisian dengan clamp DC atau baca di panel. Baterai yang sudah penuh arusnya kecil (umumnya < 0,5 A); bandingkan dengan spesifikasi charger.',
      'Periksa baterai: tidak menggelembung, bocor, atau terminal berkarat. Tulis tahun pemasangan dari label; baterai berumur lebih dari 3–5 tahun sebaiknya diuji kapasitas atau diganti.',
    ],
    fa_mcp: [
      'Tekan/kunci uji setiap MCP dan lihat panel menunjukkan zona yang benar dan bell berbunyi. Tulis "12 terpasang / 12 diuji / 11 berfungsi".',
      'Ukur tinggi pusat tombol MCP dari lantai dengan meteran. Umumnya sekitar 1,2 – 1,5 m, sesuaikan dengan standar yang dipakai. Tulis ukurannya.',
      'MCP harus di jalur keluar dan dekat tangga/pintu, mudah dilihat, tidak terhalang. Ukur jarak jalan kaki dari titik terjauh ke MCP terdekat; batas umumnya ≤ 30 m.',
      'Lihat penutup/kaca/label MCP: tidak retak, tidak pudar, ada petunjuk cara pakai, tidak dicat.',
      'Hitung bell/horn/strobe dan bandingkan dengan gambar. Saat alarm uji, jalan ke ruang paling jauh dan paling bising: bunyi harus terdengar jelas, termasuk di toilet dan ruang tertutup.',
      'Ukur dengan sound level meter di titik terjauh/terbising saat alarm bunyi, setinggi telinga. Tulis nilai terendah. Acuan: ≥ 15 dB di atas bising latar (ukur dulu saat alarm mati), atau batas pada standar.',
      'Dengarkan: nada alarm kebakaran harus berbeda dari bel istirahat/tanda kerja, dan tidak ada bel lain bernada sama.',
      'Bila ada voice alarm/pengeras suara evakuasi, uji pesannya terdengar jelas. Tulis "Tidak ada" bila tidak terpasang.',
    ],
    fa_kabel: [
      'Lihat kabel yang terlihat: jenis tahan api (FRC/FR) atau berpelindung, di dalam conduit/tray. Cocokkan dengan spesifikasi di gambar. Tulis jenis kabelnya.',
      'Jalur kabel alarm tidak boleh satu pipa dengan kabel daya/tegangan tinggi, atau harus berjarak sesuai standar.',
      'Buka beberapa junction box (sampel): sambungan hanya di dalam box, kabel dan terminal berlabel, tidak ada sambungan dililit.',
      'Lepas kabel dari panel (sumber dimatikan dan dikunci), ukur dengan megger 500 V DC antara kawat ke kawat dan kawat ke tanah/shield. Tulis nilai terkecil dalam MΩ; batas ≥ 1 MΩ.',
      'Ukur resistansi loop kabel (ujung kabel dihubung singkat, ukur dengan multimeter) dan bandingkan dengan batas pabrikan panel. Tulis dalam Ω.',
      'Zona konvensional: perangkat/resistor ujung saluran (EOL) harus ada di detektor terakhir tiap zona, bukan di panel. Cek sampel; tulis berapa zona yang dicek.',
      'Ukur tahanan pentanahan panel dengan earth tester. Tulis dalam Ω. Batas sesuai PUIL/ketentuan pabrikan panel (umumnya ≤ 5 Ω).',
      'Gantungan/penyangga kabel kuat, tidak kendor, terlindung dari tikus dan benturan.',
    ],
    fa_uji: [
      'Beri asap (smoke tester/aerosol) pada satu detektor asap; ukur waktu sampai alarm di panel. Tulis zona yang menyala, apakah buzzer dan bell aktif, dan waktunya.',
      'Panaskan satu detektor panas dengan heat tester sesuai petunjuk alat; tulis zona, bell dan waktu responsnya.',
      'Aktifkan satu MCP: lihat panel menunjukkan zona yang benar dan bell aktif. Tulis zonanya.',
      'Jika sistem disetel cross-zone/dua-detektor, aktifkan dua detektor dan amati urutannya (pra-alarm lalu alarm penuh). Tulis "Tidak disetel" bila tidak ada pengaturan itu.',
      'Saat alarm aktif tekan SILENCE: bell harus mati, buzzer panel dan lampu alarm tetap, dan bell bunyi lagi bila ada alarm baru.',
      'Hilangkan pemicu lalu tekan RESET: panel kembali normal dan detektor tidak menyala lagi. Catat bila perlu reset berulang.',
      'Cabut satu detektor (atau putus kabel loop): panel harus menampilkan TROUBLE/FAULT dan zonanya, disertai buzzer gangguan. Catat waktu tampilnya (umumnya kurang dari 100 detik).',
      'Bila aman dan diizinkan, hubung singkat kabel zona konvensional: panel menampilkan alarm atau FAULT sesuai rancangan. Tulis "Tidak dilakukan" bila tidak aman.',
      'Uji ground fault (lewat menu uji panel atau sesuai petunjuk pabrikan): panel menampilkan EARTH FAULT. Tulis "Tidak dilakukan" bila tidak aman.',
      'Matikan MCB AC panel: panel pindah ke baterai, lampu AC FAIL menyala, panel tidak mati. Hidupkan lagi dan pastikan kembali normal.',
      'Putuskan satu kabel bell/sounder: panel menampilkan gangguan rangkaian bell.',
      'Tekan DRILL/EVACUATE: seluruh bell dan strobe aktif bersamaan.',
      'Saat alarm, lihat annunciator, repeater, pos pemantau atau sinyal jarak jauh (bila ada): statusnya sama dengan panel utama. Tulis "Tidak ada" bila tidak ada.',
    ],
    fa_interface: [
      'Saat alarm penuh, lift harus turun ke lantai dasar dan pintunya terbuka (mode kebakaran). Pilih "Ya" bila terhubung ke alarm.',
      'Kipas AHU/ventilasi mati atau berubah mode sesuai rancangan saat alarm.',
      'Damper api/asap menutup saat alarm (lihat posisinya atau indikator damper).',
      'Magnetic door holder terlepas dan pintu tahan api menutup rapat saat alarm.',
      'Pintu pada jalur evakuasi terbuka (fail-safe) saat alarm sehingga orang bisa keluar.',
      'Kipas pressurized tangga kebakaran menyala saat alarm.',
      'Flow switch/tamper sprinkler dan status pompa kebakaran terbaca di panel. Uji dengan simulasi atau buka test valve sprinkler dengan izin.',
      'Sistem pemadam gas/agen bersih: sinyal pra-pelepasan dan waktu tunda sesuai rancangan. Jangan melepas gas; uji hanya sinyalnya.',
      'Shunt trip/pemutus daya, bila ada, bekerja sesuai rancangan saat alarm.',
    ],
  });
  const FAZ = [
    'Ukur jarak antar detektor (meteran laser) dan tinggi plafon; luas per detektor = jarak × jarak. Bandingkan dengan tabel standar untuk jenis detektor dan tinggi plafon itu. ✗ bila melebihi batas.',
    'Ukur jarak detektor dari dinding, sekat dan balok. ✗ bila terlalu dekat (terkena ruang udara mati di sudut) atau melebihi jarak maksimum pada standar.',
    'Ukur jarak detektor dari lubang AC/diffuser dan kipas; umumnya minimal 1 m supaya asap tidak terhembus. ✗ bila terlalu dekat.',
    'Lihat ke atas: tidak ada rak, lampu, kabel tray, pipa atau tumpukan barang yang menghalangi (umumnya ruang bebas 0,5 m di sekeliling detektor). ✗ bila terhalang.',
    'Periksa ruang plafon palsu dan bawah lantai palsu: bila berisi kabel atau bahan mudah terbakar harus ada detektor. Pilih ✓ bila tidak ada ruang tersebut atau tidak diperlukan.',
    'Cocokkan jenis detektor dengan ruangan: dapur/ruang genset/area berasap atau berdebu sebaiknya detektor panas; kantor/gudang bersih detektor asap; ruang tinggi/terbuka beam atau nyala api. ✗ bila salah jenis.',
    'Lihat dari bawah: detektor bersih, tidak dicat, tidak dibungkus plastik, dan lampu indikator berkedip/menyala. ✗ bila tertutup atau kotor.',
    'Jalan ke seluruh area: ruang panel, shaft, plafon, gudang dan tangga harus terlindungi sesuai gambar. ✗ bila ada ruangan yang tidak ada detektornya.',
    'Cocokkan zona dengan gambar: satu zona hanya satu lantai (kecuali luas kecil) dan luas zona tidak melebihi batas standar (umumnya ≤ 2.000 m²). ✗ bila melintasi lantai atau terlalu luas.',
  ];

  /* ---------- API ---------- */
  const f = (key) => how(FIELD[key]);           // kolom statis
  const e = (key) => how(EDITOR[key]);          // kolom editor
  const aparItem = (k) => APAR[k] ? `<em class="how">${esc(APAR[k])}</em>` : '';
  const hydItem = (jenis, k) => (HYD[jenis === 'halaman' ? 'halaman' : 'gedung'] || [])[k] ? `<em class="how">${esc(HYD[jenis === 'halaman' ? 'halaman' : 'gedung'][k])}</em>` : '';
  const faItem = (k) => FAZ[k] ? `<em class="how">${esc(FAZ[k])}</em>` : '';
  const crow = (sec, i) => (CROW[sec] || [])[i] ? `<em class="how">${esc(CROW[sec][i])}</em>` : '';
  const block = (key) => { const b = BLOCK[key]; if (!b) return ''; return `<b>${esc(b[0])}</b><ul>${b.slice(1).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`; };

  function decorate(root = document) {
    // petunjuk di bawah kolom statis
    Object.keys(FIELD).forEach((k) => {
      const el = root.querySelector(`[data-path="${k}"]`); if (!el) return;
      const lab = el.closest('.field'); if (!lab || lab.querySelector(':scope > .how')) return;
      lab.insertAdjacentHTML('beforeend', how(FIELD[k]));
    });
    // blok petunjuk
    root.querySelectorAll('[data-howblk]').forEach((d) => { d.className = 'how-block'; d.innerHTML = block(d.dataset.howblk); });
  }

  // tombol Tampil/Sembunyikan petunjuk (disimpan di perangkat)
  const KEY = 'riksa-petunjuk';
  const isOn = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch (er) { return true; } };
  function apply() {
    const on = isOn(); document.body.classList.toggle('no-how', !on);
    const b = document.getElementById('how-toggle'); if (b) { b.setAttribute('aria-pressed', String(on)); b.textContent = 'ⓘ Petunjuk: ' + (on ? 'Tampil' : 'Sembunyi'); }
  }
  function toggle() { try { localStorage.setItem(KEY, isOn() ? 'off' : 'on'); } catch (er) { } apply(); }

  return { f, e, aparItem, hydItem, faItem, crow, block, decorate, apply, toggle, APAR, HYD, CROW, FIELD, EDITOR, BLOCK };
})();
