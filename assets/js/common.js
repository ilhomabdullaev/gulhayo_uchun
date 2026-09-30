/* Tourist.uz — umumiy yordamchi funksiyalar: til, saqlash, navigatsiya, savat, geo, Gemini AI */

/* ---------- localStorage (xavfsiz o'rovchi) ---------- */
const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem("tu." + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("tu." + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  },
  remove(key) {
    try { localStorage.removeItem("tu." + key); } catch (e) { /* ignore */ }
  }
};

/* ---------- Til ---------- */
function getLang() {
  const l = store.get("lang");
  if (l && I18N[l]) return l;
  const nav = (navigator.language || "uz").slice(0, 2);
  return I18N[nav] ? nav : "uz";
}
function setLang(l) {
  store.set("lang", l);
  store.set("guideLang", l); // audio-gid ham interfeys tiliga ergashadi (gid sahifasida alohida o'zgartirish mumkin)
  applyI18n(); document.dispatchEvent(new Event("langchange")); }
function t(key) { const l = getLang(); return (I18N[l] && I18N[l][key]) || I18N.uz[key] || key; }
function L(obj) { if (!obj) return ""; const l = getLang(); return obj[l] || obj.en || obj.uz || ""; }

function applyI18n(root = document) {
  document.documentElement.lang = getLang();
  root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  const sel = document.getElementById("langSelect");
  if (sel) sel.value = getLang();
}

/* ---------- Formatlash ---------- */
function money(n) {
  if (!n) return t("common.free");
  return Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ") + " " + t("common.sum");
}
function usd(n) { return "≈ $" + (n / USD_RATE).toFixed(n / USD_RATE < 10 ? 1 : 0); }
function dur(minutes) {
  minutes = Math.round(minutes);
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h} ${t("common.h")} ${m} ${t("common.min")}` : `${m} ${t("common.min")}`;
}
function hhmm(date) { return date.toTimeString().slice(0, 5); }
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function placeById(id) { return PLACES.find(p => p.id === id); }
function regionById(id) { return REGIONS.find(r => r.id === id); }
function countryByCode(c) { return COUNTRIES.find(x => x.code === c); }

/* ---------- Geo va yo'l vaqti ---------- */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* Kun vaqti va hafta kuniga qarab tirbandlik koeffitsiyenti (1.0 = bo'sh yo'l) */
function trafficFactor(date) {
  const h = date.getHours() + date.getMinutes() / 60;
  const weekend = [0, 6].includes(date.getDay());
  let f;
  if (h >= 7.5 && h < 9.5) f = 1.6;
  else if (h >= 17 && h < 19.5) f = 1.7;
  else if (h >= 12 && h < 14) f = 1.25;
  else if (h >= 22 || h < 6) f = 0.9;
  else f = 1.1;
  return weekend ? Math.max(0.9, f * 0.8) : f;
}

/* Ikki nuqta orasidagi yo'l: masofa, vaqt (daqiqa), narx */
function estimateLeg(from, to, mode, departAt) {
  const tr = TRANSPORT[mode];
  const straight = haversineKm(from.lat, from.lon, to.lat, to.lon);
  const road = straight * (mode === "walk" ? 1.25 : 1.35);
  const factor = tr.traffic ? trafficFactor(departAt) : 1;
  let minutes = (road / tr.speed) * 60 * factor;
  if (mode === "bus") minutes += 8; // bekatda kutish
  if (mode === "taxi") minutes += 4; // taksi chaqirish
  minutes = Math.max(3, minutes);
  const cost = mode === "taxi" ? Math.round((tr.base + road * tr.pricePerKm) / 1000) * 1000 : tr.base;
  return { km: road, minutes, factor, cost };
}

/* Eng yaqin qo'shni evristikasi — marshrut tartibini optimallashtirish */
function optimizeOrder(ids) {
  if (ids.length < 3) return ids.slice();
  const rest = ids.slice(1).map(placeById);
  const out = [ids[0]];
  let cur = placeById(ids[0]);
  while (rest.length) {
    let bi = 0, bd = Infinity;
    rest.forEach((p, i) => { const d = haversineKm(cur.lat, cur.lon, p.lat, p.lon); if (d < bd) { bd = d; bi = i; } });
    cur = rest.splice(bi, 1)[0];
    out.push(cur.id);
  }
  return out;
}

function mapLinks(from, to, mode) {
  const yRt = { walk: "pd", taxi: "auto", bus: "mt", bike: "bc" }[mode] || "auto";
  const gRt = { walk: "walking", taxi: "driving", bus: "transit", bike: "bicycling" }[mode] || "driving";
  return {
    yandex: `https://yandex.uz/maps/?rtext=${from.lat},${from.lon}~${to.lat},${to.lon}&rtt=${yRt}`,
    google: `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=${gRt}`
  };
}

/* ---------- Savat ---------- */
const cart = {
  items() { return store.get("cart", []); },
  has(id) { return this.items().some(i => i.id === id); },
  add(id, qty = 1) {
    const p = placeById(id);
    if (!p || !p.price) return;
    const items = this.items();
    const ex = items.find(i => i.id === id);
    if (ex) ex.qty = Math.max(ex.qty, qty); else items.push({ id, qty });
    store.set("cart", items); updateCartBadge();
  },
  setQty(id, qty) {
    const items = this.items().map(i => i.id === id ? { ...i, qty: Math.max(1, qty) } : i);
    store.set("cart", items); updateCartBadge();
  },
  remove(id) { store.set("cart", this.items().filter(i => i.id !== id)); updateCartBadge(); },
  clear() { store.set("cart", []); updateCartBadge(); },
  total() { return this.items().reduce((s, i) => s + (placeById(i.id)?.price || 0) * i.qty, 0); }
};
function updateCartBadge() {
  const b = document.getElementById("cartBadge");
  if (!b) return;
  const n = cart.items().reduce((s, i) => s + i.qty, 0);
  b.textContent = n; b.hidden = n === 0;
}

/* ---------- Toast ---------- */
function toast(msg, kind = "info") {
  let box = document.getElementById("toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const el = document.createElement("div");
  el.className = "toast " + kind; el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 4200);
}

/* ---------- Gemini AI ---------- */
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TTS_MODEL = "gemini-2.5-flash-preview-tts";
/* AI sozlamalari admin panelda kiritiladi (Firestore → config/ai) va barcha foydalanuvchilarga amal qiladi.
   mode: "firebase" — Firebase AI Logic (kalit kerak emas, tavsiya etiladi); "key" — admin kiritgan Gemini API kaliti. */
const gemini = {
  cfg() { return (typeof cloud !== "undefined" && cloud.aiConfig) || {}; },
  key() { return this.cfg().mode === "key" ? (this.cfg().key || "") : ""; },
  ttsKey() { return this.cfg().key || ""; }, // Gemini ovozi (TTS) kalit bo'lsa ikkala rejimda ham ishlaydi
  model() { return this.cfg().model || DEFAULT_MODEL; },
  ttsModel() { return this.cfg().ttsModel || DEFAULT_TTS_MODEL; },
  viaFirebase() { return !this.key() && typeof cloud !== "undefined" && cloud.enabled && !this._fbFailed; },
  enabled() { return !!this.key() || this.viaFirebase(); },

  /* override: admin panelda saqlashdan oldin sinash uchun ({ mode, key, model }) */
  async generate(prompt, { json = false, system = "", temperature = 0.7 } = {}, override = null) {
    const mode = override ? override.mode : (this.key() ? "key" : "firebase");
    const key = mode === "key" ? (override ? override.key : this.key()) : "";
    const model = (override && override.model) || this.model();
    if (mode === "firebase" && (override || this.viaFirebase())) {
      try {
        const text = await cloud.generate(prompt, { json, system, temperature, model });
        return json ? parseJsonLoose(text) : text;
      } catch (e) {
        // AI Logic konsolda yoqilmagan bo'lsa — qayta-qayta urinmaslik uchun shu sahifada o'chiramiz
        if (/api-not-enabled|not been used|disabled|PERMISSION_DENIED|403/i.test(`${e.code} ${e.message}`)) this._fbFailed = true;
        throw e;
      }
    }
    if (!key) throw new Error("NO_KEY");
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature, ...(json ? { responseMimeType: "application/json" } : {}) }
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    const text = (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || "").join("");
    if (!text) throw new Error(data.promptFeedback?.blockReason || "Empty response");
    return json ? parseJsonLoose(text) : text;
  },

  async listModels(key = this.ttsKey()) {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    return (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes("generateContent") && /gemini/i.test(m.name))
      .map(m => ({ id: m.name.replace(/^models\//, ""), label: m.displayName || m.name }));
  }
};
function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch (e) { /* fall through */ }
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) return JSON.parse(m[1]);
  throw new Error("AI JSON parse error");
}

/* ---------- Navigatsiya ---------- */
function renderNav(active) {
  const links = [
    ["index.html", "nav.home", "home"], ["trip.html", "nav.trip", "trip"], ["planner.html", "nav.planner", "planner"],
    ["guide.html", "nav.guide", "guide"], ["cart.html", "nav.cart", "cart"], ["settings.html", "nav.settings", "settings"]
  ];
  const header = document.getElementById("nav");
  if (!header) return;
  header.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="index.html"><span class="logo">T</span><span>Tourist<b>.uz</b></span></a>
      <button class="burger" aria-label="Menu" onclick="document.body.classList.toggle('menu-open')">☰</button>
      <nav class="links">
        ${links.map(([href, key, id]) => `<a href="${href}" class="${id === active ? "active" : ""}"><span data-i18n="${key}"></span>${id === "cart" ? '<span id="cartBadge" class="badge" hidden>0</span>' : ""}</a>`).join("")}
      </nav>
      <div class="nav-right">
        <span id="accountNav" class="acc"></span>
        <span class="ai-dot ${gemini.enabled() ? "on" : "off"}" title="${esc(t(gemini.enabled() ? "ai.on" : "ai.off"))}">AI</span>
        <select id="langSelect" aria-label="Language" onchange="setLang(this.value)">
          <option value="uz">UZ</option><option value="en">EN</option><option value="ru">RU</option>
        </select>
      </div>
    </div>`;
  const footer = document.getElementById("foot");
  if (footer) footer.innerHTML = `<div class="container"><p data-i18n="foot"></p></div>`;
  applyI18n();
  updateCartBadge();
  if (typeof renderAccountNav === "function") renderAccountNav();
  document.addEventListener("langchange", () => {
    const dot = document.querySelector(".ai-dot");
    if (dot) dot.title = t(gemini.enabled() ? "ai.on" : "ai.off");
  });
}
