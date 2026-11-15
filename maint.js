/* Mode Pemeliharaan RuangK3 — dipasang di website, Portal PIC, Riksa Uji, dan halaman link peserta.
   Pakai:  <script src="/maint.js?v=1" data-page="web|pic|riksa|link" defer></script>
   Pengaturan dibaca dari Firebase RTDB lewat REST (tanpa SDK, satu permintaan kecil):
     artifacts/k3-kebakaran-app-v5/public/data/pengaturan_pemeliharaan
     = { aktif: bool, mulai: ms, selesai: ms, pesan: "", target: { web, pic, riksa, link }, t: ms }
   Aturan Firebase (dipasang Adrian):  "pengaturan_pemeliharaan": { ".read": true, ".write": "auth != null" }
   Saat aktif: halaman ditutup layar pemeliharaan + hitung mundur. Saat selesai / dimatikan: simpanan lama
   (cache & service worker) dibuang lalu halaman dimuat ulang -> versi terbaru.
   Website: pintu tersembunyi untuk Admin Utama = ketuk ikon roda gigi 5x dalam 3 detik. */
(function () {
  'use strict';
  var me = document.currentScript, PAGE = (me && me.getAttribute('data-page')) || 'web';
  var URL_ = 'https://portal-k3-bidang-kebakaran-default-rtdb.asia-southeast1.firebasedatabase.app/artifacts/k3-kebakaran-app-v5/public/data/pengaturan_pemeliharaan.json';
  var BY = 'rk3_maint_by'; // Admin Utama sudah lewat pintu tersembunyi di perangkat ini (berlaku sampai pemeliharaan selesai)
  var cfg = null, shown = false, root = null, timer = 0, pollT = 0, startT = 0, finishing = false;
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function zona() { var m = -new Date().getTimezoneOffset(); return m === 420 ? ' WIB' : m === 480 ? ' WITA' : m === 540 ? ' WIT' : ''; }
  function fmt(t) { var d = new Date(t); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() + ' · ' + p2(d.getHours()) + '.' + p2(d.getMinutes()) + zona(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

  function ambil() {
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(URL_ + '?_=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return undefined; }) // gagal / tanpa sinyal: biarkan keadaan sekarang
      .then(function (j) { clearTimeout(to); return j; });
  }
  function berlaku(c) { // pemeliharaan sedang berjalan untuk halaman ini?
    if (!c || c.aktif !== true) return false;
    var now = Date.now(), sel = +c.selesai || 0, mul = +c.mulai || 0;
    if (!sel || now >= sel || now < mul) return false;
    var tg = c.target; if (tg && typeof tg === 'object' && tg[PAGE] === false) return false;
    return true;
  }
  function lewat(c) { return PAGE === 'web' && c && (window.__rk3AdminUtama === true || (+ls(BY) >= (+c.selesai || 0) && (+c.selesai || 0) > 0)); } // Admin Utama yang sedang login tidak ditutup

  // ---------- tampilan ----------
  var CSS = '#rk3m{position:fixed;inset:0;z-index:2147483000;overflow:auto;background:radial-gradient(1200px 500px at 50% -10%,#1B2A44 0%,#0E1624 60%);color:#EEF2F7;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;display:flex;flex-direction:column;-webkit-text-size-adjust:100%}' +
    '#rk3m *{box-sizing:border-box}#rk3m .tp{height:14px;flex:none;background:repeating-linear-gradient(-45deg,#F5B700 0 18px,#111 18px 36px)}' +
    '#rk3m .in{flex:1;display:flex;align-items:center;justify-content:center;padding:32px max(16px,env(safe-area-inset-right,0px)) 32px max(16px,env(safe-area-inset-left,0px))}' +
    '#rk3m .cd0{width:min(740px,100%);text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px}' +
    '#rk3m .br{font-weight:700;color:#C3CCD8;font-size:14px;letter-spacing:.02em}' +
    '#rk3m .gr{width:76px;height:76px;color:#F5B700;border:0;background:none;padding:0;cursor:default;-webkit-tap-highlight-color:transparent}#rk3m .gr svg{width:100%;height:100%;animation:rk3sp 12s linear infinite}' +
    '@keyframes rk3sp{to{transform:rotate(360deg)}}@keyframes rk3pl{50%{opacity:.25}}' +
    '#rk3m .bd{display:inline-flex;align-items:center;gap:8px;border:1px solid #5C4A10;background:#2A2208;color:#F5B700;border-radius:999px;padding:5px 14px;font-size:12.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}' +
    '#rk3m .bd i{width:8px;height:8px;border-radius:50%;background:#F5B700;animation:rk3pl 1.6s ease-in-out infinite}' +
    '#rk3m h1{margin:0;font-size:clamp(24px,4.2vw,38px);line-height:1.15;font-weight:700;color:#EEF2F7}' +
    '#rk3m .ld{margin:0;max-width:60ch;color:#C3CCD8;font-size:15.5px}#rk3m .ps{margin:0;max-width:60ch;color:#F5D46B;font-size:14.5px}' +
    '#rk3m .cl{margin:4px 0 0;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;color:#8E9AAD;font-weight:600}' +
    '#rk3m .cd{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;width:min(500px,100%)}' +
    '#rk3m .u{background:#152033;border:1px solid #2A3A55;border-radius:10px;padding:12px 4px 9px;display:flex;flex-direction:column;align-items:center;gap:2px}' +
    '#rk3m .u b{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:clamp(28px,6vw,44px);font-weight:600;line-height:1;font-variant-numeric:tabular-nums;color:#EEF2F7}' +
    '#rk3m .u span{font-size:11.5px;color:#8E9AAD;letter-spacing:.06em;text-transform:uppercase}' +
    '#rk3m .bar{width:min(500px,100%);height:6px;border-radius:3px;background:#1C2A40;overflow:hidden}#rk3m .bar i{display:block;height:100%;background:#F5B700;border-radius:3px}' +
    '#rk3m .sc{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 18px;font-size:14px;color:#C3CCD8}#rk3m .sc b{color:#EEF2F7;font-weight:600}' +
    '#rk3m .nf{width:100%;max-width:520px;text-align:left;background:#152033;border:1px solid #2A3A55;border-radius:10px;padding:14px 16px;font-size:14px;color:#C3CCD8}#rk3m .nf b{display:block;color:#EEF2F7;margin-bottom:4px}' +
    '#rk3m .dn{border:1px solid #1E5B3C;background:#0F2A1D;color:#9BE3BF;border-radius:10px;padding:12px 16px;font-size:14px}' +
    '#rk3m .bt{min-height:44px;padding:0 18px;border-radius:10px;border:1px solid #2A3A55;background:#152033;color:#EEF2F7;font-weight:600;font-size:14px;cursor:pointer}' +
    '#rk3m .ft{color:#8E9AAD;font-size:13px;padding:16px;text-align:center;border-top:1px solid #2A3A55}' +
    '#rk3m .lg{position:fixed;inset:0;background:rgba(5,8,14,.72);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '#rk3m .lg form{width:min(360px,100%);background:#fff;color:#1F2328;border-radius:8px;padding:20px;display:flex;flex-direction:column;gap:10px;text-align:left}' +
    '#rk3m .lg input{border:1px solid #C4C9D1;border-radius:4px;padding:9px 10px;font-size:15px;color:#1F2328;width:100%}' +
    '#rk3m .lg .e{font-size:13px;color:#A1262C;min-height:18px}#rk3m .lg .a{display:flex;gap:8px;justify-content:flex-end}' +
    '#rk3m .lg button{height:38px;padding:0 16px;border-radius:4px;border:1px solid #C4C9D1;background:#fff;color:#1F2328;font-size:14px;cursor:pointer}#rk3m .lg button.p{background:#1F4E8C;border-color:#1F4E8C;color:#fff;font-weight:600}' +
    '#rk3m :focus-visible{outline:2px solid #F5B700;outline-offset:2px}' +
    '@media (prefers-reduced-motion:reduce){#rk3m .gr svg,#rk3m .bd i{animation:none}}' +
    '#rk3bar{position:fixed;left:0;right:0;top:0;z-index:2147482000;background:#F5B700;color:#1A1300;font:600 13.5px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;padding:7px max(16px,env(safe-area-inset-right,0px)) 7px max(16px,env(safe-area-inset-left,0px));box-shadow:0 2px 8px rgba(0,0,0,.18)}' +
    '#rk3bar b{font-family:ui-monospace,Menlo,Consolas,monospace}#rk3bar button{margin-left:auto;border:1px solid #1A1300;background:transparent;color:#1A1300;border-radius:3px;padding:3px 12px;font-weight:700;cursor:pointer}';
  var GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  function gaya() { if (document.getElementById('rk3m-css')) return; var st = document.createElement('style'); st.id = 'rk3m-css'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st); }

  function tampil() {
    gaya();
    var app = PAGE === 'pic' || PAGE === 'riksa';
    var judul = app ? 'Aplikasi Sedang Dalam Pemeliharaan' : 'Layanan Sedang Dalam Pemeliharaan';
    var lead = app ? (PAGE === 'pic' ? 'Portal PIC' : 'Aplikasi Riksa Uji') + ' sementara tidak dapat digunakan karena sedang dilakukan pemeliharaan sistem untuk meningkatkan kinerja, keamanan, dan keandalan layanan.'
      : 'Kami sedang melakukan pemeliharaan terjadwal untuk meningkatkan kinerja, keamanan, dan keandalan layanan RuangK3. Selama proses ini, website dan aplikasi untuk sementara tidak dapat diakses.';
    var info = app ? '<div class="nf"><b>Isian di HP tetap tersimpan</b>Data yang sudah Anda isi tersimpan aman di HP ini dan akan dikirim otomatis setelah layanan kembali normal. Mohon tidak menghapus data aplikasi.</div>'
      : '<div class="nf"><b>Data Anda tetap aman</b>Seluruh data kegiatan, peserta, dan laporan tersimpan dengan aman dan tidak terpengaruh oleh pemeliharaan ini.</div>';
    if (!root) {
      root = document.createElement('div'); root.id = 'rk3m'; root.setAttribute('role', 'alertdialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'rk3m-t');
      (document.body || document.documentElement).appendChild(root);
      try { document.documentElement.style.overflow = 'hidden'; } catch (e) { }
    }
    root.innerHTML = '<div class="tp" aria-hidden="true"></div><div class="in"><div class="cd0">' +
      '<div class="br">RuangK3 · Pusat Edukasi &amp; Informasi K3</div>' +
      '<button type="button" class="gr" tabindex="-1" aria-hidden="true">' + GEAR + '</button>' +
      '<span class="bd"><i aria-hidden="true"></i>Pemeliharaan sistem terjadwal</span>' +
      '<h1 id="rk3m-t">' + judul + '</h1><p class="ld">' + lead + '</p>' + (cfg && cfg.pesan ? '<p class="ps">' + esc(String(cfg.pesan).slice(0, 400)) + '</p>' : '') +
      '<p class="cl" data-cl>Layanan diperkirakan kembali normal dalam</p>' +
      '<div class="cd" role="timer" aria-label="Sisa waktu pemeliharaan"><div class="u"><b data-k="d">00</b><span>Hari</span></div><div class="u"><b data-k="h">00</b><span>Jam</span></div><div class="u"><b data-k="m">00</b><span>Menit</span></div><div class="u"><b data-k="s">00</b><span>Detik</span></div></div>' +
      '<div class="bar" aria-hidden="true"><i data-bar style="width:0%"></i></div>' +
      '<div class="sc">' + (cfg && cfg.mulai ? '<span>Mulai: <b>' + fmt(+cfg.mulai) + '</b></span>' : '') + '<span>Perkiraan selesai: <b>' + fmt(+cfg.selesai) + '</b></span></div>' +
      '<div class="dn" data-dn hidden role="status"></div>' + info +
      (app ? '<button type="button" class="bt" data-cek>Periksa lagi</button>' : '') +
      '</div></div><div class="ft">Terima kasih atas pengertian dan kesabaran Anda. — Tim RuangK3 · LPMI</div><div class="tp" aria-hidden="true"></div>';
    shown = true;
    var cek = root.querySelector('[data-cek]'); if (cek) cek.onclick = function () { cek.textContent = 'Memeriksa…'; periksa().then(function () { if (cek.isConnected) cek.textContent = 'Masih dalam pemeliharaan · Periksa lagi'; }); };
    if (PAGE === 'web') pintu(root.querySelector('.gr'));
    clearInterval(timer); detik(); timer = setInterval(detik, 1000);
  }
  function detik() {
    if (!root || !cfg) return;
    var now = Date.now(), sel = +cfg.selesai || now, mul = +cfg.mulai || (+cfg.t || now), sisa = Math.max(0, sel - now), tot = Math.max(1, sel - mul);
    var d = Math.floor(sisa / 864e5), h = Math.floor(sisa / 36e5) % 24, m = Math.floor(sisa / 6e4) % 60, s = Math.floor(sisa / 1e3) % 60;
    function set(k, v) { var e = root.querySelector('[data-k="' + k + '"]'); if (e) e.textContent = p2(v); }
    set('d', d); set('h', h); set('m', m); set('s', s);
    var b = root.querySelector('[data-bar]'); if (b) b.style.width = Math.min(100, Math.max(0, (1 - sisa / tot) * 100)).toFixed(1) + '%';
    if (sisa === 0 && !finishing) { var c = root.querySelector('[data-cl]'); if (c) c.textContent = 'Memeriksa status layanan…'; periksa(); }
  }

  // ---------- selesai: buang simpanan lama, muat versi terbaru ----------
  function selesai() {
    if (finishing) return; finishing = true; clearInterval(timer);
    if (root) {
      var dn = root.querySelector('[data-dn]'), cl = root.querySelector('[data-cl]');
      if (cl) cl.textContent = 'Pemeliharaan selesai';
      if (dn) { dn.hidden = false; dn.textContent = PAGE === 'pic' || PAGE === 'riksa' ? 'Pemeliharaan selesai. Aplikasi diperbarui ke versi terbaru dan dimuat ulang otomatis.' : 'Pemeliharaan telah selesai. Halaman akan dimuat ulang otomatis dengan versi terbaru dalam beberapa detik.'; }
    }
    var tugas = [];
    try { if (window.caches && caches.keys) tugas.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) { }
    try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) tugas.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) { }
    ls(BY, null);
    Promise.all(tugas).catch(function () { }).then(function () {
      setTimeout(function () { var u = location.pathname + (location.search ? location.search + '&' : '?') + 'mv=' + Date.now() + location.hash; location.replace(u); }, 2500);
    });
  }

  // ---------- pintu tersembunyi Admin Utama (website): ketuk roda gigi 5x dalam 3 detik ----------
  function pintu(g) {
    if (!g) return; var n = 0, t0 = 0;
    g.addEventListener('click', function () { var t = Date.now(); n = t - t0 < 3000 ? n + 1 : 1; t0 = t; if (n >= 5) { n = 0; bukaLogin(); } });
  }
  function bukaLogin() {
    if (!root || root.querySelector('.lg')) return;
    var w = document.createElement('div'); w.className = 'lg';
    w.innerHTML = '<form><b style="font-size:17px">Akses Admin Utama</b><span style="font-size:13px;color:#5E6672">Selama pemeliharaan hanya Admin Utama yang dapat masuk.</span><label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600">PIN Admin Utama<input type="password" autocomplete="current-password" required></label><span class="e" role="alert"></span><div class="a"><button type="button" data-x>Batal</button><button type="submit" class="p">Masuk</button></div></form>';
    root.appendChild(w);
    var f = w.querySelector('form'), inp = w.querySelector('input'), er = w.querySelector('.e');
    setTimeout(function () { inp.focus(); }, 30);
    w.querySelector('[data-x]').onclick = function () { w.remove(); };
    f.onsubmit = function (e) {
      e.preventDefault();
      if (inp.value !== 'admin123') { er.textContent = 'Akses ditolak. Selama pemeliharaan hanya Admin Utama yang dapat masuk.'; inp.value = ''; return; }
      var pin = inp.value; ls(BY, String(+cfg.selesai || 0)); tutup(); masukAdmin(pin); bilah();
    };
  }
  function masukAdmin(pin) { // jalankan login admin yang sudah ada di website (form-login-admin), tunggu modul halaman siap
    var k = 0, it = setInterval(function () {
      var inp = document.getElementById('input-pin-admin'), form = document.getElementById('form-login-admin');
      if (inp && form && typeof window.openAdminView === 'function') { clearInterval(it); inp.value = pin; if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true })); }
      else if (++k > 60) clearInterval(it);
    }, 300);
  }
  function tutup() { if (root) { root.remove(); root = null; } shown = false; clearInterval(timer); try { document.documentElement.style.overflow = ''; } catch (e) { } }

  // ---------- bilah kuning untuk Admin Utama yang sudah masuk saat pemeliharaan ----------
  var barT = 0;
  function bilah() {
    if (PAGE !== 'web') return;
    var on = berlaku(cfg) && lewat(cfg), b = document.getElementById('rk3bar');
    if (!on) { if (b) b.remove(); clearInterval(barT); return; }
    gaya();
    if (!b) {
      b = document.createElement('div'); b.id = 'rk3bar'; b.setAttribute('role', 'status');
      b.innerHTML = '<span>⚙ Mode pemeliharaan sedang AKTIF. Pengunjung, peserta, dan PIC melihat halaman pemeliharaan.</span><span style="font-weight:500">Sisa waktu: <b data-sisa></b></span><button type="button">Matikan sekarang</button>';
      (document.body || document.documentElement).appendChild(b);
      b.querySelector('button').onclick = function () {
        var btn = this; if (typeof window.rk3MaintSet !== 'function') { alertMsg('Buka panel admin lalu matikan dari menu Mode Pemeliharaan.'); return; }
        btn.disabled = true; btn.textContent = 'Mematikan…';
        window.rk3MaintSet({ aktif: false }).then(function () { cfg = Object.assign({}, cfg, { aktif: false }); bilah(); }).catch(function (e) { btn.disabled = false; btn.textContent = 'Matikan sekarang'; alertMsg('Gagal mematikan: ' + ((e && e.message) || 'cek internet')); });
      };
    }
    var upd = function () { var x = Math.max(0, (+cfg.selesai || 0) - Date.now()), s = b.querySelector('[data-sisa]'); if (s) s.textContent = p2(Math.floor(x / 36e5)) + ':' + p2(Math.floor(x / 6e4) % 60) + ':' + p2(Math.floor(x / 1e3) % 60); if (!x) bilah(); };
    clearInterval(barT); upd(); barT = setInterval(upd, 1000);
  }
  function alertMsg(m) { if (typeof window.showToast === 'function') window.showToast(m, 'error'); else { try { console.warn(m); } catch (e) { } } }

  // ---------- pemeriksaan berkala ----------
  function terapkan(c) {
    if (c === undefined) return; // gagal ambil: biarkan
    cfg = c || null;
    clearTimeout(startT);
    if (berlaku(cfg) && !lewat(cfg)) { if (!shown) tampil(); }
    else if (shown) { if (!berlaku(cfg)) selesai(); else tutup(); }
    else if (cfg && cfg.aktif === true && +cfg.mulai > Date.now() && +cfg.mulai - Date.now() < 864e5) startT = setTimeout(periksa, +cfg.mulai - Date.now() + 500); // terjadwal: tampil tepat pada jam mulai
    bilah();
  }
  function periksa() { return ambil().then(terapkan); }
  window.RK3Maint = { periksa: periksa, cfg: function () { return cfg; }, page: PAGE };
  if (window.RK3_MAINT_PREVIEW) { // halaman pratinjau admin: tampilkan tanpa mengubah apa pun
    PAGE = window.RK3_MAINT_PREVIEW.page || PAGE;
    ambil().then(function (c) { var now = Date.now(); cfg = (c && c.aktif === true && +c.selesai > now) ? c : { aktif: true, mulai: now - 30 * 60e3, selesai: now + 2 * 3600e3, pesan: (c && c.pesan) || '' }; finishing = true; tampil(); });
    return;
  }
  periksa();
  var lastP = Date.now();
  pollT = setInterval(function () { var gap = shown ? 30000 : 300000; if ((shown || !document.hidden) && Date.now() - lastP >= gap) { lastP = Date.now(); periksa(); } }, 15000); // hemat kuota: 30 dtk saat layar pemeliharaan tampil, 5 mnt selain itu
  document.addEventListener('visibilitychange', function () { if (!document.hidden) periksa(); });
  window.addEventListener('online', periksa);
})();
