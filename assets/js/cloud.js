/* Firebase qatlami: foydalanuvchilar (Auth), buyurtmalar va obidalar sozlamasi (Firestore).
 * FIREBASE_CONFIG bo'lmasa, cloud.enabled = false va sayt avvalgidek brauzer xotirasida ishlaydi. */

const ORDER_STATUSES = ["paid_demo", "used", "cancelled"];
const STATUS_LABELS = {
  paid_demo: { uz: "To'langan (demo)", en: "Paid (demo)", ru: "Оплачен (демо)" },
  used: { uz: "Ishlatilgan", en: "Used", ru: "Использован" },
  cancelled: { uz: "Bekor qilingan", en: "Cancelled", ru: "Отменён" }
};
function statusLabel(s) { return STATUS_LABELS[s] ? L(STATUS_LABELS[s]) : s; }

const cloud = {
  enabled: false, ready: false, user: null, admin: false, error: null,
  _cbs: [], _app: null, _auth: null, _db: null,

  init() {
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || !window.FB) { this._finish(null); return; }
    try {
      this._app = FB.initializeApp(cfg);
      this._auth = FB.getAuth(this._app);
      this._db = FB.getFirestore(this._app);
      if (window.FIREBASE_EMULATOR) { // faqat lokal sinov uchun
        FB.connectAuthEmulator(this._auth, `http://${window.FIREBASE_EMULATOR.auth}`, { disableWarnings: true });
        const [h, port] = window.FIREBASE_EMULATOR.firestore.split(":");
        FB.connectFirestoreEmulator(this._db, h, Number(port));
      }
      this.enabled = true;
    } catch (e) { this.error = e; console.error("Firebase init:", e); this._finish(null); return; }

    this.loadPlaceOverrides();
    FB.getRedirectResult(this._auth).catch(e => toast(authError(e), "error"));
    FB.onAuthStateChanged(this._auth, async u => {
      this.user = u ? { uid: u.uid, email: u.email || "", name: u.displayName || (u.email || "").split("@")[0] } : null;
      if (u) this._touchUser().catch(e => console.warn("user profile:", e.message));
      this.admin = u ? await this._probeAdmin() : false;
      this._finish(this.user);
    });
  },
  _finish(user) {
    this.ready = true;
    this._cbs.forEach(cb => { try { cb(user); } catch (e) { console.error(e); } });
    document.dispatchEvent(new Event("cloudchange"));
  },
  /* cb darhol (tayyor bo'lsa) va har bir kirish/chiqishda chaqiriladi */
  onChange(cb) { this._cbs.push(cb); if (this.ready) cb(this.user); },
  isAdmin() { return !!this.user && this.admin; },
  /* Admin ekanini bazadan so'rab aniqlaymiz: barcha buyurtmalarni o'qishga faqat firestore.rules'dagi
     admin ruxsat oladi. Shu tufayli admin emaili sayt kodida (ochiq repozitoriyda) saqlanmaydi. */
  async _probeAdmin() {
    this.adminDiag = {};
    try {
      const tr = await this._auth.currentUser.getIdTokenResult();
      this.adminDiag.emailVerified = tr.claims.email_verified === true;
      this.adminDiag.provider = tr.signInProvider;
    } catch (e) { /* ignore */ }
    try {
      await FB.getDocs(FB.query(FB.collection(this._db, "orders"), FB.limit(1)));
      return true;
    } catch (e) { this.adminDiag.error = `${e.code || ""} ${e.message || ""}`.trim(); return false; }
  },
  /* Tokenni yangilab admin huquqini qayta tekshirish (qoidalar kirgandan keyin o'zgargan bo'lsa) */
  async recheckAdmin() {
    if (!this._auth.currentUser) return false;
    await this._auth.currentUser.getIdToken(true);
    this.admin = await this._probeAdmin();
    this._finish(this.user);
    return this.admin;
  },

  /* ---------- Auth ---------- */
  async signInGoogle() {
    const provider = new FB.GoogleAuthProvider();
    try { await FB.signInWithPopup(this._auth, provider); }
    catch (e) {
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e.code)) {
        await FB.signInWithRedirect(this._auth, provider);
      } else throw e;
    }
  },
  async signUp(name, email, pass) {
    const cred = await FB.createUserWithEmailAndPassword(this._auth, email, pass);
    if (name) await FB.updateProfile(cred.user, { displayName: name });
    this.user = { uid: cred.user.uid, email, name: name || email.split("@")[0] };
    await this._touchUser();
  },
  signIn(email, pass) { return FB.signInWithEmailAndPassword(this._auth, email, pass); },
  resetPassword(email) { return FB.sendPasswordResetEmail(this._auth, email); },
  signOut() { return FB.signOut(this._auth); },

  _touchUser() {
    const trip = store.get("trip", {});
    return FB.setDoc(FB.doc(this._db, "users", this.user.uid), {
      email: this.user.email, name: this.user.name, country: trip.country || "", lang: getLang(),
      lastLogin: FB.serverTimestamp()
    }, { merge: true });
  },

  /* ---------- Gemini (Firebase AI Logic): kalit Firebase serverida, brauzerga chiqmaydi ---------- */
  async generate(prompt, { json = false, system = "", temperature = 0.7, model = "gemini-2.5-flash" } = {}) {
    if (!this._ai) this._ai = FB.getAI(this._app, { backend: new FB.GoogleAIBackend() });
    const m = FB.getGenerativeModel(this._ai, {
      model,
      ...(system ? { systemInstruction: system } : {}),
      generationConfig: { temperature, ...(json ? { responseMimeType: "application/json" } : {}) }
    });
    const res = await m.generateContent(prompt);
    return res.response.text();
  },

  /* ---------- Buyurtmalar ---------- */
  async saveOrder(order) {
    await FB.setDoc(FB.doc(this._db, "orders", order.id), {
      code: order.id, date: order.date, name: order.name,
      items: order.items.map(i => ({ id: i.id, qty: i.qty, price: placeById(i.id)?.price || 0 })),
      total: order.total, uid: this.user.uid, email: this.user.email,
      status: "paid_demo", createdAt: FB.serverTimestamp()
    });
  },
  async myOrders() {
    const snap = await FB.getDocs(FB.query(FB.collection(this._db, "orders"), FB.where("uid", "==", this.user.uid)));
    return snap.docs.map(orderFromDoc).sort((a, b) => b.createdMs - a.createdMs);
  },
  async allOrders() {
    const snap = await FB.getDocs(FB.query(FB.collection(this._db, "orders"), FB.orderBy("createdAt", "desc"), FB.limit(500)));
    return snap.docs.map(orderFromDoc);
  },
  setOrderStatus(id, status) { return FB.updateDoc(FB.doc(this._db, "orders", id), { status }); },
  async allUsers() {
    const snap = await FB.getDocs(FB.collection(this._db, "users"));
    return snap.docs.map(d => ({ uid: d.id, ...d.data(), lastMs: d.data().lastLogin?.toMillis?.() || 0 }))
      .sort((a, b) => b.lastMs - a.lastMs);
  },

  /* ---------- Obidalar (admin o'zgartirgan narx / faollik) ---------- */
  async loadPlaceOverrides() {
    try {
      const snap = await FB.getDocs(FB.collection(this._db, "places"));
      snap.docs.forEach(d => {
        const p = PLACES_ALL.find(x => x.id === d.id), o = d.data();
        if (!p) return;
        if (typeof o.price === "number") p.price = o.price;
        p.active = o.active !== false;
      });
      if (!window.KEEP_INACTIVE_PLACES) {
        for (let i = PLACES.length - 1; i >= 0; i--) if (PLACES[i].active === false) PLACES.splice(i, 1);
      }
      document.dispatchEvent(new Event("cloudplaces"));
    } catch (e) { console.warn("places:", e.message); }
  },
  savePlace(id, data) { return FB.setDoc(FB.doc(this._db, "places", id), { ...data, updatedAt: FB.serverTimestamp() }, { merge: true }); }
};

function orderFromDoc(d) {
  const o = d.data();
  return { ...o, id: o.code || d.id, docId: d.id, createdMs: o.createdAt?.toMillis?.() || 0 };
}

/* Firebase xato kodlarini tushunarli matnga aylantirish */
function authError(e) {
  const m = {
    "auth/invalid-credential": { uz: "Email yoki parol noto'g'ri", en: "Wrong email or password", ru: "Неверный email или пароль" },
    "auth/wrong-password": { uz: "Parol noto'g'ri", en: "Wrong password", ru: "Неверный пароль" },
    "auth/user-not-found": { uz: "Bunday foydalanuvchi yo'q", en: "No such user", ru: "Пользователь не найден" },
    "auth/email-already-in-use": { uz: "Bu email allaqachon ro'yxatdan o'tgan", en: "This email is already registered", ru: "Этот email уже зарегистрирован" },
    "auth/weak-password": { uz: "Parol kamida 6 belgidan iborat bo'lsin", en: "Password must be at least 6 characters", ru: "Пароль должен быть не короче 6 символов" },
    "auth/invalid-email": { uz: "Email noto'g'ri kiritilgan", en: "Invalid email", ru: "Неверный email" },
    "auth/popup-closed-by-user": { uz: "Oyna yopildi", en: "The window was closed", ru: "Окно было закрыто" },
    "auth/unauthorized-domain": { uz: "Bu domen Firebase'da ruxsat etilmagan (Authentication → Settings → Authorized domains)", en: "This domain is not authorized in Firebase (Authentication → Settings → Authorized domains)", ru: "Домен не разрешён в Firebase (Authentication → Settings → Authorized domains)" },
    "auth/too-many-requests": { uz: "Juda ko'p urinish, birozdan keyin qayta urinib ko'ring", en: "Too many attempts, try again later", ru: "Слишком много попыток, попробуйте позже" },
    "permission-denied": { uz: "Ruxsat yo'q (Firestore qoidalarini tekshiring)", en: "Permission denied (check Firestore rules)", ru: "Нет доступа (проверьте правила Firestore)" }
  };
  return (m[e.code] && L(m[e.code])) || e.message || String(e);
}

/* Navigatsiyadagi akkaunt tugmasi */
function renderAccountNav() {
  const box = document.getElementById("accountNav");
  if (!box) return;
  if (!cloud.enabled) { box.innerHTML = ""; return; }
  if (!cloud.user) {
    box.innerHTML = `<a class="btn sm" href="login.html?next=${encodeURIComponent(location.pathname.split("/").pop() || "index.html")}">${t("acc.login")}</a>`;
    return;
  }
  box.innerHTML = `
    ${cloud.isAdmin() ? `<a class="btn sm gold" href="admin.html">${t("acc.admin")}</a>` : ""}
    <span class="acc-name" title="${esc(cloud.user.email)}">👤 ${esc(cloud.user.name)}</span>
    <button class="btn sm ghost" id="logoutBtn">${t("acc.logout")}</button>`;
  document.getElementById("logoutBtn").onclick = () => cloud.signOut().then(() => toast(t("acc.loggedOut"), "ok"));
}

window.PLACES_ALL = PLACES.slice();
cloud.onChange(renderAccountNav);
document.addEventListener("langchange", renderAccountNav);
cloud.init();
