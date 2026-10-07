(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MEDIA = ['Powder ABC', 'CO₂', 'Foam AFFF', 'Clean Agent', 'Air (Water)', 'Lainnya'];
  const HYDRO_DEFAULT = { done: false, kerja: '14 bar', coba: '21 bar (1,5×)', durasi: '30 detik', bocor: 'Tidak ada', deformasi: 'Tidak ada', hasil: 'Lulus' };
  const H_LABEL = { M: 'Memenuhi', C: 'Catatan', T: 'Tidak memenuhi' };
  const TABS = { apar: ['a-data', 'a-units', 'a-concl', 'a-dl'], hyd: ['h-data', 'h-pump', 'h-points', 'h-concl', 'h-dl'], fa: ['f-data', 'f-sys', 'f-zones', 'f-test', 'f-concl', 'f-dl'] };
  const PFX = { apar: 'a', hyd: 'h', fa: 'f' };

  let S = null;
  const photoData = new Map();
  let mod = 'apar';
  const lastTab = { apar: 'a-data', hyd: 'h-data', fa: 'f-data' };
  let edit = null; // {mod, i}
  let stampOn = true;
  const filt = { apar: { q: '', s: '' }, hyd: { q: '', s: '' }, fa: { q: '', s: '' } };

  // ---------- storage ----------
  // Struktur IndexedDB: kv['g'] = data global (PJK3, sesi, alamat server)
  //                     kv['index'] = ringkasan semua berkas di perangkat
  //                     kv['b:<id>'] = isi satu berkas (1 perusahaan: modul APAR + hidran)
  //                     photos[<id>] = data foto (dataURL)
  let G = { pjk3: null, session: null, api: '', seeded: false };
  let IDX = [];
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      try { const r = indexedDB.open('riksa-uji-apar', 1); r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('photos'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
      catch (e) { rej(e); }
    });
    return dbp;
  }
  async function idbDo(store, mode, fn) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction(store, mode); const out = fn(tx.objectStore(store)); tx.oncomplete = () => res(out && out.result); tx.onerror = () => rej(tx.error); }); }
  const kvGet = (k) => idbDo('kv', 'readonly', s => s.get(k)).then(v => v == null ? null : JSON.parse(v)).catch(() => null);
  const kvPut = (k, v) => idbDo('kv', 'readwrite', s => s.put(JSON.stringify(v), k));
  const kvDel = (k) => idbDo('kv', 'readwrite', s => s.delete(k)).catch(() => {});
  const putPhoto = (id, d) => idbDo('photos', 'readwrite', s => s.put(d, id)).catch(() => {});
  const delPhoto = (id) => idbDo('photos', 'readwrite', s => s.delete(id)).catch(() => {});
  const getPhoto = (id) => idbDo('photos', 'readonly', s => s.get(id)).catch(() => null);

  // semua objek foto ({id, w, h}) di dalam sebuah struktur
  function photoRefs(o, out = []) {
    if (Array.isArray(o)) o.forEach(x => photoRefs(x, out));
    else if (o && typeof o === 'object') { if (o.id && typeof o.w === 'number') out.push(o); Object.values(o).forEach(x => photoRefs(x, out)); }
    return out;
  }
  async function loadPhotosFor(obj) {
    for (const p of photoRefs(obj)) if (!photoData.has(p.id)) { const d = await getPhoto(p.id); if (d) photoData.set(p.id, d); }
  }

  const berkasForDisk = (b) => ({ ...b, shared: { ...b.shared, pjk3: undefined } });
  function summarize(b) {
    const a = b.apar, h = b.hyd, f = b.fa || RF.blankModule(), K = b.shared.klien;
    return {
      id: b.id, klien: K.nama || '', alamat: K.alamatSingkat || K.alamat || '',
      tgl: a.meta.tglMulai || h.meta.tglMulai || f.meta.tglMulai || '', updatedAt: b.updatedAt || 0, createdBy: b.createdBy || null, createdByName: b.createdByName || '',
      sample: !!(a.meta.isSample || h.meta.isSample),
      apar: { n: a.units.length, nomor: a.meta.nomor || '', sentAt: (a.sync && a.sync.sentAt) || 0, editedAt: a.editedAt || 0, pending: !!(a.sync && a.sync.pending), has: hasData('apar', b) },
      hyd: { n: h.points.length, nomor: h.meta.nomor || '', sentAt: (h.sync && h.sync.sentAt) || 0, editedAt: h.editedAt || 0, pending: !!(h.sync && h.sync.pending), has: hasData('hyd', b) },
      fa: { n: f.zones.length, nomor: f.meta.nomor || '', sentAt: (f.sync && f.sync.sentAt) || 0, editedAt: f.editedAt || 0, pending: !!(f.sync && f.sync.pending), has: hasData('fa', b) },
    };
  }
  function hasData(m, b = S) {
    const x = b[m];
    if (!x) return false;
    if (m === 'fa') return x.zones.length > 0 || (x.panel || []).some(r => r.hasil) || (x.uji || []).some(r => r.hasil);
    return m === 'apar' ? x.units.length > 0 : (x.points.length > 0 || (x.ujiPompa || []).some(r => (r.tekanan || '').trim()));
  }
  let saveTimer = null, savePending = false;
  // scope: 'apar' | 'hyd' | 'shared' — modul mana yang berubah (untuk status "ada perubahan belum dikirim")
  function save(touch = true, scope = mod) {
    if (!S) return;
    if (touch) {
      const t = Date.now(); S.updatedAt = t;
      if (scope === 'shared') { S.apar.editedAt = t; S.hyd.editedAt = t; S.fa.editedAt = t; } else if (S[scope]) S[scope].editedAt = t;
    }
    savePending = true;
    clearTimeout(saveTimer); $('#savestate').textContent = 'Menyimpan…';
    saveTimer = setTimeout(flush, 350);
  }
  async function flush() {
    clearTimeout(saveTimer);
    if (!savePending || !S) return;
    savePending = false;
    try {
      await kvPut('b:' + S.id, berkasForDisk(S));
      const sm = summarize(S); const k = IDX.findIndex(x => x.id === S.id); if (k >= 0) IDX[k] = sm; else IDX.unshift(sm);
      await kvPut('index', IDX); await kvPut('g', G);
      $('#savestate').textContent = 'Tersimpan di perangkat ini · ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { $('#savestate').textContent = 'Tidak bisa menyimpan di browser ini'; }
  }
  const saveG = () => kvPut('g', G).catch(() => {});

  const uidLong = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).replace(/[^a-z0-9]/g, '');
  function sampleBerkas() {
    const a = RU.sampleState();
    return { id: uidLong(), version: 3, createdBy: null, createdByName: '', createdAt: Date.now(), updatedAt: Date.now(), mod: 'apar',
      shared: { klien: a.klien }, apar: { meta: a.meta, alat: a.alat, keteranganTabel: a.keteranganTabel, units: a.units, rekomendasi: null, denah: null, sync: {} }, hyd: { ...RH.sampleModule(), sync: {} }, fa: { ...RF.sampleModule(), sync: {} } };
  }
  // ubah berbagai format lama (v1: satu laporan APAR, v2: APAR + hidran) menjadi berkas v3
  function toBerkas(d) {
    if (!d) return null;
    if (d.version === 3 && d.apar && d.hyd) { d.fa ??= RF.blankModule(); d.fa.sync ??= {}; return d; }
    let b = null;
    if (d.version === 2 && d.apar) b = { shared: { klien: d.shared.klien || {}, pjk3: d.shared.pjk3 }, apar: d.apar, hyd: d.hyd || RH.sampleModule(), mod: d.mod };
    else if (Array.isArray(d.units)) b = { shared: { klien: d.klien || {}, pjk3: d.pjk3 }, apar: { meta: d.meta, alat: d.alat || [], keteranganTabel: d.keteranganTabel || '', units: d.units, rekomendasi: d.rekomendasi || null, denah: d.denah || null }, hyd: RH.blankModule(), mod: 'apar' };
    if (!b) return null;
    b.apar.sync ??= {}; b.hyd.sync ??= {}; b.fa ??= RF.blankModule(); b.fa.sync ??= {};
    return { id: d.id || uidLong(), version: 3, createdBy: null, createdByName: '', createdAt: Date.now(), updatedAt: Date.now(), mod: b.mod || 'apar', ...b };
  }
  function blankPjk3() { return { nama: '', sk: '', alamat: '', telp: '', email: '', ahli: '', lisensi: '', teknisi: '', direktur: '', jabatanDirektur: 'Direktur', logo: null }; }
  async function bootStorage() {
    try {
      G = { ...G, ...(await kvGet('g') || {}) };
      IDX = await kvGet('index') || [];
      const legacy = await kvGet('state');
      if (legacy) {
        const b = toBerkas(legacy);
        if (b) { if (!G.pjk3 && b.shared.pjk3) G.pjk3 = b.shared.pjk3; await kvPut('b:' + b.id, berkasForDisk(b)); IDX.unshift(summarize(b)); await kvPut('index', IDX); }
        await kvDel('state'); G.seeded = true;
      }
      G.pjk3 ??= blankPjk3();
      if (!G.seeded) { const b = sampleBerkas(); await kvPut('b:' + b.id, berkasForDisk(b)); IDX.unshift(summarize(b)); await kvPut('index', IDX); G.seeded = true; }
      await saveG();
      if (G.pjk3.logo) { const d = await getPhoto(G.pjk3.logo.id); if (d) photoData.set(G.pjk3.logo.id, d); }
    } catch (e) {
      // browser tanpa penyimpanan: tetap bisa dipakai selama halaman terbuka
      G.pjk3 ??= blankPjk3();
      if (!IDX.length) { const b = sampleBerkas(); memBerkas[b.id] = b; IDX = [summarize(b)]; }
    }
  }
  const memBerkas = {};
  async function loadBerkas(id) { return memBerkas[id] || toBerkas(await kvGet('b:' + id)); }

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => (a[k] ??= {}), o)[last] = v; };
  const M = () => S[mod];

  // ---------- images ----------
  function loadImg(file) { return new Promise((res, rej) => { const url = URL.createObjectURL(file); const im = new Image(); im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(url), 1000); }; im.onerror = () => rej(new Error('Gambar tidak bisa dibaca')); im.src = url; }); }
  async function compress(file, { max = 1280, stamp = null, png = false } = {}) {
    const im = await loadImg(file);
    const r = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.round(im.naturalWidth * r), h = Math.round(im.naturalHeight * r);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
    g.drawImage(im, 0, 0, w, h);
    if (stamp) {
      const fs = Math.max(14, Math.round(w / 40)); g.font = `600 ${fs}px Barlow, Arial, sans-serif`;
      const pad = Math.round(fs * .5), bh = fs + pad * 2;
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, h - bh, w, bh); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(stamp, pad, h - bh / 2);
    }
    return { data: cv.toDataURL(png ? 'image/png' : 'image/jpeg', .74), w, h };
  }
  const now = () => new Date().toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  async function addPhotos(files, list, stamp) {
    for (const f of files) {
      try { const img = await compress(f, { stamp }); const id = 'ph-' + uid(); photoData.set(id, img.data); await putPhoto(id, img.data); list.push({ id, w: img.w, h: img.h, caption: '' }); }
      catch (e) { /* bukan gambar */ }
    }
  }
  const photoGrid = (list, alt) => list.map((p, k) => `<div class="photo"><img src="${photoData.get(p.id) || ''}" alt="${esc(alt)} ${k + 1}">
      <input type="text" id="cap-${p.id}" data-cap="${k}" value="${esc(p.caption)}" placeholder="Keterangan foto" aria-label="Keterangan foto">
      <button class="x" data-phdel="${k}">Hapus foto</button></div>`).join('');

  // ---------- module & tabs ----------
  function setMod(m) {
    mod = m; S.mod = m;
    $$('.modsw button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mod === m)));
    $$('.tab').forEach(t => { t.hidden = t.dataset.m !== m; });
    showTab(lastTab[m]);
  }
  function showTab(name) {
    lastTab[mod] = name;
    $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    $$('.tabpanel').forEach(p => { p.hidden = p.id !== 'tab-' + name; });
    const panel = $('#tab-' + name);
    const ss = $('.shared-slot', panel); if (ss) ss.appendChild($('#shared-sec'));
    $('#shared-sec').hidden = !ss;
    const bs = $('.backup-slot', panel); if (bs) { bs.appendChild($('#sync-sec')); bs.appendChild($('#backup-sec')); }
    $('#backup-sec').hidden = !bs; $('#sync-sec').hidden = !bs;
    if (bs) renderSync();
    renderHeader();
    ({ 'a-units': renderUnits, 'a-concl': renderAConcl, 'a-dl': renderADl, 'h-data': renderPompa, 'h-pump': renderPump, 'h-points': renderPoints, 'h-concl': renderHConcl, 'h-dl': renderHDl,
      'f-data': renderFaData, 'f-sys': renderFaSys, 'f-zones': renderZones, 'f-test': renderFaTest, 'f-concl': renderFConcl, 'f-dl': renderFDl }[name] || (() => {}))();
    try { localStorage.setItem('riksa-nav', JSON.stringify({ mod, lastTab })); } catch (e) {}
    window.scrollTo({ top: 0 });
  }
  $$('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  $$('.modsw button').forEach(b => b.addEventListener('click', () => { setMod(b.dataset.mod); save(false); }));

  function renderHeader() {
    const m = M();
    $('#hdr-sub').textContent = [({ apar: 'APAR', hyd: 'Instalasi hidran', fa: 'Alarm kebakaran (Fire Alarm)' })[mod], m.meta.nomor ? 'No. ' + m.meta.nomor : 'Nomor belum diisi', S.shared.klien.nama].filter(Boolean).join(' · ');
    $('#cnt-apar').textContent = S.apar.units.length;
    $('#cnt-hyd').textContent = S.hyd.points.length;
    $('#cnt-fa').textContent = S.fa.zones.length;
    $('#sample-banner').hidden = !m.meta.isSample;
    $('#banner-text').textContent = `Isian ${({ apar: 'APAR', hyd: 'hidran', fa: 'Fire Alarm' })[mod]} ini fiktif, sama dengan laporan contoh. Mulai laporan baru untuk mengosongkannya; data PJK3 dan perusahaan tetap.`;
  }
  function inlineConfirm(slot, label, question, onYes, cls = 'btn sm') {
    const draw = () => {
      slot.innerHTML = `<button class="${cls}">${esc(label)}</button>`;
      slot.firstChild.onclick = () => {
        slot.innerHTML = `<span class="confirm">${esc(question)} <button class="btn sm primary" data-y>Ya</button><button class="btn sm" data-n>Batal</button></span>`;
        slot.querySelector('[data-y]').onclick = () => { onYes(); draw(); };
        slot.querySelector('[data-n]').onclick = draw;
      };
    };
    draw();
  }
  const dropPhotos = (list) => (list || []).forEach(p => { photoData.delete(p.id); delPhoto(p.id); });
  inlineConfirm($('#newrep-slot'), 'Mulai laporan baru', 'Kosongkan data contoh?', () => {
    const today = new Date().toISOString().slice(0, 10);
    if (mod === 'apar') {
      S.apar.units.forEach(u => dropPhotos(u.photos)); if (S.apar.denah) dropPhotos([S.apar.denah]);
      S.apar = { meta: { isSample: false, nomor: '', periode: '', tglMulai: today, tglSelesai: today, tglLaporan: today, kota: '', jenis: $('#a-jenis').options[0].value, sebelumnya: '' }, alat: S.apar.alat, keteranganTabel: S.apar.keteranganTabel, units: [], rekomendasi: null, denah: null };
    } else if (mod === 'fa') {
      S.fa.zones.forEach(z => dropPhotos(z.photos)); dropPhotos(S.fa.photos); if (S.fa.gambar) dropPhotos([S.fa.gambar]);
      const alat = S.fa.alat; S.fa = RF.blankModule(); S.fa.alat = alat;
    } else {
      S.hyd.points.forEach(p => dropPhotos(p.photos)); dropPhotos(S.hyd.photos); if (S.hyd.gambar) dropPhotos([S.hyd.gambar]);
      const alat = S.hyd.alat; S.hyd = RH.blankModule(); S.hyd.alat = alat;
    }
    save(); fillForm(); showTab(TABS[mod][0]);
  }, 'btn sm primary');
  inlineConfirm($('#klien-clear-slot'), 'Kosongkan', 'Kosongkan data perusahaan?', () => {
    Object.keys(S.shared.klien).forEach(k => { S.shared.klien[k] = ''; }); save(true, 'shared'); fillForm(); renderHeader();
  }, 'btn sm ghost');

  // ---------- form binding ----------
  function fillForm() {
    $$('[data-path]').forEach(el => { const v = getPath(S, el.dataset.path); el.value = v ?? ''; });
    renderAlat(); renderImgs();
  }
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.path) { setPath(S, el.dataset.path, el.value); save(true, el.dataset.path.split('.')[0]); renderHeader(); if (/^hyd\.teknis\.(reservoirM3|debitLpm)/.test(el.dataset.path)) renderWater(); if (/^fa\.baterai\./.test(el.dataset.path)) renderBat(); }
  });
  document.addEventListener('change', (e) => { const el = e.target; if (el.tagName === 'SELECT' && el.dataset.path) { setPath(S, el.dataset.path, el.value); save(true, el.dataset.path.split('.')[0]); } });

  function renderAlat() {
    $$('.alat-list').forEach(box => {
      const list = S[box.dataset.mod].alat;
      box.innerHTML = list.map((a, i) => `<div class="alat-row">
        <input type="text" id="al-${box.dataset.mod}-n${i}" data-alat="${i}" data-k="nama" value="${esc(a.nama)}" placeholder="Nama peralatan" aria-label="Nama peralatan">
        <input type="text" id="al-${box.dataset.mod}-s${i}" data-alat="${i}" data-k="spek" value="${esc(a.spek)}" placeholder="Spesifikasi" aria-label="Spesifikasi">
        <input type="text" id="al-${box.dataset.mod}-c${i}" data-alat="${i}" data-k="sert" value="${esc(a.sert)}" placeholder="No. sertifikat kalibrasi" aria-label="No. sertifikat kalibrasi">
        <button class="btn sm ghost danger" data-alat-del="${i}">Hapus</button></div>`).join('');
    });
  }
  $$('.alat-list').forEach(box => {
    box.addEventListener('input', (e) => { const el = e.target; if (el.dataset.alat != null) { S[box.dataset.mod].alat[+el.dataset.alat][el.dataset.k] = el.value; save(); } });
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-alat-del]'); if (b) { S[box.dataset.mod].alat.splice(+b.dataset.alatDel, 1); renderAlat(); save(); } });
  });
  $$('.alat-add').forEach(b => b.onclick = () => { S[b.dataset.mod].alat.push({ nama: '', spek: '', sert: '' }); renderAlat(); save(); });

  // gambar tunggal (logo, denah, gambar instalasi)
  function renderImgs() {
    $$('.img-prev').forEach(img => { const o = getPath(S, img.dataset.target); const d = o && photoData.get(o.id); img.hidden = !d; if (d) img.src = d; });
    $$('.img-del').forEach(b => { const o = getPath(S, b.dataset.target); b.hidden = !(o && photoData.get(o.id)); });
  }
  $$('.img-in').forEach(inp => inp.onchange = async () => {
    const f = inp.files[0]; inp.value = ''; if (!f) return;
    const logo = !!inp.dataset.logo;
    const img = await compress(f, logo ? { max: 600, png: f.type === 'image/png' } : { max: 1800 });
    const old = getPath(S, inp.dataset.target); if (old) dropPhotos([old]);
    const id = 'img-' + uid(); photoData.set(id, img.data); await putPhoto(id, img.data);
    setPath(S, inp.dataset.target, { id, w: img.w, h: img.h }); save(true, inp.dataset.target.split('.')[0]); renderImgs();
  });
  $$('.img-del').forEach(b => b.onclick = () => { const o = getPath(S, b.dataset.target); if (o) dropPhotos([o]); setPath(S, b.dataset.target, null); save(true, b.dataset.target.split('.')[0]); renderImgs(); });

  // ================= APAR =================
  const aCounts = () => { const c = { L: 0, LC: 0, TL: 0 }; S.apar.units.forEach(u => c[RU.statusOf(u)]++); return c; };
  function tiles(defs, clickable, f) {
    return defs.map(([k, label, n]) => `<button class="stat ${k}" ${clickable ? `data-sf="${k}" aria-pressed="${f.s === k}"` : 'tabindex="-1"'}><b>${n}</b><small>${label}</small></button>`).join('');
  }
  const aTiles = (cl) => { const c = aCounts(); return tiles([['', 'Total unit', S.apar.units.length], ['L', 'Layak', c.L], ['LC', 'Dgn catatan', c.LC], ['TL', 'Tidak layak', c.TL]], cl, filt.apar); };
  function renderUnits() {
    $('#a-stats').innerHTML = aTiles(true);
    const f = filt.apar, q = f.q.trim().toLowerCase();
    const list = S.apar.units.map((u, i) => ({ u, i })).filter(({ u }) => (!q || (u.kode + ' ' + u.lokasi).toLowerCase().includes(q)) && (!f.s || RU.statusOf(u) === f.s));
    if (!S.apar.units.length) { $('#a-list').innerHTML = `<div class="empty">Belum ada APAR. Tekan <b>+ Tambah APAR</b> untuk mencatat unit pertama.</div>`; return; }
    if (!list.length) { $('#a-list').innerHTML = `<div class="empty">Tidak ada unit yang cocok dengan filter.</div>`; return; }
    $('#a-list').innerHTML = list.map(({ u, i }) => {
      const s = RU.statusOf(u), nf = RU.failedItems(u).length, np = (u.photos || []).length;
      return `<button class="unit" data-i="${i}"><span class="stripe ${s}"></span>
        <span class="body"><span class="top"><span class="code">${esc(u.kode)}</span><span class="loc">${esc(u.lokasi || 'Lokasi belum diisi')}</span></span>
        <span class="meta"><span>${esc(u.media || '–')} ${esc(u.kap || '')}</span><span class="mono">${esc(u.bacaan || '')}</span>${np ? `<span>${np} foto</span>` : ''}${u.hydro && u.hydro.done ? '<span>Uji hidrostatik</span>' : ''}</span></span>
        <span class="side"><span class="pill s-${s}">${RU.STATUS_LABEL[s]}</span>${nf ? `<span class="fails">${nf} butir ✗</span>` : ''}</span></button>`;
    }).join('');
  }
  $('#a-stats').addEventListener('click', (e) => { const b = e.target.closest('[data-sf]'); if (!b) return; filt.apar.s = filt.apar.s === b.dataset.sf ? '' : b.dataset.sf; renderUnits(); });
  $('#a-search').addEventListener('input', (e) => { filt.apar.q = e.target.value; renderUnits(); });
  $('#a-list').addEventListener('click', (e) => { const b = e.target.closest('.unit'); if (b) openEditor('apar', +b.dataset.i); });
  function nextKode(list, prefix) {
    let max = 0, digits = 2;
    list.forEach(u => { if (!(u.kode || '').startsWith(prefix)) return; const m = /(\d+)\s*$/.exec(u.kode || ''); if (m) { max = Math.max(max, +m[1]); digits = Math.max(digits, m[1].length); } });
    return prefix + String(max + 1).padStart(digits, '0');
  }
  function newUnit(from) {
    return { id: uid(), kode: nextKode(S.apar.units, 'APAR-'), lokasi: '', media: from ? from.media : 'Powder ABC', kap: from ? from.kap : '6 kg', merk: from ? from.merk : '', thn: '', isiUlang: '', bacaan: '', checks: Array(15).fill('v').map((v, k) => (k === 12 && from && !/^Powder/.test(from.media)) ? 'na' : v), statusOverride: '', temuan: '', rekomendasi: '', batas: '', hydro: { ...HYDRO_DEFAULT }, photos: [] };
  }
  $('#a-add').onclick = () => { S.apar.units.push(newUnit(S.apar.units[S.apar.units.length - 1])); save(); renderHeader(); renderUnits(); openEditor('apar', S.apar.units.length - 1); };

  function renderAConcl() {
    const c = aCounts(), U = S.apar.units, tl = U.filter(u => RU.statusOf(u) === 'TL'), lc = U.filter(u => RU.statusOf(u) === 'LC');
    const codes = (a) => a.length <= 20 ? a.map(u => u.kode).join(', ') : `${a.length} unit`;
    const out = [`${c.L} unit APAR dinyatakan LAYAK.`];
    if (lc.length) out.push(`${lc.length} unit (${codes(lc)}) LAYAK DENGAN CATATAN.`);
    if (tl.length) out.push(`${tl.length} unit (${codes(tl)}) TIDAK LAYAK.`);
    const h = U.filter(u => u.hydro && u.hydro.done);
    if (h.length) out.push(`Percobaan tekan: ${h.filter(u => u.hydro.hasil !== 'Gagal').length} dari ${h.length} unit memenuhi syarat.`);
    out.push(tl.length || lc.length ? 'Sistem APAR BELUM SEPENUHNYA MEMENUHI SYARAT K3.' : 'Sistem APAR MEMENUHI SYARAT K3.');
    $('#a-concl-list').innerHTML = out.map(x => `<li>${esc(x)}</li>`).join('');
    renderRekom('apar'); renderImgs();
  }
  const flatApar = () => ({ ...S.apar, pjk3: S.shared.pjk3, klien: S.shared.klien });
  function readyList(items) { return items.map(x => `<li class="${x[0] ? 'ok' : 'miss'}">${x[0] ? '✓' : '○'} ${esc(x[1])}${x[0] ? '' : ' — akan tampil sebagai teks berlatar kuning'}</li>`).join(''); }
  function commonReady(m) {
    const P = S.shared.pjk3, K = S.shared.klien;
    return [[m.meta.nomor, 'Nomor laporan'], [P.nama && P.sk, 'Nama & SK PJK3'], [P.ahli && P.lisensi, 'Ahli K3 & nomor lisensi'], [K.nama && K.alamat, 'Nama & alamat perusahaan']];
  }
  function renderADl() {
    $('#a-stats-dl').innerHTML = aTiles(false);
    const U = S.apar.units, noLoc = U.filter(u => !u.lokasi).length, nPh = U.reduce((a, u) => a + (u.photos || []).length, 0);
    $('#a-ready').innerHTML = readyList([...commonReady(S.apar), [U.length, `Unit APAR (${U.length})`], [!noLoc, noLoc ? `${noLoc} unit tanpa lokasi` : 'Lokasi semua unit'], [nPh, `Foto dokumentasi (${nPh})`], [S.apar.alat.every(a => !a.nama || a.sert), 'Nomor sertifikat kalibrasi peralatan']]);
  }

  // ================= HIDRAN =================
  function renderPompa() {
    $('#h-pompa').innerHTML = S.hyd.pompa.map((x, i) => `<div class="alat-row" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
      ${[['pompa', 'Pompa'], ['merk', 'Merk / tipe'], ['kapasitas', 'Kapasitas'], ['head', 'Head / tekanan'], ['penggerak', 'Penggerak'], ['daya', 'Daya / putaran']].map(([k, l]) => `<input type="text" id="pp-${k}-${i}" data-pp="${i}" data-k="${k}" value="${esc(x[k])}" placeholder="${l}" aria-label="${l}">`).join('')}
      <button class="btn sm ghost danger" data-pp-del="${i}">Hapus</button></div>`).join('');
  }
  $('#h-pompa').addEventListener('input', (e) => { const el = e.target; if (el.dataset.pp != null) { S.hyd.pompa[+el.dataset.pp][el.dataset.k] = el.value; save(); } });
  $('#h-pompa').addEventListener('click', (e) => { const b = e.target.closest('[data-pp-del]'); if (b) { S.hyd.pompa.splice(+b.dataset.ppDel, 1); renderPompa(); save(); } });
  $('#h-pompa-add').onclick = () => { S.hyd.pompa.push({ pompa: '', merk: '', kapasitas: '', head: '', penggerak: '', daya: '' }); renderPompa(); save(); };

  // baris pemeriksaan bernilai M/C/T
  const SEC_FIELDS = {
    dokumen: [['ket', 'Keterangan']], rumah: [['ket', 'Keterangan']], siamese: [['ket', 'Keterangan']],
    ujiPompa: [['tekanan', 'Tekanan terukur (kg/cm²)'], ['setting', 'Setting rancangan']],
    listrik: [['ket', 'Hasil ukur / temuan'], ['kriteria', 'Kriteria']],
  };
  function crowHtml(sec, r, i) {
    const bad = r.hasil === 'C' || r.hasil === 'T';
    const fld = (k, l) => `<label class="field"><span>${l}</span><input type="text" id="cr-${sec}-${i}-${k}" data-sec="${sec}" data-ri="${i}" data-k="${k}" value="${esc(r[k])}"></label>`;
    const extra = [sec === 'ujiPompa' ? ['ket', 'Temuan'] : null, ['rek', 'Rekomendasi'], ['batas', 'Batas waktu']].filter(Boolean);
    return `<div class="crow ${bad ? 'is' + r.hasil : ''}" data-row="${sec}-${i}">
      <div class="crow-top"><span class="no">${i + 1}</span><span class="lbl">${esc(r.label)}${PD.crow(sec, i)}</span>
        <span class="seg mct" role="group" aria-label="Penilaian butir ${i + 1}">${['M', 'C', 'T'].map(v => `<button data-sec="${sec}" data-ri="${i}" data-hv="${v}" data-v="${v}" aria-pressed="${r.hasil === v}" title="${H_LABEL[v]}">${v === 'M' ? 'Memenuhi' : v === 'C' ? 'Catatan' : 'Tidak'}</button>`).join('')}</span></div>
      <div class="grid">${SEC_FIELDS[sec].map(([k, l]) => fld(k, l)).join('')}</div>
      <div class="grid" ${bad ? '' : 'hidden'}>${extra.map(([k, l]) => fld(k, l)).join('')}</div>
    </div>`;
  }
  function renderCrows() { $$('.crows[data-sec]').forEach(box => { const sec = box.dataset.sec; box.innerHTML = (S.hyd[sec] || []).map((r, i) => crowHtml(sec, r, i)).join(''); }); }
  const pumpPanel = $('#tab-h-pump');
  pumpPanel.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.sec && el.dataset.k) { S.hyd[el.dataset.sec][+el.dataset.ri][el.dataset.k] = el.value; save(); }
    else if (el.dataset.u3 != null) { S.hyd.uji3[+el.dataset.u3][el.dataset.k] = el.value; save(); renderU3Eval(); }
    else if (el.dataset.cap != null) { S.hyd.photos[+el.dataset.cap].caption = el.value; save(); }
  });
  pumpPanel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-hv]');
    if (b) { const sec = b.dataset.sec, i = +b.dataset.ri; const r = S.hyd[sec][i]; r.hasil = r.hasil === b.dataset.hv ? '' : b.dataset.hv; save(); const old = $(`[data-row="${sec}-${i}"]`); old.outerHTML = crowHtml(sec, r, i); return; }
    const d = e.target.closest('[data-phdel]');
    if (d) { const p = S.hyd.photos.splice(+d.dataset.phdel, 1)[0]; dropPhotos([p]); save(); renderGenPhotos(); }
  });
  pumpPanel.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.classList.contains('gen-ph')) { const files = [...el.files]; el.value = ''; await addPhotos(files, S.hyd.photos, `Riksa uji hidran · ${S.shared.klien.nama || ''} · ${now()}`); save(); renderGenPhotos(); }
  });
  function renderU3() {
    $('#h-uji3').innerHTML = S.hyd.uji3.map((r, i) => `<div class="u3"><span class="tt">${i + 1}. ${esc(r.titik)}</span>
      ${[['kode', 'Kode titik'], ['lokasi', 'Lokasi'], ['pitot', 'Pitot nozzle (kg/cm²)'], ['mano', 'Manometer pompa (kg/cm²)']].map(([k, l]) => `<label class="field"><span>${l}</span><input type="text" id="u3-${i}-${k}" data-u3="${i}" data-k="${k}" value="${esc(r[k])}" ${k === 'pitot' || k === 'mano' ? 'inputmode="decimal"' : ''}></label>`).join('')}
      <span class="pill" id="u3-res-${i}"></span></div>`).join('');
    renderU3Eval();
  }
  function renderU3Eval() {
    const ev = RH.uji3Eval(S.hyd);
    ev.rows.forEach((r, i) => { const el = $('#u3-res-' + i); if (!el) return; el.className = 'pill ' + (r.hasil ? 's-' + r.hasil : ''); el.textContent = r.hasil ? H_LABEL[r.hasil] : 'Belum diisi'; });
    $('#h-uji3-eval').textContent = ev.max != null ? `Tekanan tertinggi ${RH.fmtNum(ev.max, 1)} kg/cm² · titik terjauh ${ev.far != null ? RH.fmtNum(ev.far, 1) : '–'} kg/cm² · ${ev.ok ? 'memenuhi kriteria' : 'belum memenuhi kriteria'}` : '';
  }
  function renderWater() {
    const el = $('#h-water'); if (!el) return;
    const w = RH.water(S.hyd);
    el.innerHTML = w ? `<b>± ${RH.fmtNum(w.min)} menit</b><span>${RH.fmtNum(w.m3)} m³ ÷ ${RH.fmtNum(w.q)} L/menit</span><span class="pill s-${w.ok ? 'M' : 'T'}">${w.ok ? 'Memenuhi ≥ 30 menit' : 'Kurang dari 30 menit'}</span>` : '<span>Isi volume reservoir dan laju aliran rancangan di tab Data Laporan.</span>';
  }
  const renderGenPhotos = () => { $('#h-gen-photos').innerHTML = photoGrid(S.hyd.photos, 'Dokumentasi'); };
  function renderPump() { renderCrows(); renderU3(); renderWater(); renderGenPhotos(); }

  // titik hidran
  const hCounts = () => { const c = { M: 0, C: 0, T: 0 }; S.hyd.points.forEach(p => c[RH.statusOf(p)]++); return c; };
  const hTiles = (cl) => { const c = hCounts(); return tiles([['', 'Total titik', S.hyd.points.length], ['M', 'Memenuhi', c.M], ['C', 'Catatan', c.C], ['T', 'Tidak memenuhi', c.T]], cl, filt.hyd); };
  function renderPoints() {
    $('#h-stats').innerHTML = hTiles(true);
    const f = filt.hyd, q = f.q.trim().toLowerCase();
    const P = S.hyd.points;
    const list = P.map((u, i) => ({ u, i })).filter(({ u }) => (!q || (u.kode + ' ' + u.lokasi).toLowerCase().includes(q)) && (!f.s || RH.statusOf(u) === f.s));
    if (!P.length) { $('#h-list').innerHTML = `<div class="empty">Belum ada titik hidran. Tambahkan hidran gedung atau hidran halaman.</div>`; return; }
    if (!list.length) { $('#h-list').innerHTML = `<div class="empty">Tidak ada titik yang cocok dengan filter.</div>`; return; }
    $('#h-list').innerHTML = list.map(({ u, i }) => {
      const s = RH.statusOf(u), nf = RH.failed(u).length, np = (u.photos || []).length;
      return `<button class="unit" data-i="${i}"><span class="stripe ${s}"></span>
        <span class="body"><span class="top"><span class="code">${esc(u.kode)}</span><span class="loc">${esc(u.lokasi || 'Lokasi belum diisi')}</span></span>
        <span class="meta"><span class="kind">${u.jenis === 'halaman' ? 'Hidran halaman' : 'Hidran gedung'}</span>${np ? `<span>${np} foto</span>` : ''}</span></span>
        <span class="side"><span class="pill s-${s}">${H_LABEL[s]}</span>${nf ? `<span class="fails">${nf} butir ✗</span>` : ''}</span></button>`;
    }).join('');
  }
  $('#h-stats').addEventListener('click', (e) => { const b = e.target.closest('[data-sf]'); if (!b) return; filt.hyd.s = filt.hyd.s === b.dataset.sf ? '' : b.dataset.sf; renderPoints(); });
  $('#h-search').addEventListener('input', (e) => { filt.hyd.q = e.target.value; renderPoints(); });
  $('#h-list').addEventListener('click', (e) => { const b = e.target.closest('.unit'); if (b) openEditor('hyd', +b.dataset.i); });
  function newPoint(jenis) {
    return { id: uid(), kode: nextKode(S.hyd.points, jenis === 'halaman' ? 'HP-' : 'H-'), jenis, lokasi: '', checks: Array(jenis === 'halaman' ? 5 : 7).fill('v'), statusOverride: '', temuan: '', rekomendasi: '', batas: '', photos: [] };
  }
  function insertPoint(pt) {
    // simpan urut: hidran gedung dulu, lalu hidran halaman
    const P = S.hyd.points;
    let at = P.length;
    if (pt.jenis !== 'halaman') { const k = P.findIndex(x => x.jenis === 'halaman'); if (k >= 0) at = k; }
    P.splice(at, 0, pt); return at;
  }
  $$('[data-addpt]').forEach(b => b.onclick = () => { const i = insertPoint(newPoint(b.dataset.addpt)); save(); renderHeader(); renderPoints(); openEditor('hyd', i); });

  function renderHConcl() {
    $('#h-concl-list').innerHTML = RH.conclusions(S.hyd).map(x => `<li>${esc(x)}</li>`).join('');
    const F = RH.findings(S.hyd);
    $('#h-find-list').innerHTML = F.length ? F.map(f => `<li><span class="pill s-${f.s}">${f.s === 'T' ? 'Tidak' : 'Catatan'}</span> <b>${esc(f.bagian.replace('\n', ' · '))}</b> — ${esc(f.temuan)}</li>`).join('') : '<li>Tidak ada temuan.</li>';
    renderRekom('hyd'); renderImgs();
  }
  const flatHyd = () => ({ ...S.hyd, pjk3: S.shared.pjk3, klien: S.shared.klien });
  function renderHDl() {
    $('#h-stats-dl').innerHTML = hTiles(false);
    const H = S.hyd, ev = RH.uji3Eval(H);
    const nPh = H.photos.length + H.points.reduce((a, p) => a + (p.photos || []).length, 0);
    $('#h-ready').innerHTML = readyList([...commonReady(H),
      [H.points.length, `Titik hidran (${H.points.length})`],
      [H.ujiPompa.every(r => (r.tekanan || '').trim() && r.hasil), 'Uji fungsi pompa 7 langkah'],
      [ev.rows.every(r => r.hasil), 'Uji operasi hidran 3 titik'],
      [RH.water(H), 'Volume reservoir & laju aliran'],
      [[...H.dokumen, ...H.rumah, ...H.listrik].every(r => r.hasil), 'Penilaian dokumen, rumah pompa & listrik'],
      [nPh, `Foto dokumentasi (${nPh})`],
      [H.alat.every(a => !a.nama || a.sert), 'Nomor sertifikat kalibrasi peralatan']]);
  }

  // ================= FIRE ALARM =================
  const FA_FIELDS = {
    dokumen: [['ket', 'Keterangan']], panel: [['ket', 'Keterangan']],
    sumber: [['ket', 'Hasil ukur / temuan'], ['kriteria', 'Kriteria']],
    mcp: [['ket', 'Hasil ukur / temuan'], ['kriteria', 'Kriteria']],
    kabel: [['ket', 'Hasil ukur / temuan'], ['kriteria', 'Kriteria']],
    uji: [['ket', 'Hasil pengamatan']],
    interface: [['terpasang', 'Terpasang? (Ya / Tidak ada)'], ['ket', 'Keterangan']],
  };
  function faRowHtml(sec, r, i) {
    const bad = r.hasil === 'C' || r.hasil === 'T';
    const fld = (k, l) => `<label class="field"><span>${l}</span><input type="text" id="fr-${sec}-${i}-${k}" data-fsec="${sec}" data-ri="${i}" data-k="${k}" value="${esc(r[k])}"></label>`;
    return `<div class="crow ${bad ? 'is' + r.hasil : ''}" data-frow="${sec}-${i}">
      <div class="crow-top"><span class="no">${i + 1}</span><span class="lbl">${esc(r.label)}${PD.crow('fa_' + sec, i)}</span>
        <span class="seg mct" role="group" aria-label="Penilaian butir ${i + 1}">${['M', 'C', 'T'].map(v => `<button data-fsec="${sec}" data-ri="${i}" data-fhv="${v}" data-v="${v}" aria-pressed="${r.hasil === v}" title="${H_LABEL[v]}">${v === 'M' ? 'Memenuhi' : v === 'C' ? 'Catatan' : 'Tidak'}</button>`).join('')}</span></div>
      <div class="grid">${FA_FIELDS[sec].map(([k, l]) => fld(k, l)).join('')}</div>
      <div class="grid" ${bad ? '' : 'hidden'}>${[['rek', 'Rekomendasi'], ['batas', 'Batas waktu']].map(([k, l]) => fld(k, l)).join('')}</div>
    </div>`;
  }
  const renderFaCrows = () => $$('.fcrows').forEach(box => { const sec = box.dataset.fsec; box.innerHTML = (S.fa[sec] || []).map((r, i) => faRowHtml(sec, r, i)).join(''); });
  const fPhotoGrid = (list) => list.map((p, k) => `<div class="photo"><img src="${photoData.get(p.id) || ''}" alt="Dokumentasi ${k + 1}">
      <input type="text" id="fcap-${p.id}" data-fcap="${k}" value="${esc(p.caption)}" placeholder="Keterangan foto" aria-label="Keterangan foto">
      <button class="x" data-fphdel="${k}">Hapus foto</button></div>`).join('');
  const renderFGenPhotos = () => { $('#f-gen-photos').innerHTML = fPhotoGrid(S.fa.photos); };
  [$('#tab-f-sys'), $('#tab-f-test')].forEach(panel => {
    panel.addEventListener('input', (e) => {
      const el = e.target;
      if (el.dataset.fsec && el.dataset.k) { S.fa[el.dataset.fsec][+el.dataset.ri][el.dataset.k] = el.value; save(); }
      else if (el.dataset.fcap != null) { S.fa.photos[+el.dataset.fcap].caption = el.value; save(); }
    });
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('[data-fhv]');
      if (b) { const sec = b.dataset.fsec, i = +b.dataset.ri; const r = S.fa[sec][i]; r.hasil = r.hasil === b.dataset.fhv ? '' : b.dataset.fhv; save(); $(`[data-frow="${sec}-${i}"]`).outerHTML = faRowHtml(sec, r, i); return; }
      const d = e.target.closest('[data-fphdel]');
      if (d) { const p = S.fa.photos.splice(+d.dataset.fphdel, 1)[0]; dropPhotos([p]); save(); renderFGenPhotos(); }
    });
    panel.addEventListener('change', async (e) => {
      const el = e.target;
      if (el.classList.contains('fgen-ph')) { const files = [...el.files]; el.value = ''; await addPhotos(files, S.fa.photos, `Riksa uji Fire Alarm · ${S.shared.klien.nama || ''} · ${now()}`); save(); renderFGenPhotos(); }
    });
  });

  // data laporan: rekap perangkat
  function renderFaData() {
    const auto = RF.perangkat(S.fa);
    $('#f-perangkat').innerHTML = RF.PERANGKAT.map((nm, i) => {
      const x = S.fa.perangkat[i] || (S.fa.perangkat[i] = { jumlah: '', merk: '' });
      const ph = !String(x.jumlah).trim() && auto[i].jumlah ? auto[i].jumlah + ' (otomatis dari zona)' : 'Jumlah';
      return `<div class="fp-row"><span class="fplbl">${esc(nm)}</span>
        <input type="text" inputmode="numeric" id="fp-j-${i}" data-fp="${i}" data-k="jumlah" value="${esc(x.jumlah)}" placeholder="${esc(ph)}" aria-label="Jumlah ${esc(nm)}">
        <input type="text" id="fp-m-${i}" data-fp="${i}" data-k="merk" value="${esc(x.merk)}" placeholder="Merk / tipe" aria-label="Merk ${esc(nm)}"></div>`;
    }).join('');
  }
  $('#f-perangkat').addEventListener('input', (e) => { const el = e.target; if (el.dataset.fp != null) { S.fa.perangkat[+el.dataset.fp][el.dataset.k] = el.value; save(); } });

  // sistem & sumber daya
  function renderBat() {
    const el = $('#f-bat'); if (!el) return;
    const b = RF.battery(S.fa);
    el.innerHTML = b
      ? `<b>Minimum ± ${RF.fmtNum(b.min, 1)} Ah</b><span>1,25 × (${RF.fmtNum(b.iS, 2)} A × ${RF.fmtNum(b.jam)} jam + ${RF.fmtNum(b.iA, 2)} A × ${RF.fmtNum(b.mnt)} menit ÷ 60)</span>${b.cap != null ? `<span class="pill s-${b.ok ? 'M' : 'T'}">${b.ok ? 'Terpasang ' + RF.fmtNum(b.cap, 1) + ' Ah, memenuhi' : 'Terpasang ' + RF.fmtNum(b.cap, 1) + ' Ah, kurang'}</span>` : '<span>Isi kapasitas baterai terpasang.</span>'}`
      : '<span>Isi arus siaga dan arus alarm untuk menghitung kapasitas baterai minimum.</span>';
  }
  function renderFaSys() { renderFaCrows(); renderBat(); }
  function renderFaTest() { renderFaCrows(); renderFGenPhotos(); }

  // zona detektor
  const fCounts = () => { const c = { M: 0, C: 0, T: 0 }; S.fa.zones.forEach(z => c[RF.statusOf(z)]++); return c; };
  const fTiles = (cl) => { const c = fCounts(); return tiles([['', 'Total zona', S.fa.zones.length], ['M', 'Memenuhi', c.M], ['C', 'Catatan', c.C], ['T', 'Tidak memenuhi', c.T]], cl, filt.fa); };
  function recapText() {
    const t = RF.totals(S.fa);
    return t.du ? `Detektor: ${RF.fmtNum(t.tp)} terpasang · ${RF.fmtNum(t.du)} diuji · ${RF.fmtNum(t.bf)} berfungsi (${RF.fmtNum(t.pct, 1)}%) · ${RF.fmtNum(t.tidak)} tidak berfungsi` : '';
  }
  function renderZones() {
    $('#f-stats').innerHTML = fTiles(true);
    $('#f-recap').textContent = recapText();
    const f = filt.fa, q = f.q.trim().toLowerCase(), Z = S.fa.zones;
    const list = Z.map((u, i) => ({ u, i })).filter(({ u }) => (!q || (u.kode + ' ' + u.lokasi).toLowerCase().includes(q)) && (!f.s || RF.statusOf(u) === f.s));
    if (!Z.length) { $('#f-list').innerHTML = `<div class="empty">Belum ada zona. Tekan <b>+ Tambah zona</b> untuk mencatat zona detektor pertama.</div>`; return; }
    if (!list.length) { $('#f-list').innerHTML = `<div class="empty">Tidak ada zona yang cocok dengan filter.</div>`; return; }
    $('#f-list').innerHTML = list.map(({ u, i }) => {
      const s = RF.statusOf(u), nf = RF.failedChecks(u).length + (RF.badDet(u) ? 1 : 0), np = (u.photos || []).length;
      return `<button class="unit" data-i="${i}"><span class="stripe ${s}"></span>
        <span class="body"><span class="top"><span class="code">${esc(u.kode)}</span><span class="loc">${esc(u.lokasi || 'Lokasi belum diisi')}</span></span>
        <span class="meta"><span class="kind">${esc(u.jenis || '–')}</span><span class="mono">${esc(u.berfungsi || '–')} / ${esc(u.diuji || '–')} berfungsi</span>${np ? `<span>${np} foto</span>` : ''}</span></span>
        <span class="side"><span class="pill s-${s}">${H_LABEL[s]}</span>${nf ? `<span class="fails">${nf} masalah</span>` : ''}</span></button>`;
    }).join('');
  }
  $('#f-stats').addEventListener('click', (e) => { const b = e.target.closest('[data-sf]'); if (!b) return; filt.fa.s = filt.fa.s === b.dataset.sf ? '' : b.dataset.sf; renderZones(); });
  $('#f-search').addEventListener('input', (e) => { filt.fa.q = e.target.value; renderZones(); });
  $('#f-list').addEventListener('click', (e) => { const b = e.target.closest('.unit'); if (b) openEditor('fa', +b.dataset.i); });
  function newZone(from) {
    return { id: uid(), kode: nextKode(S.fa.zones, 'Z-'), lokasi: '', jenis: from ? from.jenis : RF.JENIS_OPT[0], terpasang: '', diuji: '', berfungsi: '', tinggi: from ? from.tinggi : '', jarak: from ? from.jarak : '', checks: Array(RF.PLC_ITEMS.length).fill('v'), statusOverride: '', temuan: '', rekomendasi: '', batas: '', photos: [] };
  }
  $('#f-add').onclick = () => { S.fa.zones.push(newZone(S.fa.zones[S.fa.zones.length - 1])); save(); renderHeader(); renderZones(); openEditor('fa', S.fa.zones.length - 1); };
  function faEditorHtml(u) {
    const nfld = (k, label) => `<label class="field"><span>${label}</span><input type="text" inputmode="numeric" id="u-${k}" data-u="${k}" value="${esc(u[k])}">${PD.e(k)}</label>`;
    return `<div class="section"><h2>Identitas zona</h2><div class="grid">
        ${fld(u, 'kode', 'Kode zona', 'Z-01')}${fld(u, 'lokasi', 'Lokasi / ruang', 'Gudang Barang Jadi')}
        <label class="field"><span>Jenis detektor</span><select id="u-fjenis" data-u="jenis">${RF.JENIS_OPT.map(j => `<option${j === u.jenis ? ' selected' : ''}>${j}</option>`).join('')}</select>${PD.e('fjenis')}</label>
        ${fld(u, 'tinggi', 'Tinggi plafon (m)', '3,0')}${fld(u, 'jarak', 'Jarak antar / luas pantau', '8 m / 64 m²')}
      </div></div>
      <div class="section"><h2>Hasil uji detektor</h2>
        <div class="grid">${nfld('terpasang', 'Jumlah terpasang')}${nfld('diuji', 'Jumlah diuji')}${nfld('berfungsi', 'Jumlah berfungsi')}</div>
        <div class="row" style="margin-top:10px"><button class="btn sm" id="f-allok">Semua diuji dan berfungsi</button><span class="savestate">Mengisi diuji dan berfungsi sama dengan jumlah terpasang</span></div></div>
      ${photoSection('Masuk ke Lampiran A setelah foto dokumentasi umum.', `<div class="how-block">${PD.block('fa-foto')}</div>`)}
      <div class="section"><h2>Pemeriksaan penempatan detektor</h2>
        <div class="how-block">${PD.block('ck-fa')}</div>
        <div class="row" style="margin-bottom:10px"><button class="btn sm" id="ck-all">Semua ✓</button><span class="savestate">Tekan ✗ pada butir yang tidak memenuhi</span></div>
        <div class="checks">${RF.PLC_ITEMS.map((it, k) => checkRow(k, it, '', u.checks[k], OPT2, PD.faItem(k))).join('')}</div></div>
      <div class="section"><h2>Penilaian & temuan</h2><div class="grid">
        <label class="field"><span>Penilaian</span><select id="u-statusOverride" data-u="statusOverride"><option value="">Otomatis dari hasil uji & checklist</option><option value="M">Memenuhi</option><option value="C">Catatan</option><option value="T">Tidak memenuhi</option></select><small class="savestate" id="ed-auto"></small>${PD.e('statusOverride_fa')}</label>
        <label class="field"><span>Batas waktu tindak lanjut</span><input type="text" id="u-batas" data-u="batas" value="${esc(u.batas)}" placeholder="Otomatis: ≤ 7 hari (Tidak) / ≤ 30 hari (Catatan)">${PD.e('batas')}</label>
        <label class="field wide"><span>Temuan</span><textarea id="u-temuan" data-u="temuan" rows="2">${esc(u.temuan)}</textarea>${PD.e('temuan')}</label>
        <label class="field wide"><span>Rekomendasi</span><textarea id="u-rekomendasi" data-u="rekomendasi" rows="2" placeholder="Otomatis bila dikosongkan">${esc(u.rekomendasi)}</textarea>${PD.e('rekomendasi')}</label>
      </div></div>
      <div class="row"><button class="btn sm" id="u-dup">Duplikat zona ini</button></div>`;
  }

  // kesimpulan & unduh
  function renderFConcl() {
    $('#f-concl-list').innerHTML = RF.conclusions(S.fa).map(x => `<li>${esc(x)}</li>`).join('');
    const F = RF.findings(S.fa);
    $('#f-find-list').innerHTML = F.length ? F.map(f => `<li><span class="pill s-${f.s}">${f.s === 'T' ? 'Tidak' : 'Catatan'}</span> <b>${esc(f.bagian.replace('\n', ' · '))}</b> — ${esc(f.temuan)}</li>`).join('') : '<li>Tidak ada temuan.</li>';
    renderRekom('fa'); renderImgs();
  }
  function renderFDl() {
    $('#f-stats-dl').innerHTML = fTiles(false);
    const A = S.fa, t = RF.totals(A);
    const nPh = A.photos.length + A.zones.reduce((a, z) => a + (z.photos || []).length, 0);
    $('#f-ready').innerHTML = readyList([...commonReady(A),
      [A.zones.length, `Zona detektor (${A.zones.length})`],
      [t.du > 0 && A.zones.every(z => z.diuji && z.berfungsi), 'Jumlah diuji dan berfungsi di setiap zona'],
      [[...A.dokumen, ...A.panel, ...A.sumber].every(r => r.hasil), 'Penilaian dokumen, panel dan sumber daya'],
      [RF.battery(A) && RF.battery(A).cap != null, 'Perhitungan kapasitas baterai'],
      [[...A.mcp, ...A.kabel].every(r => r.hasil), 'Penilaian MCP, alarm, pengkabelan dan pentanahan'],
      [A.uji.every(r => r.hasil), 'Uji fungsi sistem (simulasi)'],
      [nPh, `Foto dokumentasi (${nPh})`],
      [A.alat.every(a => !a.nama || a.sert), 'Nomor sertifikat kalibrasi peralatan']]);
  }

  // ---------- rekomendasi ----------
  function renderRekom(m) {
    const st = S[m], auto = !(st.rekomendasi && st.rekomendasi.some(x => x.trim()));
    const lines = auto ? (m === 'apar' ? RU.autoRecommendations(flatApar()) : m === 'fa' ? RF.autoRecommendations(S.fa) : RH.autoRecommendations(S.hyd)) : st.rekomendasi;
    const ta = $(`#${PFX[m]}-rekom`); ta.value = lines.join('\n');
    $(`#${PFX[m]}-rekom-mode`).textContent = auto ? 'Mode otomatis' : 'Diubah manual';
  }
  $$('.rekom').forEach(ta => ta.addEventListener('input', () => { S[ta.dataset.mod].rekomendasi = ta.value.split('\n'); $(`#${PFX[ta.dataset.mod]}-rekom-mode`).textContent = 'Diubah manual'; save(); }));
  $$('.rekom-reset').forEach(b => b.onclick = () => { S[b.dataset.mod].rekomendasi = null; save(); renderRekom(b.dataset.mod); });

  // ================= EDITOR (APAR & titik hidran) =================
  const edList = () => edit.mod === 'apar' ? S.apar.units : edit.mod === 'fa' ? S.fa.zones : S.hyd.points;
  const edItem = () => edList()[edit.i];
  function openEditor(m, i) { edit = { mod: m, i }; $('#sheet').hidden = false; document.body.style.overflow = 'hidden'; renderEditor(); $('#ed-body').scrollTop = 0; }
  function closeEditor() { $('#sheet').hidden = true; document.body.style.overflow = ''; const m = edit && edit.mod; edit = null; if (m === 'apar') renderUnits(); else if (m === 'fa') renderZones(); else renderPoints(); renderHeader(); }
  $('#ed-close').onclick = closeEditor;
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeEditor(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').hidden) closeEditor(); });
  $('#ed-prev').onclick = () => { if (edit.i > 0) openEditor(edit.mod, edit.i - 1); };
  $('#ed-next').onclick = () => {
    const L = edList();
    if (edit.i < L.length - 1) return openEditor(edit.mod, edit.i + 1);
    if (edit.mod === 'apar') { L.push(newUnit(L[edit.i])); save(); renderHeader(); openEditor('apar', L.length - 1); }
    else if (edit.mod === 'fa') { L.push(newZone(L[edit.i])); save(); renderHeader(); openEditor('fa', L.length - 1); }
    else { const i = insertPoint(newPoint(edItem().jenis)); save(); renderHeader(); openEditor('hyd', i); }
  };
  function updateEdStatus() {
    const u = edItem(); if (!u) return;
    const isA = edit.mod === 'apar', isF = edit.mod === 'fa';
    const s = isA ? RU.statusOf(u) : isF ? RF.statusOf(u) : RH.statusOf(u);
    const pill = $('#ed-status'); pill.className = 'pill s-' + s; pill.textContent = isA ? RU.STATUS_LABEL[s] : H_LABEL[s];
    $('#ed-title').textContent = u.kode || (isA ? 'APAR' : isF ? 'Zona' : 'Hidran');
    const auto = $('#ed-auto'); if (auto) auto.textContent = 'Otomatis: ' + (isA ? RU.STATUS_LABEL[RU.autoStatus(u)] : H_LABEL[(isF ? RF : RH).autoStatus(u)]);
    $$('.ck').forEach((row, k) => row.classList.toggle('isx', u.checks[k] === 'x'));
    const tp = $('#u-temuan'); if (tp) tp.placeholder = (isA ? RU.autoTemuan(u) : isF ? RF.autoTemuan(u) : RH.autoTemuan(u)) || 'Tidak ada temuan';
  }
  const fld = (u, k, label, ph = '') => `<label class="field"><span>${label}</span><input type="text" id="u-${k}" data-u="${k}" value="${esc(u[k])}" placeholder="${esc(ph)}">${PD.e(k)}</label>`;
  const photoSection = (hint, how = '') => `<div class="section"><h2>Foto dokumentasi</h2><p class="hint">${hint}</p>${how}
      <div class="row">
        <label class="btn primary filebtn">Ambil foto<input type="file" id="ph-cam" accept="image/*" capture="environment"></label>
        <label class="btn filebtn">Pilih dari galeri<input type="file" id="ph-gal" accept="image/*" multiple></label>
        <label class="check-inline"><input type="checkbox" id="ph-stamp" ${stampOn ? 'checked' : ''}> Cap waktu</label>
      </div><div class="photos" id="ph-list"></div></div>`;
  const checkRow = (k, label, sub, val, opts, hw = '') => `<div class="ck"><span class="no">${k + 1}</span><span class="lbl">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}${hw}</span>
      <span class="seg" role="group" aria-label="Butir ${k + 1}">${opts.map(([v, s, t]) => `<button data-ck="${k}" data-v="${v}" aria-pressed="${val === v}" title="${t}" aria-label="${t}">${s}</button>`).join('')}</span></div>`;
  const OPT3 = [['v', '✓', 'Memenuhi'], ['x', '✗', 'Tidak memenuhi'], ['na', '–', 'Tidak berlaku']];
  const OPT2 = OPT3.slice(0, 2);
  function renderEditor() {
    const u = edItem(), isA = edit.mod === 'apar', L = edList();
    $('#ed-prev').disabled = edit.i === 0;
    $('#ed-next').textContent = edit.i === L.length - 1 ? (isA ? '+ Unit berikutnya' : edit.mod === 'fa' ? '+ Zona berikutnya' : '+ Titik berikutnya') : 'Berikutnya →';
    let html;
    if (isA) {
      const hy = u.hydro || (u.hydro = { ...HYDRO_DEFAULT });
      const hf = (k, label) => `<label class="field"><span>${label}</span><input type="text" id="h-${k}" data-h="${k}" value="${esc(hy[k])}">${PD.e(k)}</label>`;
      html = `<div class="section"><h2>Identitas unit</h2><div class="grid">
          ${fld(u, 'kode', 'Kode', 'APAR-01')}${fld(u, 'lokasi', 'Lokasi', 'Gudang Bahan Baku A')}
          <label class="field"><span>Media</span><select id="u-media" data-u="media">${MEDIA.map(m => `<option${m === u.media ? ' selected' : ''}>${m}</option>`).join('')}</select>${PD.e('media')}</label>
          ${fld(u, 'kap', 'Kapasitas', '6 kg')}${fld(u, 'merk', 'Merk')}${fld(u, 'thn', 'Tahun produksi', '2023')}${fld(u, 'isiUlang', 'Isi ulang terakhir', 'MM/YYYY')}${fld(u, 'bacaan', 'Tekanan / berat isi', '14 bar (hijau)')}
        </div></div>
        ${photoSection('Masuk ke Lampiran A. Foto dikompres dan diberi cap kode, lokasi serta waktu.', `<div class="how-block">${PD.block('apar-foto')}</div>`)}
        <div class="section"><h2>Checklist PER.04/MEN/1980</h2>
          <div class="how-block">${PD.block('ck-apar')}</div>
          <div class="row" style="margin-bottom:10px"><button class="btn sm" id="ck-all">Semua ✓</button><span class="savestate">Tekan ✗ pada butir yang tidak memenuhi</span></div>
          <div class="checks">${RU.ITEMS.map((it, k) => checkRow(k, it[0], it[1], u.checks[k], OPT3, PD.aparItem(k))).join('')}</div></div>
        <div class="section"><h2>Status & temuan</h2><div class="grid">
          <label class="field"><span>Status</span><select id="u-statusOverride" data-u="statusOverride"><option value="">Otomatis dari checklist</option><option value="L">Layak</option><option value="LC">Layak dengan catatan</option><option value="TL">Tidak Layak</option></select><small class="savestate" id="ed-auto"></small>${PD.e('statusOverride_apar')}</label>
          <label class="field"><span>Batas waktu tindak lanjut</span><input type="text" id="u-batas" data-u="batas" value="${esc(u.batas)}" placeholder="Otomatis: ≤ 7 hari (TL) / ≤ 30 hari (LC)">${PD.e('batas')}</label>
          <label class="field wide"><span>Temuan</span><textarea id="u-temuan" data-u="temuan" rows="2">${esc(u.temuan)}</textarea>${PD.e('temuan')}</label>
          <label class="field wide"><span>Rekomendasi</span><textarea id="u-rekomendasi" data-u="rekomendasi" rows="2" placeholder="Otomatis bila dikosongkan">${esc(u.rekomendasi)}</textarea>${PD.e('rekomendasi')}</label>
        </div></div>
        <div class="section"><h2>Percobaan tekan (hidrostatik)</h2>
          <label class="check-inline"><input type="checkbox" id="h-done" ${hy.done ? 'checked' : ''}> Unit ini diuji hidrostatik pada riksa uji ini (jatuh tempo 5 tahun, Pasal 15)</label>${PD.e('h-done') ? `<div style="margin-top:4px">${PD.e('h-done')}</div>` : ''}
          <div class="grid" id="h-fields" style="margin-top:12px" ${hy.done ? '' : 'hidden'}>
            ${hf('kerja', 'Tekanan kerja')}${hf('coba', 'Tekanan coba')}${hf('durasi', 'Durasi')}${hf('bocor', 'Kebocoran')}${hf('deformasi', 'Deformasi')}
            <label class="field"><span>Hasil</span><select id="h-hasil" data-h="hasil"><option${hy.hasil !== 'Gagal' ? ' selected' : ''}>Lulus</option><option${hy.hasil === 'Gagal' ? ' selected' : ''}>Gagal</option></select>${PD.e('hasil')}</label>
          </div></div>
        <div class="row"><button class="btn sm" id="u-dup">Duplikat unit ini</button></div>`;
    } else if (edit.mod === 'fa') {
      html = faEditorHtml(u);
    } else {
      const items = RH.itemsOf(u);
      html = `<div class="section"><h2>Identitas titik</h2><div class="grid">
          ${fld(u, 'kode', 'Kode', u.jenis === 'halaman' ? 'HP-01' : 'H-01')}${fld(u, 'lokasi', 'Lokasi', 'Gudang Bahan Baku A')}
          <label class="field"><span>Jenis</span><select id="u-jenis" data-u="jenis"><option value="gedung"${u.jenis !== 'halaman' ? ' selected' : ''}>Hidran gedung (kotak hidran)</option><option value="halaman"${u.jenis === 'halaman' ? ' selected' : ''}>Hidran halaman (pilar)</option></select>${PD.e('jenis')}</label>
        </div></div>
        ${photoSection('Masuk ke Lampiran A setelah foto dokumentasi umum.', `<div class="how-block">${PD.block('hyd-foto')}</div>`)}
        <div class="section"><h2>Checklist ${u.jenis === 'halaman' ? 'hidran halaman' : 'kotak hidran'}</h2>
          <div class="how-block">${PD.block('ck-hyd')}</div>
          <div class="row" style="margin-bottom:10px"><button class="btn sm" id="ck-all">Semua ✓</button><span class="savestate">Tekan ✗ pada butir yang tidak memenuhi</span></div>
          <div class="checks">${items.map((it, k) => checkRow(k, it, '', u.checks[k], OPT2, PD.hydItem(u.jenis, k))).join('')}</div></div>
        <div class="section"><h2>Penilaian & temuan</h2><div class="grid">
          <label class="field"><span>Penilaian</span><select id="u-statusOverride" data-u="statusOverride"><option value="">Otomatis dari checklist</option><option value="M">Memenuhi</option><option value="C">Catatan</option><option value="T">Tidak memenuhi</option></select><small class="savestate" id="ed-auto"></small>${PD.e('statusOverride_hyd')}</label>
          <label class="field"><span>Batas waktu tindak lanjut</span><input type="text" id="u-batas" data-u="batas" value="${esc(u.batas)}" placeholder="Otomatis: ≤ 7 hari (Tidak) / ≤ 30 hari (Catatan)">${PD.e('batas')}</label>
          <label class="field wide"><span>Temuan</span><textarea id="u-temuan" data-u="temuan" rows="2">${esc(u.temuan)}</textarea>${PD.e('temuan')}</label>
          <label class="field wide"><span>Rekomendasi</span><textarea id="u-rekomendasi" data-u="rekomendasi" rows="2" placeholder="Otomatis bila dikosongkan">${esc(u.rekomendasi)}</textarea>${PD.e('rekomendasi')}</label>
        </div></div>
        <div class="row"><button class="btn sm" id="u-dup">Duplikat titik ini</button></div>`;
    }
    $('#ed-body').innerHTML = html;
    $('#u-statusOverride').value = u.statusOverride || '';
    renderEdPhotos(); updateEdStatus();
    inlineConfirm($('#ed-del-slot'), isA ? 'Hapus unit' : edit.mod === 'fa' ? 'Hapus zona' : 'Hapus titik', `Hapus ${u.kode}?`, () => { dropPhotos(u.photos); edList().splice(edit.i, 1); save(); closeEditor(); }, 'btn sm ghost danger');
  }
  const renderEdPhotos = () => { const u = edItem(); $('#ph-list').innerHTML = photoGrid(u.photos || [], 'Foto ' + u.kode); };
  const edBody = $('#ed-body');
  edBody.addEventListener('input', (e) => {
    const el = e.target, u = edItem(); if (!u) return;
    if (el.dataset.u && el.tagName !== 'SELECT') { u[el.dataset.u] = el.value; if (el.dataset.u === 'kode') renderHeader(); updateEdStatus(); save(); }
    else if (el.dataset.h && el.tagName !== 'SELECT') { u.hydro[el.dataset.h] = el.value; save(); }
    else if (el.dataset.cap != null) { u.photos[+el.dataset.cap].caption = el.value; save(); }
  });
  edBody.addEventListener('change', async (e) => {
    const el = e.target, u = edItem(); if (!u) return;
    if (el.id === 'u-media') {
      u.media = el.value; const powder = /^Powder/.test(u.media);
      if (!powder && u.checks[12] === 'v') u.checks[12] = 'na'; if (powder && u.checks[12] === 'na') u.checks[12] = 'v';
      $$('[data-ck="12"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === u.checks[12]))); updateEdStatus(); save();
    } else if (el.id === 'u-jenis') {
      u.jenis = el.value; u.checks = Array(u.jenis === 'halaman' ? 5 : 7).fill('v'); save(); renderEditor();
    } else if (el.id === 'u-fjenis') { u.jenis = el.value; save(); }
    else if (el.id === 'u-statusOverride') { u.statusOverride = el.value; updateEdStatus(); save(); }
    else if (el.id === 'h-hasil') { u.hydro.hasil = el.value; save(); }
    else if (el.id === 'h-done') { u.hydro.done = el.checked; $('#h-fields').hidden = !el.checked; save(); }
    else if (el.id === 'ph-stamp') stampOn = el.checked;
    else if (el.id === 'ph-cam' || el.id === 'ph-gal') {
      const files = [...el.files]; el.value = '';
      await addPhotos(files, u.photos, stampOn ? `${u.kode} · ${u.lokasi || ''} · ${now()}` : null);
      save(); renderEdPhotos(); const ins = $$('#ph-list input'); if (ins.length) ins[ins.length - 1].focus();
    }
  });
  edBody.addEventListener('click', (e) => {
    const u = edItem(); if (!u) return;
    const ck = e.target.closest('[data-ck]');
    if (ck) { const k = +ck.dataset.ck; u.checks[k] = ck.dataset.v; $$(`[data-ck="${k}"]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === u.checks[k]))); updateEdStatus(); save(); return; }
    if (e.target.id === 'ck-all') {
      u.checks = u.checks.map((v, k) => (edit.mod === 'apar' && k === 12 && !/^Powder/.test(u.media)) ? 'na' : 'v');
      $$('[data-ck]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === u.checks[+b.dataset.ck]))); updateEdStatus(); save(); return;
    }
    const del = e.target.closest('[data-phdel]');
    if (del) { const p = u.photos.splice(+del.dataset.phdel, 1)[0]; dropPhotos([p]); save(); renderEdPhotos(); return; }
    if (e.target.id === 'f-allok') { u.diuji = u.terpasang; u.berfungsi = u.terpasang; save(); $('#u-diuji').value = u.diuji; $('#u-berfungsi').value = u.berfungsi; updateEdStatus(); return; }
    if (e.target.id === 'u-dup') {
      const c = JSON.parse(JSON.stringify(u)); c.id = uid(); c.photos = []; c.lokasi = '';
      if (edit.mod === 'fa') { c.kode = nextKode(S.fa.zones, 'Z-'); S.fa.zones.splice(edit.i + 1, 0, c); save(); renderHeader(); openEditor('fa', edit.i + 1); }
      else if (edit.mod === 'apar') { c.kode = nextKode(S.apar.units, 'APAR-'); S.apar.units.splice(edit.i + 1, 0, c); save(); renderHeader(); openEditor('apar', edit.i + 1); }
      else { c.kode = nextKode(S.hyd.points, c.jenis === 'halaman' ? 'HP-' : 'H-'); S.hyd.points.splice(edit.i + 1, 0, c); save(); renderHeader(); openEditor('hyd', edit.i + 1); }
    }
  });

  // ================= UNDUH & CADANGAN =================
  let docxP = null;
  function ensureDocx() {
    if (window.docx) return Promise.resolve(window.docx);
    if (docxP) return docxP;
    const urls = ['vendor/docx.iife.js', 'https://cdn.jsdelivr.net/npm/docx@9.7.1/dist/index.iife.js', 'https://unpkg.com/docx@9.7.1/dist/index.iife.js'];
    docxP = urls.reduce((p, url) => p.catch(() => new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = () => window.docx ? res(window.docx) : rej(); s.onerror = rej; document.head.appendChild(s); })), Promise.reject())
      .catch(() => { docxP = null; throw new Error('Pustaka Word gagal dimuat. Periksa koneksi internet lalu coba lagi.'); });
    return docxP;
  }
  // salin state dan tempelkan data foto
  function withData(obj) {
    const c = JSON.parse(JSON.stringify(obj));
    const walk = (o) => {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o && typeof o === 'object') { if (o.id && typeof o.w === 'number' && photoData.get(o.id)) o.data = photoData.get(o.id); Object.values(o).forEach(walk); }
    };
    walk(c); return c;
  }
  const cleanPhotos = (arr) => (arr || []).filter(p => p.data);
  async function saveFile(filename, blob) {
    if (window.claude && typeof window.claude.use === 'function') {
      const dl = await window.claude.use('downloads');
      if (dl) {
        try { await dl.save({ filename, data: blob }); return 'saved'; }
        catch (e) {
          if (e && e.code === 'declined') return 'declined';
          if (e && e.code === 'rate_limited') throw new Error('Jendela unduhan lain masih terbuka. Tutup dulu, lalu coba lagi.');
          throw new Error('Unduhan tidak tersedia di tampilan ini.');
        }
      }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return 'saved';
  }
  const safeName = (s) => (s || 'tanpa-nomor').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_').slice(0, 80);
  const sizeTxt = (n) => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  // membuat file Word satu modul dari berkas b (dipakai tombol Unduh dan pengiriman ke Google Drive)
  async function makeDocx(m, b) {
    await loadPhotosFor(b[m]); await loadPhotosFor(b.shared); if (G.pjk3) await loadPhotosFor(G.pjk3);
      const D = await ensureDocx();
      const shared = withData(b.shared);
      let doc, name;
      if (m === 'apar') {
        const a = withData(b.apar); a.units.forEach(u => { u.photos = cleanPhotos(u.photos); });
        if (a.rekomendasi && !a.rekomendasi.some(x => x.trim())) a.rekomendasi = null;
        doc = RU.buildReport({ ...a, pjk3: shared.pjk3, klien: shared.klien }, D); name = `Laporan_Riksa_Uji_APAR_${safeName(b.apar.meta.nomor)}.docx`;
      } else if (m === 'fa') {
        const f = withData(b.fa); f.photos = cleanPhotos(f.photos); f.zones.forEach(z => { z.photos = cleanPhotos(z.photos); });
        if (f.rekomendasi && !f.rekomendasi.some(x => x.trim())) f.rekomendasi = null;
        doc = RF.buildFireAlarm({ ...f, pjk3: shared.pjk3, klien: shared.klien }, D); name = `Laporan_Riksa_Uji_FireAlarm_${safeName(b.fa.meta.nomor)}.docx`;
      } else {
        const h = withData(b.hyd); h.photos = cleanPhotos(h.photos); h.points.forEach(p => { p.photos = cleanPhotos(p.photos); });
        doc = RH.buildHydrant({ ...h, pjk3: shared.pjk3, klien: shared.klien }, D); name = `Laporan_Riksa_Uji_Hidran_${safeName(b.hyd.meta.nomor)}.docx`;
      }
    const blob = await D.Packer.toBlob(doc);
    return { blob, name };
  }
  $$('.dl-docx').forEach(btn => btn.onclick = async () => {
    const m = btn.dataset.mod, msg = $(`#${PFX[m]}-dl-msg`);
    btn.disabled = true; msg.className = 'msg'; msg.textContent = 'Menyiapkan dokumen…';
    try {
      const { blob, name } = await makeDocx(m, S);
      const r = await saveFile(name, blob);
      msg.textContent = r === 'declined' ? 'Unduhan dibatalkan.' : `Laporan dibuat (${sizeTxt(blob.size)}).`;
    } catch (e) { msg.className = 'msg err'; msg.textContent = e.message || 'Gagal membuat dokumen.'; }
    btn.disabled = false;
  });
  $('#bk-save').onclick = async () => {
    const msg = $('#bk-msg'); msg.className = 'msg';
    try {
      await flush();
      const r = await saveFile(`Cadangan_Riksa_Uji_${safeName(S.shared.klien.nama)}.json`, new Blob([JSON.stringify({ app: 'riksa-uji-kebakaran', ...withData(S) })], { type: 'application/json' }));
      msg.textContent = r === 'declined' ? 'Dibatalkan.' : 'Cadangan berkas ini disimpan.';
    } catch (e) { msg.className = 'msg err'; msg.textContent = e.message; }
  };

  // ================= LAYAR =================
  function showScreen(name) {
    ['login', 'list', 'edit'].forEach(n => { $('#screen-' + n).hidden = n !== name; });
    window.scrollTo({ top: 0 });
  }
  const me = () => (G.session && G.session.user) || null;
  const isDemo = () => !!(G.session && G.session.demo);

  // ================= LOGIN (akun petugas ruangk3.com, Firebase Auth) =================
  let loginReturn = null; // 'edit' bila masuk ulang di tengah pengiriman
  const FB = () => window.RiksaFB || null;
  function whenFB(ms = 20000) {
    return new Promise((res, rej) => {
      if (FB()) return res(FB());
      const t = setTimeout(() => rej(Object.assign(new Error('Layanan akun ruangk3.com belum termuat. Periksa koneksi lalu buka ulang aplikasi.'), { code: 'network' })), ms);
      window.addEventListener('riksa-fb-ready', () => { clearTimeout(t); res(FB()); }, { once: true });
    });
  }
  const setMsg = (sel, text, err) => { const m = $(sel); m.className = 'msg' + (err ? ' err' : ''); m.textContent = text || ''; };
  function openLogin(message, ret = null) {
    loginReturn = ret;
    $('#login-user').value = (me() && !isDemo() && me().email) || G.lastUser || '';
    $('#login-pass').value = '';
    setMsg('#login-msg', message, !!message);
    $('#login-cancel').hidden = !ret;
    $('#login-preview').hidden = !(window.claude && typeof window.claude.use === 'function');
    showScreen('login');
  }
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#login-go');
    const email = $('#login-user').value.trim().toLowerCase(), password = $('#login-pass').value;
    if (!email || !password) return setMsg('#login-msg', 'Isi email dan password.', true);
    btn.disabled = true; setMsg('#login-msg', 'Menghubungi ruangk3.com…');
    const prevUid = me() && !isDemo() && me().uid;
    try {
      const fb = await whenFB();
      const r = await fb.login(email, password);
      G.session = { user: { uid: r.uid, username: r.uid, email: r.email, nama: r.nama, role: 'petugas' }, at: Date.now() };
      G.lastUser = r.email;
      await saveG();
      $('#login-pass').value = '';
      if (loginReturn === 'edit' && S && prevUid === r.uid) { showScreen('edit'); renderSync(); }
      else { if (S) { await flush(); S = null; } renderList(); showScreen('list'); }
      processQueue();
    } catch (err) { setMsg('#login-msg', err.message, true); }
    btn.disabled = false;
  });
  $('#login-forgot').onclick = async () => {
    const email = $('#login-user').value.trim().toLowerCase();
    if (!email) return setMsg('#login-msg', 'Isi email akun Anda dulu, lalu tekan "Lupa password?".', true);
    try { const fb = await whenFB(); await fb.resetPassword(email); setMsg('#login-msg', `Tautan untuk membuat password baru dikirim ke ${email}. Periksa juga folder spam.`); }
    catch (err) { setMsg('#login-msg', err.message, true); }
  };
  $('#login-demo').onclick = async () => {
    G.session = { demo: true, user: { uid: 'demo', username: 'demo', nama: 'Mode demo', role: 'petugas' } };
    await saveG(); renderList(); showScreen('list');
  };
  $('#login-cancel').onclick = () => { showScreen('edit'); renderSync(); };

  // ================= AKUN =================
  $('#acct-btn').onclick = () => { const p = $('#acct-panel'); p.hidden = !p.hidden; renderAcct(); };
  function renderAcct() {
    const u = me(); if (!u) return;
    $('#acct-name').textContent = u.nama || u.email || u.username;
    $('#acct-meta').textContent = isDemo() ? 'Mode demo · data hanya tersimpan di perangkat ini dan tidak bisa dikirim' : `${u.email} · Petugas riksa uji ruangk3.com`;
    $('#pw-form').hidden = isDemo();
  }
  $('#acct-logout').onclick = async () => {
    if (!isDemo()) { try { const fb = await whenFB(5000); await fb.logout(); } catch (e) { /* tetap keluar di perangkat */ } }
    G.session = null; await saveG(); $('#acct-panel').hidden = true; openLogin('');
  };
  $('#pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const o = $('#pw-old').value, n = $('#pw-new').value, c = $('#pw-new2').value;
    if (n.length < 8) return setMsg('#pw-msg', 'Password baru minimal 8 karakter.', true);
    if (n !== c) return setMsg('#pw-msg', 'Konfirmasi password tidak sama.', true);
    setMsg('#pw-msg', 'Menyimpan…');
    try { const fb = await whenFB(); await fb.changePassword(o, n); setMsg('#pw-msg', 'Password berhasil diganti.'); e.target.reset(); }
    catch (err) { if (err.code === 'session') return openLogin(err.message); setMsg('#pw-msg', err.message, true); }
  });

  // ================= DAFTAR BERKAS =================
  let listQ = '';
  const fmtTgl = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const fmtWaktu = (t) => new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  function syncPill(x, updatedAt) {
    if (x.pending) return '<span class="pill s-C">Menunggu dikirim</span>';
    if (!x.sentAt) return '<span class="pill s-none">Belum dikirim</span>';
    if (updatedAt > x.sentAt + 1000) return '<span class="pill s-C">Ada perubahan belum dikirim</span>';
    return `<span class="pill s-M">Terkirim ${esc(fmtWaktu(x.sentAt))}</span>`;
  }
  function visibleBerkas() {
    const u = me();
    return IDX.filter(b => !b.createdBy || !u || b.createdBy === u.username || u.role === 'admin');
  }
  function renderList() {
    const u = me();
    $('#acct-btn-name').textContent = u ? (u.nama || u.username) : '';
    renderAcct();
    const q = listQ.trim().toLowerCase();
    const all = visibleBerkas().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const list = all.filter(b => !q || `${b.klien} ${b.alamat} ${b.apar.nomor} ${b.hyd.nomor} ${(b.fa && b.fa.nomor) || ''}`.toLowerCase().includes(q));
    $('#list-count').textContent = `${all.length} berkas di perangkat ini`;
    if (!all.length) { $('#berkas-list').innerHTML = `<div class="empty">Belum ada berkas. Tekan <b>+ Berkas baru</b> untuk memulai riksa uji di satu perusahaan.</div>`; return; }
    if (!list.length) { $('#berkas-list').innerHTML = `<div class="empty">Tidak ada berkas yang cocok dengan pencarian.</div>`; return; }
    $('#berkas-list').innerHTML = list.map(b => {
      const mods = [];
      if (b.apar.has || b.apar.nomor) mods.push(`<div class="bmod"><span class="kind">APAR</span><span>${b.apar.n} unit${b.apar.nomor ? ' · <span class="mono">' + esc(b.apar.nomor) + '</span>' : ''}</span>${syncPill(b.apar, b.apar.editedAt || 0)}</div>`);
      if (b.hyd.has || b.hyd.nomor) mods.push(`<div class="bmod"><span class="kind">Hidran</span><span>${b.hyd.n} titik${b.hyd.nomor ? ' · <span class="mono">' + esc(b.hyd.nomor) + '</span>' : ''}</span>${syncPill(b.hyd, b.hyd.editedAt || 0)}</div>`);
      if (b.fa && (b.fa.has || b.fa.nomor)) mods.push(`<div class="bmod"><span class="kind">Fire Alarm</span><span>${b.fa.n} zona${b.fa.nomor ? ' · <span class="mono">' + esc(b.fa.nomor) + '</span>' : ''}</span>${syncPill(b.fa, b.fa.editedAt || 0)}</div>`);
      return `<div class="berkas" data-id="${b.id}">
        <button class="berkas-open" data-open="${b.id}">
          <span class="berkas-title">${esc(b.klien || 'Perusahaan belum diisi')}${b.sample ? ' <span class="kind">Contoh</span>' : ''}</span>
          <span class="berkas-sub">${esc([b.alamat, fmtTgl(b.tgl)].filter(Boolean).join(' · ') || 'Data perusahaan belum diisi')}</span>
          ${mods.join('') || '<span class="berkas-sub">Belum ada data riksa uji</span>'}
          <span class="berkas-sub">Diubah ${esc(fmtWaktu(b.updatedAt || Date.now()))}${b.createdByName && u && u.role === 'admin' ? ' · oleh ' + esc(b.createdByName) : ''}</span>
        </button>
        <div class="berkas-act"><span class="del-slot" data-del="${b.id}"></span></div>
      </div>`;
    }).join('');
    $$('#berkas-list .del-slot').forEach(slot => {
      const b = IDX.find(x => x.id === slot.dataset.del);
      inlineConfirm(slot, 'Hapus', `Hapus berkas ${b.klien || 'ini'} dari perangkat?`, () => deleteBerkas(b.id), 'btn sm ghost danger');
    });
  }
  $('#list-search').addEventListener('input', (e) => { listQ = e.target.value; renderList(); });
  $('#berkas-list').addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) openBerkas(b.dataset.open); });
  async function openBerkas(id) {
    const b = await loadBerkas(id);
    if (!b) { alertList('Berkas tidak dapat dibuka.'); return; }
    const u = me();
    if (!b.createdBy && u && !isDemo()) { b.createdBy = u.username; b.createdByName = u.nama; }
    b.shared.pjk3 = G.pjk3;
    S = b;
    for (const k of [...photoData.keys()]) if (!G.pjk3.logo || k !== G.pjk3.logo.id) photoData.delete(k);
    await loadPhotosFor(S);
    edit = null; filt.apar = { q: '', s: '' }; filt.hyd = { q: '', s: '' }; filt.fa = { q: '', s: '' };
    $('#a-search').value = ''; $('#h-search').value = ''; $('#f-search').value = '';
    fillForm();
    showScreen('edit');
    setMod(S.mod === 'hyd' || S.mod === 'fa' ? S.mod : 'apar');
    $('#savestate').textContent = 'Berkas dibuka';
  }
  const alertList = (t) => { const m = $('#list-msg'); m.className = 'msg err'; m.textContent = t; };
  async function deleteBerkas(id) {
    const b = await loadBerkas(id);
    if (b) { photoRefs(berkasForDisk(b)).forEach(p => delPhoto(p.id)); }
    await kvDel('b:' + id); delete memBerkas[id];
    IDX = IDX.filter(x => x.id !== id); await kvPut('index', IDX).catch(() => {});
    renderList();
  }
  $('#berkas-new').onclick = async () => {
    const u = me(), today = new Date().toISOString().slice(0, 10);
    const last = IDX[0] ? await loadBerkas(IDX.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id) : null;
    const hyd = RH.blankModule(); if (last) hyd.alat = last.hyd.alat.map(a => ({ ...a }));
    const fa = RF.blankModule(); if (last && last.fa) fa.alat = last.fa.alat.map(a => ({ ...a }));
    const sa = RU.sampleState();
    const b = {
      id: uidLong(), version: 3, createdBy: u && !isDemo() ? u.username : null, createdByName: u && !isDemo() ? u.nama : '', createdAt: Date.now(), updatedAt: Date.now(), mod: 'apar',
      shared: { klien: { nama: '', alamat: '', alamatSingkat: '', cakupanArea: '', bidang: '', pengurus: '', jabatanPengurus: '', petugas: '', jumlahTK: '', klasifikasi: '' } },
      apar: { meta: { isSample: false, nomor: '', periode: '', tglMulai: today, tglSelesai: today, tglLaporan: today, kota: '', jenis: $('#a-jenis').options[0].value, sebelumnya: '' },
        alat: (last ? last.apar.alat : sa.alat).map(a => ({ ...a, sert: last ? a.sert : '' })), keteranganTabel: last ? last.apar.keteranganTabel : sa.keteranganTabel, units: [], rekomendasi: null, denah: null, sync: {} },
      hyd: { ...hyd, sync: {} }, fa: { ...fa, sync: {} },
    };
    await kvPut('b:' + b.id, berkasForDisk(b)).catch(() => { memBerkas[b.id] = b; });
    IDX.unshift(summarize(b)); await kvPut('index', IDX).catch(() => {});
    openBerkas(b.id);
  };
  $('#back-list').onclick = async () => { closeEditorIfOpen(); await flush(); S = null; renderList(); showScreen('list'); };
  function closeEditorIfOpen() { if (!$('#sheet').hidden) { $('#sheet').hidden = true; document.body.style.overflow = ''; edit = null; } }

  // pulihkan cadangan sebagai berkas baru
  $('#bk-load').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const msg = $('#list-msg'); msg.className = 'msg';
    try {
      const raw = JSON.parse(await f.text());
      const b = toBerkas(raw); if (!b) throw new Error();
      if (IDX.some(x => x.id === b.id)) { b.id = uidLong(); b.apar.sync = {}; b.hyd.sync = {}; b.fa.sync = {}; }
      const pj = b.shared.pjk3;
      if (pj && !G.pjk3.nama) { if (pj.logo && pj.logo.data) { photoData.set(pj.logo.id, pj.logo.data); await putPhoto(pj.logo.id, pj.logo.data); delete pj.logo.data; } G.pjk3 = { ...blankPjk3(), ...pj }; await saveG(); }
      delete b.shared.pjk3; delete b.app;
      for (const p of photoRefs(b)) if (p.data) { const nid = 'ph-' + uid(); await putPhoto(nid, p.data); p.id = nid; delete p.data; }
      const u = me(); if (!b.createdBy && u && !isDemo()) { b.createdBy = u.username; b.createdByName = u.nama; }
      b.updatedAt = Date.now();
      await kvPut('b:' + b.id, b); IDX.unshift(summarize(b)); await kvPut('index', IDX);
      renderList(); msg.textContent = `Cadangan dipulihkan: ${b.shared.klien.nama || 'berkas tanpa nama'}.`;
    } catch (err) { msg.className = 'msg err'; msg.textContent = 'File bukan cadangan Riksa Uji yang valid.'; }
  };

  // ================= KIRIM KE RUANGK3.COM =================
  // Tombol "Kirim" menandai laporan sebagai antrean (sync.pending). Antrean dikirim langsung bila
  // online, atau otomatis begitu sinyal kembali / aplikasi dibuka lagi. Foto yang sudah terkirim
  // dicatat di sync.photos supaya tidak dikirim ulang.
  const MOD_NAME = { apar: 'APAR', hyd: 'Hidran', fa: 'Fire Alarm' };
  const modCount = (m, x) => m === 'apar' ? x.units.length + ' unit' : m === 'fa' ? x.zones.length + ' zona' : x.points.length + ' titik';
  function renderSync() {
    if (!S) return;
    const demo = isDemo();
    $('#sync-rows').innerHTML = ['apar', 'hyd', 'fa'].map(m => {
      const x = S[m], has = hasData(m), sy = x.sync || {};
      const st = !has ? '<span class="pill s-none">Belum ada data</span>' : syncPill({ sentAt: sy.sentAt || 0, pending: sy.pending }, x.editedAt || 0);
      return `<div class="bmod"><span class="kind">${MOD_NAME[m]}</span><span>${modCount(m, x)}${x.meta.nomor ? ' · <span class="mono">' + esc(x.meta.nomor) + '</span>' : ''}</span>${st}${sy.rev ? `<span class="savestate">revisi ${sy.rev}</span>` : ''}</div>`;
    }).join('');
    $('#sync-who').textContent = demo ? 'Mode demo: masuk dengan akun petugas untuk mengirim laporan ke ruangk3.com.' : `Dikirim ke ruangk3.com atas nama ${me() ? me().nama : '–'}. Tanpa sinyal, laporan masuk antrean dan terkirim otomatis saat online.`;
    $('#sync-go').disabled = demo || !(hasData('apar') || hasData('hyd') || hasData('fa'));
  }
  function summaryFor(b, m) {
    const x = b[m], K = b.shared.klien;
    const tanggal = RU.fmtRange(x.meta.tglMulai, x.meta.tglSelesai);
    if (m === 'apar') {
      const c = { L: 0, LC: 0, TL: 0 }; x.units.forEach(u => c[RU.statusOf(u)]++);
      return { nomor: x.meta.nomor || '', perusahaan: K.nama || '', alamat: K.alamatSingkat || K.alamat || '', tanggal, tglMulai: x.meta.tglMulai || '', jumlah: `${x.units.length} unit`, ringkasan: `Layak ${c.L} · Dgn catatan ${c.LC} · Tidak layak ${c.TL}` };
    }
    if (m === 'fa') {
      const c = { M: 0, C: 0, T: 0 }; x.zones.forEach(z => c[RF.statusOf(z)]++); const tt = RF.totals(x);
      return { nomor: x.meta.nomor || '', perusahaan: K.nama || '', alamat: K.alamatSingkat || K.alamat || '', tanggal, tglMulai: x.meta.tglMulai || '', jumlah: `${x.zones.length} zona`, ringkasan: `Zona: memenuhi ${c.M} · catatan ${c.C} · tidak ${c.T}${tt.du ? ` · detektor berfungsi ${tt.bf}/${tt.du}` : ''}` };
    }
    const last = RH.conclusions(x).slice(-1)[0] || '';
    return { nomor: x.meta.nomor || '', perusahaan: K.nama || '', alamat: K.alamatSingkat || K.alamat || '', tanggal, tglMulai: x.meta.tglMulai || '', jumlah: `${x.points.length} titik`, ringkasan: last.split('. ')[0] };
  }
  async function persistBerkas(b) {
    if (S && b.id === S.id) { save(false); await flush(); return; }
    await kvPut('b:' + b.id, berkasForDisk(b));
    const sm = summarize(b); const k = IDX.findIndex(x => x.id === b.id); if (k >= 0) IDX[k] = sm; await kvPut('index', IDX);
  }
  // ---- penyimpanan Google Drive ----
  // Admin Pusat mengisi alamat Web App Apps Script di panel admin (disimpan di Firebase: riksa_pengaturan/drive).
  // Bila terisi, foto + isi laporan + file Word disimpan di Google Drive RuangK3 (folder per perusahaan & laporan);
  // Firebase hanya memegang ringkasan. Bila belum terisi, pengiriman memakai Firebase seperti sebelumnya.
  const DRIVE_URL_OK = /^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[\w-]+\/exec$/;
  async function getDriveUrl(fb) {
    try {
      const c = await fb.driveCfg();
      const url = c && DRIVE_URL_OK.test(c.url || '') ? c.url : '';
      await kvPut('driveCfg', { url }).catch(() => {});
      return url;
    } catch (e) {
      const c = await kvGet('driveCfg'); // tanpa sinyal: pakai yang terakhir diketahui
      return c && DRIVE_URL_OK.test(c.url || '') ? c.url : '';
    }
  }
  // tanggal berkas dibuat (yyyy-mm-dd, waktu perangkat): dipakai untuk nama folder Drive supaya tidak berubah-ubah
  const berkasTgl = (b) => { const d = new Date(b.createdAt || Date.now()); const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  async function driveApi(url, fb, action, payload, timeout = 90000) {
    let last;
    for (let t = 0; t < 3; t++) {
      const token = await fb.idToken();
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), timeout);
      try {
        const r = await fetch(url, { method: 'POST', redirect: 'follow', signal: ctl.signal, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ app: 'riksa', token, action, ...(payload || {}) }) });
        const j = await r.json().catch(() => { throw Object.assign(new Error('Jawaban Google Drive tidak terbaca. Minta admin memeriksa pengaturan Drive Riksa Uji.'), { code: 'drive' }); });
        if (!j.ok) throw Object.assign(new Error(j.error || 'Gagal menyimpan ke Google Drive.'), { code: 'drive' });
        return j;
      } catch (e) {
        if (e.name === 'AbortError') last = Object.assign(new Error('Koneksi ke Google Drive lambat atau terputus.'), { code: 'network' });
        else if (e instanceof TypeError) last = Object.assign(new Error('Tidak bisa terhubung ke Google Drive. Periksa sinyal.'), { code: 'network' });
        else if (e.code === 'drive' && /Lock|terlalu banyak|Service invoked/i.test(e.message)) last = e;
        else throw e;
      } finally { clearTimeout(tm); }
      await sleep(1500 * (t + 1));
    }
    throw last;
  }
  const blobToB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  // nama foto di Drive: "<unit/zona/titik> <urutan>__<id>.jpg"
  function photoLabels(b, m) {
    const map = {}, x = b[m];
    const put = (o, label) => { const a = photoRefs(o); a.forEach((p, i) => { if (!map[p.id]) map[p.id] = a.length > 1 ? `${label} ${i + 1}` : label; }); };
    const arr = m === 'apar' ? x.units : m === 'fa' ? x.zones : x.points;
    const pre = m === 'apar' ? 'APAR' : m === 'fa' ? 'Zona' : 'Hidran';
    (arr || []).forEach((it, k) => { const c = String(it.kode || it.no || it.nama || (k + 1)).slice(0, 20); put(it, c.toLowerCase().startsWith(pre.toLowerCase()) ? c : `${pre} ${c}`); });
    put(x, 'Umum');
    if (G.pjk3 && G.pjk3.logo) map[G.pjk3.logo.id] = 'Logo PJK3';
    return map;
  }
  async function sendBerkas(b, progress) {
    const fb = await whenFB();
    await fb.ready;
    if (!fb.isSignedIn() || fb.currentUid() !== (me() && me().uid)) throw Object.assign(new Error('Sesi berakhir. Masuk lagi untuk mengirim.'), { code: 'session' });
    const dataOf = async (id) => photoData.get(id) || await getPhoto(id);
    const driveUrl = await getDriveUrl(fb);
    const dest = driveUrl ? 'drive' : 'firebase';
    for (const m of ['apar', 'hyd', 'fa']) {
      const sy = b[m].sync || (b[m].sync = {});
      if (!hasData(m, b) || !sy.pending) continue;
      const reportId = `${b.id}-${m}`;
      const who = `${MOD_NAME[m]} ${b.shared.klien.nama || ''}`;
      if ((sy.dest || 'firebase') !== dest) sy.photos = {}; // foto lama ada di tempat penyimpanan yang berbeda: kirim ulang
      const done = sy.photos || (sy.photos = {});
      const refs = [...photoRefs(b[m]), ...(G.pjk3.logo ? [G.pjk3.logo] : [])];
      const todo = refs.filter(p => !done[p.id]);
      const modul = JSON.parse(JSON.stringify(b[m])); delete modul.sync;
      const report = { berkasId: b.id, jenis: m, modul, klien: b.shared.klien, pjk3: JSON.parse(JSON.stringify(G.pjk3)), versiAplikasi: 1 };
      let drive = null;
      if (driveUrl) {
        progress(`${who}: menyiapkan folder Google Drive…`);
        const pr = await driveApi(driveUrl, fb, 'prepare', { meta: { reportId, berkasId: b.id, perusahaan: b.shared.klien.nama || '', jenis: m, nomor: b[m].meta.nomor || '', tgl: berkasTgl(b) } });
        const labels = photoLabels(b, m);
        for (let k = 0; k < todo.length; k++) {
          const d = await dataOf(todo[k].id);
          if (d) { progress(`${who}: mengunggah foto ${k + 1} dari ${todo.length} ke Google Drive…`); await driveApi(driveUrl, fb, 'uploadPhoto', { reportId, photoId: todo[k].id, label: labels[todo[k].id] || '', dataUrl: d }); }
          done[todo[k].id] = true; sy.dest = dest; await persistBerkas(b);
        }
        progress(`${who}: menyimpan data laporan ke Google Drive…`);
        await driveApi(driveUrl, fb, 'saveData', { reportId, json: JSON.stringify(report) });
        let docx = false;
        try {
          progress(`${who}: membuat file Word…`);
          const { blob, name } = await makeDocx(m, b);
          progress(`${who}: mengunggah file Word (${sizeTxt(blob.size)})…`);
          await driveApi(driveUrl, fb, 'uploadDocx', { reportId, name, b64: await blobToB64(blob) }, 180000);
          docx = true;
        } catch (e) { if (e.code === 'network' || e.code === 'session') throw e; /* Word gagal dibuat: data & foto tetap aman, admin bisa membuatnya dari panel */ }
        drive = { folderId: pr.folderId, url: pr.url, docx };
      } else {
        for (let k = 0; k < todo.length; k++) {
          const d = await dataOf(todo[k].id);
          if (d) { progress(`${who}: mengunggah foto ${k + 1} dari ${todo.length}…`); await fb.uploadPhoto(reportId, todo[k].id, d); }
          done[todo[k].id] = true; sy.dest = dest; await persistBerkas(b);
        }
        progress(`${who}: mengirim data laporan…`);
      }
      const r = await fb.saveReport({ reportId, berkasId: b.id, jenis: m, summary: summaryFor(b, m), report, jumlahFoto: refs.length, drive });
      b[m].sync = { sentAt: Date.now(), rev: r.rev, photos: done, pending: false, dest };
      await persistBerkas(b);
    }
  }
  const sendErrorText = (err) => err.code === 'network' || navigator.onLine === false
    ? 'Koneksi terputus. Laporan tetap di antrean dan akan dikirim otomatis saat sinyal kembali.'
    : err.message;
  $('#sync-go').onclick = async () => {
    const btn = $('#sync-go');
    ['apar', 'hyd', 'fa'].forEach(m => { if (hasData(m)) { S[m].sync ??= {}; S[m].sync.pending = true; } });
    save(false); await flush(); renderSync();
    if (navigator.onLine === false) { setMsg('#sync-msg', 'Tidak ada sinyal. Laporan masuk antrean dan akan terkirim otomatis saat online.'); return; }
    btn.disabled = true; setMsg('#sync-msg', 'Menyiapkan pengiriman…');
    try { await sendBerkas(S, (t) => setMsg('#sync-msg', t)); setMsg('#sync-msg', ['apar', 'hyd', 'fa'].some(m => S[m].sync && S[m].sync.dest === 'drive' && Date.now() - (S[m].sync.sentAt || 0) < 120000) ? 'Laporan terkirim dan tersimpan di Google Drive RuangK3.' : 'Laporan terkirim ke ruangk3.com.'); }
    catch (err) {
      if (err.code === 'session') { setMsg('#sync-msg', ''); btn.disabled = false; return openLogin('Sesi berakhir. Masuk lagi untuk melanjutkan pengiriman.', 'edit'); }
      setMsg('#sync-msg', sendErrorText(err), true);
    }
    btn.disabled = false; renderSync();
  };

  // antrean otomatis
  let queueBusy = false;
  async function processQueue() {
    if (queueBusy || isDemo() || !me() || navigator.onLine === false) return;
    const mine = IDX.filter(x => (x.apar.pending || x.hyd.pending || (x.fa && x.fa.pending)) && (!x.createdBy || x.createdBy === me().uid));
    if (!mine.length) return;
    queueBusy = true;
    const show = (t, err) => setMsg(!$('#screen-edit').hidden ? '#sync-msg' : '#list-msg', t, err);
    try {
      for (const x of mine) {
        const b = (S && S.id === x.id) ? S : await loadBerkas(x.id);
        if (!b) continue;
        if (b !== S) b.shared.pjk3 = G.pjk3;
        await sendBerkas(b, (t) => show('Antrean: ' + t));
      }
      show(`Antrean terkirim ke ruangk3.com (${mine.length} berkas).`);
    } catch (err) {
      show(err.code === 'session' ? 'Ada laporan di antrean. Masuk ulang (menu Akun → Keluar, lalu masuk) untuk mengirimnya.' : sendErrorText(err), true);
    } finally {
      queueBusy = false;
      if (!$('#screen-list').hidden) renderList();
      if (!$('#screen-edit').hidden) renderSync();
    }
  }
  window.addEventListener('online', () => { if (S && !$('#screen-edit').hidden) renderSync(); setTimeout(processQueue, 1500); });
  setInterval(processQueue, 5 * 60 * 1000);

  // ---------- start ----------
  PD.decorate(); PD.apply(); const howBtn = $('#how-toggle'); if (howBtn) howBtn.onclick = PD.toggle;
  bootStorage().then(() => {
    if (me()) { renderList(); showScreen('list'); } else openLogin('');
    ensureDocx().catch(() => {});
    whenFB(30000).then(fb => fb.ready).then(() => processQueue()).catch(() => {});
  });
})();
