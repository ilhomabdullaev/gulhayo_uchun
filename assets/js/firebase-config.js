/* Firebase sozlamasi.
 * Firebase Console → ⚙️ Project settings → Your apps → Web app → "firebaseConfig" qiymatlarini shu yerga qo'ying.
 * Bu qiymatlar maxfiy emas (brauzerga baribir yuboriladi); ma'lumotlar xavfsizligi firestore.rules orqali ta'minlanadi.
 * null bo'lsa — sayt Firebase'siz (oflayn demo rejimda) ishlayveradi. */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC1-L4EU-D_A052dpjar46ghZ5jcdIN5r8",
  authDomain: "tourist-uz-fc69d.firebaseapp.com",
  projectId: "tourist-uz-fc69d",
  storageBucket: "tourist-uz-fc69d.firebasestorage.app",
  messagingSenderId: "701604934121",
  appId: "1:701604934121:web:d08a57a4a10a71d3941b78"
};
/* Namuna:
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "tourist-uz.firebaseapp.com",
  projectId: "tourist-uz",
  storageBucket: "tourist-uz.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/

/* Admin panelga kira oladigan email(lar). firestore.rules faylidagi ro'yxat bilan BIR XIL bo'lishi shart. */
window.ADMIN_EMAILS = [];
