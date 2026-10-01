/* Ovozli ko'p tilli AI gid: GPS → eng yaqin obida → AI matn (sayyoh tilida) → nutq sintezi */

renderNav("guide");

const TRIGGER_M = 150;           // obidaga shu masofada gid avtomatik ishga tushadi
let me = null, watchId = null, current = null, lastAuto = null, audioEl = null;

const gLang = document.getElementById("gLang");
const gSim = document.getElementById("gSim");
const aiVoice = document.getElementById("gAiVoice");

function guideLang() { return store.get("guideLang") || getLang(); }

function renderControls() {
  gLang.innerHTML = Object.entries(GUIDE_LANGS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");
  gLang.value = guideLang();
  const reg = store.get("trip", {}).region;
  gSim.innerHTML = REGIONS.map(r => `<optgroup label="${esc(L(r.name))}">${PLACES.filter(p => p.region === r.id)
    .map(p => `<option value="${p.id}">${esc(L(p.name))}</option>`).join("")}</optgroup>`).join("");
  const first = PLACES.find(p => p.region === reg) || PLACES[0];
  gSim.value = current ? current.id : first.id;
  aiVoice.checked = !!store.get("aiVoice", false);
  aiVoice.closest("label").classList.toggle("hidden", !gemini.ttsKey()); // Gemini ovozi faqat admin kalit kiritganda
}
gLang.addEventListener("change", () => { store.set("guideLang", gLang.value); if (current) openPlace(current, false); });
aiVoice.addEventListener("change", () => store.set("aiVoice", aiVoice.checked));

/* ---------- Joylashuv ---------- */
function setPosition(lat, lon, simulated) {
  me = { lat, lon };
  const near = PLACES.map(p => ({ p, d: haversineKm(lat, lon, p.lat, p.lon) })).sort((a, b) => a.d - b.d);
  renderNear(near.slice(0, 6));
  updateMap(lat, lon, simulated, near[0]);
  const top = near[0];
  document.getElementById("gStatus").textContent = simulated ? "📍 DEMO" : `📡 ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  if (top && top.d * 1000 <= TRIGGER_M && lastAuto !== top.p.id) {
    lastAuto = top.p.id;
    openPlace(top.p, true);
  }
}

function renderNear(list) {
  document.getElementById("gNear").innerHTML = list.map(({ p, d }) => `
    <div class="item"><div><b>${esc(L(p.name))}</b><br><span class="small muted">${esc(L(regionById(p.region).name))}</span></div>
    <div class="row" style="gap:8px"><span class="pill">${d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1) + " km"}</span>
    <button class="btn sm ghost" data-open="${p.id}">▶️</button></div></div>`).join("");
}
document.getElementById("gNear").addEventListener("click", e => {
  const b = e.target.closest("[data-open]"); if (b) openPlace(placeById(b.dataset.open), true);
});

/* ---------- Xarita ---------- */
const gMap = makeMap("gMap", REGIONS[0].center, 15);
const markers = {};
let meMarker = null, meCircle = null, centeredOnce = false;
if (gMap) {
  PLACES.forEach(p => {
    markers[p.id] = LF.marker([p.lat, p.lon], { icon: pinIcon("★") }).addTo(gMap)
      .bindPopup(() => `<b>${esc(L(p.name))}</b><span class="small">${esc(L(p.desc))}</span><br><br>
        <button class="btn sm" data-open="${p.id}">▶️ ${esc(t("guide.listen"))}</button>`);
  });
  gMap.on("popupopen", e => {
    const b = e.popup.getElement().querySelector("[data-open]");
    if (b) b.onclick = () => { primeSpeech(); openPlace(placeById(b.dataset.open), true); gMap.closePopup(); };
  });
  // Demo: xaritani bosib "joylashuvni" o'zgartirish (haqiqiy GPS yoqilmaganda)
  gMap.on("click", e => {
    if (watchId !== null) return;
    primeSpeech();
    setPosition(e.latlng.lat, e.latlng.lng, true);
  });
}

function updateMap(lat, lon, simulated, nearest) {
  if (!gMap) return;
  if (!meMarker) {
    meMarker = LF.marker([lat, lon], { icon: meIcon(), zIndexOffset: 1000, interactive: false }).addTo(gMap);
    meCircle = LF.circle([lat, lon], { radius: TRIGGER_M, color: "#129a9a", weight: 1, fillOpacity: 0.08, interactive: false }).addTo(gMap);
  } else {
    meMarker.setLatLng([lat, lon]); meCircle.setLatLng([lat, lon]);
  }
  Object.entries(markers).forEach(([id, m]) => m.setIcon(pinIcon("★", nearest && nearest.p.id === id ? "near" : "place")));
  if (simulated || !centeredOnce) { gMap.setView([lat, lon], Math.max(gMap.getZoom(), 15)); centeredOnce = true; }
  else if (!gMap.getBounds().contains([lat, lon])) gMap.panTo([lat, lon]);
}

document.getElementById("gGps").addEventListener("click", () => {
  const btn = document.getElementById("gGps");
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId); watchId = null;
    btn.innerHTML = `📡 ${t("guide.startGps")}`; return;
  }
  if (!navigator.geolocation) { document.getElementById("gStatus").textContent = t("guide.gpsDenied"); return; }
  primeSpeech();
  document.getElementById("gStatus").textContent = t("guide.gpsWait");
  watchId = navigator.geolocation.watchPosition(
    pos => setPosition(pos.coords.latitude, pos.coords.longitude, false),
    () => { document.getElementById("gStatus").textContent = t("guide.gpsDenied"); watchId = null; btn.innerHTML = `📡 ${t("guide.startGps")}`; },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
  btn.innerHTML = `⏹ ${t("guide.stopGps")}`;
});

document.getElementById("gSimBtn").addEventListener("click", () => {
  primeSpeech();
  const p = placeById(gSim.value);
  lastAuto = null;
  setPosition(p.lat + 0.0003, p.lon + 0.0002, true); // ~40 m uzoqlikda
});

/* ---------- Hikoya matni ---------- */
async function narration(p, lang) {
  const local = (typeof NARR !== "undefined" && NARR[p.id]) || null;
  const localText = local ? (local[lang] || local.en) : `${p.name[lang] || p.name.en}.\n\n${p.desc[lang] || p.desc.en}`;
  const offline = { text: localText, src: local && local[lang] ? "Tourist.uz" : "Tourist.uz (EN)" };
  if (!gemini.enabled()) return offline;

  const cacheKey = `narr.v2.${p.id}.${lang}`; // v2: uzun matnlar (eski qisqa kesh ishlatilmaydi)
  const cached = store.get(cacheKey);
  if (cached) return { text: cached, src: "Gemini AI (cache)" };
  try {
    const text = await gemini.generate(
      `You are a warm, knowledgeable local tour guide standing with a tourist at "${p.name.en}" in ${regionById(p.region).name.en}, Uzbekistan.
Verified background (use these facts as your main source; do not contradict them):
"""${local ? local.en : p.desc.en}"""
Write a rich spoken audio-tour narration of about 400–500 words in the language with code "${lang}" (${GUIDE_LANGS[lang].name}).
Structure: a welcoming opening; the history (who built it, when and why); 3 architectural or artistic details the tourist can look at right now; one legend clearly marked as a legend; the place's significance today; one practical or etiquette tip; a warm closing sentence.
Only state well-established facts — if unsure about a detail, leave it out. Plain text only, no markdown, no lists, short paragraphs — it will be read aloud.`,
      { temperature: 0.5 }
    );
    const clean = text.replace(/[*#_`]/g, "").trim();
    store.set(cacheKey, clean);
    return { text: clean, src: "Gemini AI" };
  } catch (e) {
    console.warn("Gemini:", e.message);
    return offline; // AI ishlamasa ham batafsil matn o'qiladi
  }
}

async function openPlace(p, autoplay) {
  current = p;
  stopSpeech();
  const lang = guideLang();
  document.getElementById("gNow").classList.remove("hidden");
  document.getElementById("gTitle").textContent = p.name[lang] || L(p.name);
  const ph = document.getElementById("gPhoto");
  if (p.photo) { ph.src = p.photo; ph.alt = L(p.name); ph.title = p.photoCredit ? "📷 " + p.photoCredit : ""; ph.classList.remove("hidden"); }
  else ph.classList.add("hidden");
  const txt = document.getElementById("gText");
  txt.innerHTML = `<span class="spinner"></span> ${t("guide.gen")}`;
  txt.dir = ["ar", "fa"].includes(lang) ? "rtl" : "ltr";
  try {
    const n = await narration(p, lang);
    if (current !== p) return;
    txt.textContent = n.text;
    document.getElementById("gSrc").textContent = n.src;
    if (autoplay) speak(n.text, lang);
  } catch (e) {
    txt.textContent = `${t("common.error")}: ${e.message}\n\n${L(p.desc)}`;
  }
}

/* ---------- Nutq sintezi ---------- */
function primeSpeech() { // iOS/Chrome: foydalanuvchi bosganda ovozni "uyg'otish"
  try { if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(""); speechSynthesis.speak(u); } } catch (e) { /* ignore */ }
}
function findVoice(lang) {
  if (!("speechSynthesis" in window)) return null;
  const bcp = GUIDE_LANGS[lang].bcp.toLowerCase();
  const voices = speechSynthesis.getVoices();
  return voices.find(v => v.lang.toLowerCase() === bcp) || voices.find(v => v.lang.toLowerCase().startsWith(lang)) || null;
}
function stopSpeech() {
  try { speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  if (audioEl) { audioEl.pause(); audioEl = null; }
}
async function speak(text, lang) {
  stopSpeech();
  const voice = findVoice(lang);
  if ((aiVoice.checked || !voice) && gemini.ttsKey()) { // Gemini ovozi — admin kalit kiritgan bo'lsa
    try { await speakGemini(text); return; } catch (e) { console.warn("Gemini TTS:", e.message); }
  }
  if (!voice) { toast(t("guide.noVoice")); return; }
  // Uzun matnni gaplarga bo'lib o'qish (Chrome ~15 soniyadan keyin to'xtab qolmasligi uchun)
  const parts = text.match(/[^.!?。！？]+[.!?。！？]*/g) || [text];
  parts.forEach(s => {
    const u = new SpeechSynthesisUtterance(s.trim());
    u.voice = voice; u.lang = voice.lang; u.rate = 0.95;
    speechSynthesis.speak(u);
  });
}

/* Gemini TTS: 24 kHz 16-bit PCM → WAV */
async function speakGemini(text) {
  const model = gemini.ttsModel();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": gemini.ttsKey() },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } }
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || res.status);
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) throw new Error("no audio");
  const rate = Number((part.inlineData.mimeType.match(/rate=(\d+)/) || [])[1]) || 24000;
  const pcm = Uint8Array.from(atob(part.inlineData.data), c => c.charCodeAt(0));
  audioEl = new Audio(URL.createObjectURL(pcmToWav(pcm, rate)));
  await audioEl.play();
}
function pcmToWav(pcm, rate) {
  const buf = new ArrayBuffer(44 + pcm.length), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);
  return new Blob([buf], { type: "audio/wav" });
}

document.getElementById("gPlay").addEventListener("click", () => {
  if (!current) return;
  const text = document.getElementById("gText").textContent;
  if (text) speak(text, guideLang());
});
document.getElementById("gStopBtn").addEventListener("click", stopSpeech);
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => {};

document.addEventListener("langchange", () => {
  renderControls();
  if (me) setPosition(me.lat, me.lon, true);
  if (current) openPlace(current, false); // hikoyani yangi tilda qayta yuklash
});
document.addEventListener("aiconfig", renderControls);
renderControls();
// Boshlang'ich holat: tanlangan hudud markazi
const startReg = regionById(store.get("trip", {}).region) || REGIONS[0];
setPosition(startReg.center[0] - 0.004, startReg.center[1] - 0.004, true);
