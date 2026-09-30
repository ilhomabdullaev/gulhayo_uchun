/* Sayohat ustasi: fuqarolik → hudud → joylar (AI tartiblaydi) → marshrut va yo'l vaqti */

const state = Object.assign(
  { country: null, region: null, selected: [], mode: "taxi", start: "09:00", step: 1 },
  store.get("trip", {})
);
const save = () => store.set("trip", state);
const MUSLIM_MAJORITY = ["UZ", "TR", "AE", "SA", "IR", "KZ", "KG"];

renderNav("trip");

/* ---------- Qadamlar ---------- */
function go(n) {
  if (n >= 2 && !state.country) n = 1;
  if (n >= 3 && !state.region) n = 2;
  if (n >= 4 && !state.selected.length) { toast(t("trip.s3"), "error"); n = 3; }
  state.step = n; save();
  document.querySelectorAll(".step").forEach((s, i) => s.classList.toggle("hidden", i + 1 !== n));
  document.querySelectorAll("#stepper span").forEach((s, i) => { s.className = i + 1 < n ? "done" : i + 1 === n ? "cur" : ""; });
  if (n === 1) renderCountries();
  if (n === 2) renderRegions();
  if (n === 3) renderPlaces();
  if (n === 4) renderRoute();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- 1. Fuqarolik ---------- */
function renderCountries() {
  const q = (document.getElementById("countrySearch").value || "").toLowerCase();
  document.getElementById("countries").innerHTML = COUNTRIES
    .filter(c => c.name.toLowerCase().includes(q))
    .map(c => `<button class="choice ${state.country === c.code ? "sel" : ""}" data-c="${c.code}">
        <span class="big">${c.flag}</span><span>${esc(c.name)}<br><span class="small muted">🎧 ${esc(GUIDE_LANGS[c.lang].name)}</span></span></button>`)
    .join("");
}
document.getElementById("countrySearch").addEventListener("input", renderCountries);
document.getElementById("countries").addEventListener("click", e => {
  const b = e.target.closest("[data-c]"); if (!b) return;
  const c = countryByCode(b.dataset.c);
  if (state.country !== c.code) { state.country = c.code; delete state.rank; }
  if (!store.get("lang")) setLang(c.ui); // birinchi marta — interfeys tilini ham moslash
  store.set("guideLang", c.lang);         // gid — sayyohning ona tilida (setLang'dan keyin)
  save(); go(2);
});

/* ---------- 2. Hudud ---------- */
function renderRegions() {
  document.getElementById("regions").innerHTML = REGIONS.map(r => {
    const n = PLACES.filter(p => p.region === r.id).length;
    return `<button class="choice ${state.region === r.id ? "sel" : ""}" data-r="${r.id}">
      <span class="big">${r.emoji}</span><span><b>${esc(L(r.name))}</b><br><span class="small muted">${n} ${t("stats.places")}</span></span></button>`;
  }).join("");
}
document.getElementById("regions").addEventListener("click", e => {
  const b = e.target.closest("[data-r]"); if (!b) return;
  if (state.region !== b.dataset.r) { state.region = b.dataset.r; state.selected = []; delete state.rank; }
  save(); go(3);
});

/* ---------- 3. Joylar ---------- */
function offlineRank() {
  const muslim = MUSLIM_MAJORITY.includes(state.country);
  return PLACES.filter(p => p.region === state.region)
    .map(p => ({ id: p.id, score: p.rating + (muslim && p.type === "religion" ? 0.3 : 0) + (p.type === "history" ? 0.1 : 0) }))
    .sort((a, b) => b.score - a.score)
    .map(x => ({ id: x.id, why: "" }));
}

function currentRank() {
  const key = `${state.region}|${state.country}|${getLang()}`;
  return state.rank && state.rank.key === key ? state.rank.list : offlineRank();
}

async function aiRank() {
  const status = document.getElementById("aiStatus");
  if (!gemini.enabled()) { status.textContent = t("common.aiNeeded"); return; }
  const country = countryByCode(state.country);
  const list = PLACES.filter(p => p.region === state.region)
    .map(p => `${p.id}: ${p.name.en} (${p.type}, rating ${p.rating}, ~${p.hours}h)`).join("\n");
  const langName = { uz: "Uzbek (Latin script)", en: "English", ru: "Russian" }[getLang()];
  status.innerHTML = `<span class="spinner"></span> ${t("common.loading")}`;
  try {
    const res = await gemini.generate(
      `A tourist who is a citizen of ${country.name} is visiting ${regionById(state.region).name.en}, Uzbekistan.
Rank ALL of the following places from most to least recommended for this tourist, considering cultural interest for their background, fame and logical visiting order.
Places (id: name):
${list}
Return JSON: {"ranking":[{"id":"<id>","why":"<one short sentence in ${langName} explaining why>"}]}`,
      { json: true, system: "You are an expert Uzbekistan travel guide. Only use the ids provided.", temperature: 0.4 }
    );
    const valid = (res.ranking || []).filter(r => placeById(r.id) && placeById(r.id).region === state.region);
    const missing = offlineRank().filter(r => !valid.some(v => v.id === r.id));
    state.rank = { key: `${state.region}|${state.country}|${getLang()}`, list: valid.concat(missing) };
    save();
    status.textContent = "✨ Gemini AI";
    renderPlaces();
  } catch (e) {
    status.textContent = `${t("common.error")}: ${e.message}`;
  }
}
document.getElementById("aiRankBtn").addEventListener("click", aiRank);

function renderPlaces() {
  const rank = currentRank().filter(r => placeById(r.id)); // admin o'chirgan joylarni tashlab ketish
  document.getElementById("places").innerHTML = rank.map((r, i) => {
    const p = placeById(r.id);
    const idx = state.selected.indexOf(p.id);
    return `<div class="card place ${idx >= 0 ? "sel" : ""}" data-p="${p.id}">
      ${idx >= 0 ? `<span class="order">${idx + 1}</span>` : ""}
      <div class="meta"><span class="rank">#${i + 1}</span><span class="pill">★ ${p.rating.toFixed(1)}</span>
        <span class="pill accent">${t("plan.i." + p.type) !== "plan.i." + p.type ? t("plan.i." + p.type) : p.type}</span>
        <span class="pill">⏱ ${dur(p.hours * 60)}</span></div>
      <h3>${esc(L(p.name))}</h3>
      <p class="muted small" style="margin:0">${esc(L(p.desc))}</p>
      ${r.why ? `<div class="ai-why">✨ ${esc(r.why)}</div>` : ""}
      <div class="meta" style="margin-top:auto"><b>${money(p.price)}</b>${p.price ? `<span class="small muted">${usd(p.price)}</span>` : ""}</div>
    </div>`;
  }).join("");
  document.getElementById("selCount").textContent = state.selected.length;
  document.getElementById("toRoute").disabled = !state.selected.length;
  if (!state.rank && gemini.enabled()) aiRank();
  else if (!gemini.enabled()) document.getElementById("aiStatus").textContent = t("common.aiNeeded");
}
document.getElementById("places").addEventListener("click", e => {
  const c = e.target.closest("[data-p]"); if (!c) return;
  const id = c.dataset.p, i = state.selected.indexOf(id);
  if (i >= 0) state.selected.splice(i, 1);
  else if (state.selected.length >= 5) { toast(t("trip.max"), "error"); return; }
  else state.selected.push(id);
  save(); renderPlaces();
});

/* ---------- 4. Marshrut ---------- */
function buildSchedule() {
  const [h, m] = state.start.split(":").map(Number);
  let clock = new Date(); clock.setHours(h, m, 0, 0);
  const rows = []; let roadMin = 0, tickets = 0, transport = 0, km = 0;
  state.selected.forEach((id, i) => {
    const p = placeById(id);
    if (i > 0) {
      const prev = placeById(state.selected[i - 1]);
      const leg = estimateLeg(prev, p, state.mode, clock);
      rows.push({ kind: "leg", from: prev, to: p, leg, at: new Date(clock) });
      clock = new Date(clock.getTime() + leg.minutes * 60000);
      roadMin += leg.minutes; transport += leg.cost; km += leg.km;
    }
    const arrive = new Date(clock);
    clock = new Date(clock.getTime() + p.hours * 60 * 60000);
    rows.push({ kind: "place", p, arrive, leave: new Date(clock) });
    tickets += p.price;
  });
  return { rows, end: clock, roadMin, tickets, transport, km };
}

function trafficClass(f) { return f >= 1.5 ? "high" : f >= 1.2 ? "mid" : "low"; }

function renderRoute() {
  document.getElementById("routeRegion").textContent = L(regionById(state.region).name);
  document.getElementById("startTime").value = state.start;
  document.getElementById("modes").innerHTML = Object.keys(TRANSPORT).map(k =>
    `<button data-m="${k}" class="${state.mode === k ? "sel" : ""}">${TRANSPORT[k].icon} ${t("trip.t." + k)}</button>`).join("");

  const s = buildSchedule();
  document.getElementById("timeline").innerHTML = s.rows.map(r => {
    if (r.kind === "leg") {
      const ln = mapLinks(r.from, r.to, state.mode);
      const tf = TRANSPORT[state.mode].traffic
        ? `<span class="traffic ${trafficClass(r.leg.factor)}">${t("trip.traffic")} ×${r.leg.factor.toFixed(2)}</span>` : "";
      return `<div class="tl-item leg"><div class="card small">
        ${TRANSPORT[state.mode].icon} ${t("trip.road")}: <b>${dur(r.leg.minutes)}</b> · ${r.leg.km.toFixed(1)} ${t("common.km")} ${tf}
        ${r.leg.cost ? ` · ${money(r.leg.cost)}` : ""}<br>
        <a href="${ln.yandex}" target="_blank" rel="noopener">${t("common.yandex")}</a> ·
        <a href="${ln.google}" target="_blank" rel="noopener">${t("common.google")}</a></div></div>`;
    }
    const inCart = cart.has(r.p.id);
    return `<div class="tl-item"><div class="card">
      <div class="row" style="justify-content:space-between">
        <span class="time">${hhmm(r.arrive)} – ${hhmm(r.leave)}</span>
        <span class="pill">${t("trip.stay")}: ${dur(r.p.hours * 60)}</span></div>
      <h3 style="margin:6px 0">${esc(L(r.p.name))}</h3>
      <div class="row" style="justify-content:space-between">
        <b>${money(r.p.price)}</b>
        ${r.p.price ? `<button class="btn sm ${inCart ? "ghost" : "gold"}" data-add="${r.p.id}">${t(inCart ? "common.added" : "common.add")}</button>` : ""}
      </div></div></div>`;
  }).join("") + `<div class="tl-item"><div class="card flat"><span class="time">${hhmm(s.end)}</span> — ${t("trip.end")} 🌙</div></div>`;

  document.getElementById("summary").innerHTML = `
    <div class="card"><span class="muted small">${t("trip.road")}</span><b>${dur(s.roadMin)}</b><span class="small muted">${s.km.toFixed(1)} ${t("common.km")}</span></div>
    <div class="card"><span class="muted small">${t("trip.tickets")}</span><b>${money(s.tickets)}</b><span class="small muted">${s.tickets ? usd(s.tickets) : ""}</span></div>
    <div class="card"><span class="muted small">${t("trip.transportCost")}</span><b>${money(s.transport)}</b></div>
    <div class="card"><span class="muted small">${t("trip.total")}</span><b>${money(s.tickets + s.transport)}</b><span class="small muted">${usd(s.tickets + s.transport)}</span></div>`;
  drawRouteMap();
}

/* Marshrut xaritasi (OpenStreetMap): tartib raqamli belgilar va yo'nalish chizig'i */
let routeMap = null, routeLayer = null;
function drawRouteMap() {
  if (!LF) return;
  if (!routeMap) { routeMap = makeMap("routeMap", regionById(state.region).center, 14); routeLayer = LF.layerGroup().addTo(routeMap); }
  routeMap.invalidateSize(); // yashirin qadamdan ko'ringanda o'lchamni yangilash
  routeLayer.clearLayers();
  const pts = state.selected.map(placeById);
  pts.forEach((p, i) => LF.marker([p.lat, p.lon], { icon: pinIcon(String(i + 1), "route") })
    .bindPopup(`<b>${i + 1}. ${esc(L(p.name))}</b>${money(p.price)}`).addTo(routeLayer));
  if (pts.length > 1) LF.polyline(pts.map(p => [p.lat, p.lon]), { color: "#1b4f9c", weight: 4, opacity: .75, dashArray: "8 8" }).addTo(routeLayer);
  if (pts.length) routeMap.fitBounds(LF.latLngBounds(pts.map(p => [p.lat, p.lon])).pad(0.25), { maxZoom: 16 });
}

document.getElementById("modes").addEventListener("click", e => {
  const b = e.target.closest("[data-m]"); if (!b) return;
  state.mode = b.dataset.m; save(); renderRoute();
});
document.getElementById("startTime").addEventListener("change", e => { state.start = e.target.value || "09:00"; save(); renderRoute(); });
document.getElementById("optBtn").addEventListener("click", () => { state.selected = optimizeOrder(state.selected); save(); renderRoute(); });
document.getElementById("timeline").addEventListener("click", e => {
  const b = e.target.closest("[data-add]"); if (!b) return;
  cart.add(b.dataset.add); renderRoute(); toast("🎟️ " + L(placeById(b.dataset.add).name), "ok");
});
document.getElementById("addAll").addEventListener("click", () => {
  state.selected.forEach(id => cart.add(id)); renderRoute(); toast("🎟️ " + t("common.added"), "ok");
  setTimeout(() => { location.href = "cart.html"; }, 700);
});

document.getElementById("tipsBtn").addEventListener("click", async () => {
  const box = document.getElementById("tips");
  box.classList.remove("hidden");
  if (!gemini.enabled()) { box.innerHTML = `<p class="small">${t("common.aiNeeded")}</p>`; return; }
  box.innerHTML = `<span class="spinner"></span> ${t("common.loading")}`;
  const s = buildSchedule();
  const plan = s.rows.filter(r => r.kind === "place").map(r => `${hhmm(r.arrive)} ${r.p.name.en}`).join("; ");
  const langName = { uz: "Uzbek (Latin script)", en: "English", ru: "Russian" }[getLang()];
  try {
    const text = await gemini.generate(
      `Tourist from ${countryByCode(state.country).name} in ${regionById(state.region).name.en}. Day plan: ${plan}. Transport: ${state.mode}.
Give 5 short practical tips (bullet points starting with "• ") in ${langName}: best photo spots, dress code for religious sites, where to eat nearby (national dishes), money/cards, and one cultural etiquette tip. Plain text, no markdown headings.`,
      { temperature: 0.7 }
    );
    box.innerHTML = `<h3>✨ ${t("trip.aiTips")}</h3><div class="guide-text">${esc(text.replace(/\*\*/g, ""))}</div>`;
  } catch (e) { box.innerHTML = `<p class="small">${t("common.error")}: ${esc(e.message)}</p>`; }
});

document.addEventListener("langchange", () => go(state.step));
document.addEventListener("cloudplaces", () => { // admin narx/faollikni o'zgartirgan bo'lsa
  state.selected = state.selected.filter(id => placeById(id)); save(); go(state.step);
});
go(state.step || 1);
