// Jembatan Firebase untuk Portal PIC (ruangk3.com/pic/).
// Memakai proyek Firebase yang sama dengan ruangk3.com, dengan nama app terpisah ("portal-pic")
// supaya sesi login PIC tidak tercampur dengan sesi admin/peserta di halaman utama (satu origin).
//
// Data di Realtime Database (di bawah artifacts/k3-kebakaran-app-v5/public/data):
//   dh_pic/{uid}              profil akun PIC {nama, user, hp, aktif, dibuat}          (dikelola admin utama)
//   dh_kegiatan/{kid}         kegiatan {nama, tgl[], tempat, picUid, picNama, peserta[{id,nama,instansi}], upd}
//   dh_hasil/{kid}            ringkasan hasil kerja PIC {batal, hadir, foto, ttdPic, ttdPicNama, upd, rev, picUid}
//   dh_media/{kid}/{key}      gambar (dataURL): s_<pid>_<tanggal> = TTD peserta, f_<pid> = foto, pic = TTD PIC
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getDatabase, ref, get, set, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';

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
const DOMAIN = 'pic.ruangk3.com'; // tanpa @: username "rina" -> rina@pic.ruangk3.com (bukan email sungguhan); dengan @: dipakai apa adanya
const app = initializeApp(firebaseConfig, 'portal-pic');
const auth = getAuth(app);
const db = getDatabase(app);

const fail = (code, message) => Object.assign(new Error(message), { code });
function withTimeout(promise, ms, message) {
  let t;
  return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(fail('network', message || 'Koneksi terlalu lambat atau terputus.')), ms); })]).finally(() => clearTimeout(t));
}
function authMessage(e) {
  const c = (e && e.code) || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return fail('invalid', 'Email/username atau kata sandi salah.');
  if (/too-many-requests/.test(c)) return fail('locked', 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.');
  if (/network-request-failed/.test(c)) return fail('network', 'Tidak ada koneksi internet. Masuk pertama kali membutuhkan sinyal.');
  if (/user-disabled/.test(c)) return fail('inactive', 'Akun ini dinonaktifkan. Hubungi admin utama.');
  if (/weak-password/.test(c)) return fail('weak', 'Kata sandi baru terlalu lemah (minimal 6 karakter).');
  if (/requires-recent-login/.test(c)) return fail('session', 'Demi keamanan, masuk ulang dulu lalu ganti kata sandi.');
  return e && e.code ? fail(e.code, e.message) : e;
}
const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)));
async function profile(uid) { return (await withTimeout(get(ref(db, `${ROOT}/dh_pic/${uid}`)), 20000)).val(); }

let firstState;
const ready = new Promise((res) => { firstState = res; });
onAuthStateChanged(auth, (u) => { firstState(); window.dispatchEvent(new CustomEvent('pic-auth', { detail: u ? { uid: u.uid } : null })); });

window.PicFB = {
  ready,
  uid: () => (auth.currentUser ? auth.currentUser.uid : null),
  async login(user, password) {
    const u0 = String(user).trim().toLowerCase(), email = u0.includes('@') ? u0 : `${u0}@${DOMAIN}`;
    let cred;
    try { cred = await withTimeout(signInWithEmailAndPassword(auth, email, password), 25000); }
    catch (e) { throw authMessage(e); }
    const p = await profile(cred.user.uid).catch(() => null);
    if (!p || p.aktif === false) {
      await signOut(auth).catch(() => {});
      throw p ? fail('inactive', 'Akun ini dinonaktifkan. Hubungi admin utama.') : fail('not_pic', 'Akun ini belum terdaftar sebagai PIC. Hubungi admin utama.');
    }
    return { uid: cred.user.uid, nama: p.nama || user, user: p.user || user };
  },
  async logout() { await signOut(auth); },
  // cek profil (akun masih aktif?) – mengembalikan null bila dihapus
  profile,
  async changePassword(oldPassword, newPassword) {
    const u = auth.currentUser;
    if (!u) throw fail('session', 'Sesi berakhir. Silakan masuk lagi.');
    try {
      await withTimeout(reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, oldPassword)), 20000);
      await withTimeout(updatePassword(u, newPassword), 20000);
    } catch (e) { throw authMessage(e); }
  },
  async kegiatan() {
    const u = auth.currentUser; if (!u) throw fail('session', 'Sesi berakhir.');
    const snap = await withTimeout(get(query(ref(db, `${ROOT}/dh_kegiatan`), orderByChild('picUid'), equalTo(u.uid))), 30000);
    return snap.val() || {};
  },
  async hasil(kid) { return (await withTimeout(get(ref(db, `${ROOT}/dh_hasil/${kid}`)), 20000)).val(); },
  async media(kid) { return (await withTimeout(get(ref(db, `${ROOT}/dh_media/${kid}`)), 120000)).val() || {}; },
  // gambar disimpan dengan kunci tetap, jadi kirim ulang menimpa data yang sama
  async putMedia(kid, key, dataUrl) { await withTimeout(set(ref(db, `${ROOT}/dh_media/${kid}/${key}`), dataUrl), 90000); },
  async putHasil(kid, hasil) { await withTimeout(set(ref(db, `${ROOT}/dh_hasil/${kid}`), clean({ ...hasil, picUid: auth.currentUser.uid })), 30000); },
};
window.dispatchEvent(new Event('pic-fb-ready'));
