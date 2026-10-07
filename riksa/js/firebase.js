// Jembatan Firebase untuk aplikasi Riksa Uji (ruangk3.com/riksa/).
// Memakai proyek Firebase yang sama dengan ruangk3.com, tetapi dengan nama app terpisah
// ("riksa-uji") supaya sesi login petugas tidak tercampur dengan sesi peserta/admin di
// halaman utama ruangk3.com (keduanya satu origin).
//
// Data di Realtime Database (di bawah artifacts/k3-kebakaran-app-v5/public/data):
//   riksa_petugas/{uid}          profil petugas {nama, email, aktif, dibuat}      (dikelola Admin Pusat)
//   riksa_laporan/{reportId}     ringkasan laporan untuk daftar di panel admin
//   riksa_laporan_data/{reportId} isi lengkap laporan {json, disimpan, petugasUid}
//   riksa_foto/{reportId}/{photoId}  foto (dataURL JPEG/PNG) – HANYA laporan lama / bila Drive belum diatur
//   riksa_pengaturan/drive       {url, ts} alamat Web App Google Drive Riksa Uji (diisi Admin Pusat di panel admin)
//   Bila Drive aktif, foto & isi laporan disimpan di Google Drive; riksa_laporan hanya berisi ringkasan + field `drive`.
//   riksa_log/{pushId}           jejak aktivitas {waktu, uid, nama, aksi, reportId, ket}
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getDatabase, ref, get, set, push, remove } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyA2ow2lR4Z3lX7zBcZC5Xg3eWlDm7KNAAg',
  authDomain: 'portal-k3-bidang-kebakaran.firebaseapp.com',
  databaseURL: 'https://portal-k3-bidang-kebakaran-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'portal-k3-bidang-kebakaran',
  storageBucket: 'portal-k3-bidang-kebakaran.firebasestorage.app',
  messagingSenderId: '497833559757',
  appId: '1:497833559757:web:01c2de15cd5f56dbb18b84',
};
const ROOT = 'artifacts/k3-kebakaran-app-v5/public/data';
const app = initializeApp(firebaseConfig, 'riksa-uji');
const auth = getAuth(app);
const db = getDatabase(app);

const fail = (code, message) => Object.assign(new Error(message), { code });
function withTimeout(promise, ms, message) {
  let t;
  return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(fail('network', message || 'Koneksi terlalu lambat atau terputus. Coba lagi saat sinyal lebih baik.')), ms); })]).finally(() => clearTimeout(t));
}
function authMessage(e) {
  const c = (e && e.code) || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return fail('invalid', 'Email atau password salah.');
  if (/too-many-requests/.test(c)) return fail('locked', 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.');
  if (/network-request-failed/.test(c)) return fail('network', 'Tidak ada koneksi internet. Masuk pertama kali membutuhkan sinyal.');
  if (/user-disabled/.test(c)) return fail('inactive', 'Akun ini dinonaktifkan. Hubungi Admin Pusat ruangk3.com.');
  if (/weak-password/.test(c)) return fail('weak', 'Password baru terlalu lemah (minimal 8 karakter).');
  if (/requires-recent-login/.test(c)) return fail('session', 'Demi keamanan, masuk ulang dulu lalu ganti password.');
  return e && e.code ? fail(e.code, e.message) : e;
}
let namaPetugas = '';
const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)));

async function getProfile(uid) {
  const snap = await withTimeout(get(ref(db, `${ROOT}/riksa_petugas/${uid}`)), 20000);
  return snap.val();
}
async function requireActive() {
  const u = auth.currentUser;
  if (!u) throw fail('session', 'Sesi berakhir. Silakan masuk lagi.');
  const p = await getProfile(u.uid);
  if (!p) throw fail('not_petugas', 'Akun ini tidak terdaftar sebagai petugas riksa uji.');
  if (p.aktif === false) throw fail('inactive', 'Akun petugas Anda dinonaktifkan. Hubungi Admin Pusat ruangk3.com.');
  namaPetugas = p.nama || namaPetugas;
  return { u, p };
}
function log(uid, nama, aksi, reportId = '', ket = '') {
  return push(ref(db, `${ROOT}/riksa_log`), { waktu: Date.now(), uid, nama: nama || '', aksi, reportId, ket }).catch(() => {});
}

let firstState;
const ready = new Promise((res) => { firstState = res; });
onAuthStateChanged(auth, (u) => {
  firstState();
  if (u && !namaPetugas) getProfile(u.uid).then(p => { if (p) namaPetugas = p.nama || ''; }).catch(() => {});
  window.dispatchEvent(new CustomEvent('riksa-auth', { detail: u ? { uid: u.uid, email: u.email } : null }));
});

window.RiksaFB = {
  ready,
  isSignedIn: () => !!auth.currentUser,
  // token login untuk Apps Script Google Drive (diperbarui otomatis oleh Firebase)
  async idToken() {
    if (!auth.currentUser) throw fail('session', 'Sesi berakhir. Silakan masuk lagi.');
    try { return await withTimeout(auth.currentUser.getIdToken(), 20000); }
    catch (e) { throw e && e.code === 'network' ? e : fail('session', 'Sesi berakhir. Silakan masuk lagi.'); }
  },
  // alamat Web App Google Drive. null = belum diatur (aplikasi memakai penyimpanan Firebase lama)
  async driveCfg() {
    const snap = await withTimeout(get(ref(db, `${ROOT}/riksa_pengaturan/drive`)), 20000);
    return snap.val();
  },
  currentUid: () => (auth.currentUser ? auth.currentUser.uid : null),
  async login(email, password) {
    let cred;
    try { cred = await withTimeout(signInWithEmailAndPassword(auth, email, password), 25000); }
    catch (e) { throw authMessage(e); }
    const p = await getProfile(cred.user.uid).catch(() => null);
    if (!p || p.aktif === false) {
      await signOut(auth).catch(() => {});
      throw p ? fail('inactive', 'Akun petugas Anda dinonaktifkan. Hubungi Admin Pusat ruangk3.com.') : fail('not_petugas', 'Akun ini tidak terdaftar sebagai petugas riksa uji. Minta Admin Pusat membuatkan akun di menu Petugas Riksa Uji.');
    }
    namaPetugas = p.nama || '';
    log(cred.user.uid, p.nama, 'masuk', '', navigator.userAgent.slice(0, 120));
    return { uid: cred.user.uid, email: cred.user.email, nama: p.nama || cred.user.email };
  },
  async logout() {
    const u = auth.currentUser;
    if (u) log(u.uid, namaPetugas, 'keluar');
    await signOut(auth);
  },
  async resetPassword(email) {
    try { await withTimeout(sendPasswordResetEmail(auth, email), 20000); }
    catch (e) { throw authMessage(e); }
  },
  async changePassword(oldPassword, newPassword) {
    const u = auth.currentUser;
    if (!u) throw fail('session', 'Sesi berakhir. Silakan masuk lagi.');
    try {
      await withTimeout(reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, oldPassword)), 20000);
      await withTimeout(updatePassword(u, newPassword), 20000);
    } catch (e) { throw authMessage(e); }
    log(u.uid, namaPetugas, 'ganti password');
  },
  // foto disimpan dengan kunci = id foto di perangkat, jadi kirim ulang tidak menggandakan data
  async uploadPhoto(reportId, photoId, dataUrl) {
    if (!auth.currentUser) throw fail('session', 'Sesi berakhir. Silakan masuk lagi.');
    await withTimeout(set(ref(db, `${ROOT}/riksa_foto/${reportId}/${photoId}`), dataUrl), 90000);
    return photoId;
  },
  async saveReport({ reportId, berkasId, jenis, summary, report, jumlahFoto, drive }) {
    const { u, p } = await requireActive();
    const sumRef = ref(db, `${ROOT}/riksa_laporan/${reportId}`);
    const old = (await withTimeout(get(sumRef), 20000)).val();
    if (old && old.petugasUid && old.petugasUid !== u.uid) throw fail('forbidden', 'Laporan ini sudah dikirim oleh petugas lain.');
    const now = Date.now();
    if (!drive) await withTimeout(set(ref(db, `${ROOT}/riksa_laporan_data/${reportId}`), { json: JSON.stringify(report), disimpan: now, petugasUid: u.uid }), 60000);
    const rev = ((old && old.rev) || 0) + 1;
    await withTimeout(set(sumRef, clean({
      ...summary, jenis, berkasId, jumlahFoto: jumlahFoto || 0,
      petugasUid: u.uid, petugasNama: p.nama || '', petugasEmail: u.email || '',
      drive: drive || null,
      pertama: (old && old.pertama) || now, diperbarui: now, rev,
    })), 20000);
    // laporan lama yang masih di Firebase dipindah ke Drive: bersihkan salinan lama (hemat kuota Firebase)
    if (drive && old && !old.drive) {
      Promise.all([remove(ref(db, `${ROOT}/riksa_laporan_data/${reportId}`)), remove(ref(db, `${ROOT}/riksa_foto/${reportId}`))]).catch(() => {});
    }
    await log(u.uid, p.nama, old ? 'perbarui laporan' : 'kirim laporan', reportId, `${jenis === 'apar' ? 'APAR' : jenis === 'fa' ? 'Fire Alarm' : 'Hidran'} ${summary.nomor || ''} – ${summary.perusahaan || ''} (rev ${rev})${drive ? ' → Google Drive' : ''}`);
    return { rev };
  },
};
window.dispatchEvent(new Event('riksa-fb-ready'));
