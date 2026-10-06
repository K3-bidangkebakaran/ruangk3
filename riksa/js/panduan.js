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

  /* ---------- API ---------- */
  const f = (key) => how(FIELD[key]);           // kolom statis
  const e = (key) => how(EDITOR[key]);          // kolom editor
  const aparItem = (k) => APAR[k] ? `<em class="how">${esc(APAR[k])}</em>` : '';
  const hydItem = (jenis, k) => (HYD[jenis === 'halaman' ? 'halaman' : 'gedung'] || [])[k] ? `<em class="how">${esc(HYD[jenis === 'halaman' ? 'halaman' : 'gedung'][k])}</em>` : '';
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

  return { f, e, aparItem, hydItem, crow, block, decorate, apply, toggle, APAR, HYD, CROW, FIELD, EDITOR, BLOCK };
})();
