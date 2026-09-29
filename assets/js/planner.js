/* AI Sayohat Planner: budjet + kunlar + qiziqishlar → kunlik marshrut, ovqatlanish, chiptalar to'plami */

renderNav("planner");

const INTERESTS = ["history", "religion", "museum", "bazaar", "food", "modern", "craft"];
const MEAL = { lunch: 80000, dinner: 120000 }; // o'rtacha, so'm
const TAXI_PER_DAY = 60000;
const pf = Object.assign({ region: store.get("trip", {}).region || "samarkand", days: 3, budget: 200, interests: ["history", "food"], free: "" },
  store.get("plannerForm", {}));

function renderForm() {
  document.getElementById("pRegion").innerHTML = REGIONS.map(r => `<option value="${r.id}">${r.emoji} ${esc(L(r.name))}</option>`).join("");
  document.getElementById("pRegion").value = pf.region;
  document.getElementById("pDays").value = pf.days;
  document.getElementById("pBudget").value = pf.budget;
  document.getElementById("pFree").value = pf.free;
  document.getElementById("pInterests").innerHTML = INTERESTS.map(i =>
    `<button type="button" class="chip ${pf.interests.includes(i) ? "sel" : ""}" data-i="${i}">${t("plan.i." + i)}</button>`).join("");
}
document.getElementById("pInterests").addEventListener("click", e => {
  const b = e.target.closest("[data-i]"); if (!b) return;
  const i = b.dataset.i;
  pf.interests = pf.interests.includes(i) ? pf.interests.filter(x => x !== i) : pf.interests.concat(i);
  renderForm();
});

/* ---------- Oflayn algoritm (AI kaliti bo'lmaganda) ---------- */
function offlinePlan() {
  const want = pf.interests.length ? pf.interests : INTERESTS;
  let pool = PLACES.filter(p => p.region === pf.region && p.type !== "food") // ovqat joylari — tushlik/kechki ovqatda
    .map(p => ({ p, s: p.rating + (want.includes(p.type) ? 1 : 0) }))
    .sort((a, b) => b.s - a.s).map(x => x.p);
  const budget = pf.budget * USD_RATE;
  const perDayFixed = MEAL.lunch + MEAL.dinner + TAXI_PER_DAY;
  let ticketBudget = budget - perDayFixed * pf.days;
  const days = [];
  for (let d = 0; d < pf.days; d++) {
    let hours = 0; const chosen = [];
    for (const p of pool) {
      if (chosen.length >= 4 || hours + p.hours > 6.5) continue;
      if (p.price > ticketBudget && p.price > 0) continue;
      chosen.push(p); hours += p.hours; ticketBudget -= p.price;
    }
    pool = pool.filter(p => !chosen.includes(p));
    const order = optimizeOrder(chosen.map(p => p.id)).map(placeById);
    const items = []; let clock = 9 * 60, lunchDone = false;
    order.forEach((p, i) => {
      if (i > 0) clock += 20;
      if (!lunchDone && clock >= 12.5 * 60) { items.push(meal("lunch", clock)); clock += 60; lunchDone = true; }
      items.push({ time: fmtMin(clock), kind: "place", id: p.id, title: L(p.name), note: L(p.desc), cost: p.price });
      clock += p.hours * 60;
    });
    if (!lunchDone) { items.push(meal("lunch", Math.max(clock, 13 * 60))); clock = Math.max(clock, 13 * 60) + 60; }
    items.push(meal("dinner", Math.max(clock + 30, 19 * 60)));
    items.push({ time: "", kind: "transfer", title: t("trip.transportCost"), note: "🚕", cost: TAXI_PER_DAY });
    days.push({ title: order.length ? L(order[0].name) : L(regionById(pf.region).name), items });
  }
  return { source: "offline", days, tips: [] };
}
function meal(kind, min) {
  const spot = PLACES.find(p => p.region === pf.region && p.type === "food");
  const label = { uz: { lunch: "Tushlik", dinner: "Kechki ovqat" }, en: { lunch: "Lunch", dinner: "Dinner" }, ru: { lunch: "Обед", dinner: "Ужин" } }[getLang()][kind];
  return { time: fmtMin(min), kind: "meal", title: `🍽️ ${label}${spot ? " — " + L(spot.name) : ""}`,
    note: kind === "lunch" ? "Osh / plov, somsa, non" : "Shashlik, lag'mon, manti", cost: MEAL[kind] };
}
function fmtMin(m) { m = Math.round(m); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }

/* ---------- Gemini AI ---------- */
async function aiPlan() {
  const list = PLACES.filter(p => p.region === pf.region)
    .map(p => `${p.id} | ${p.name.en} | ${p.type} | ticket ${p.price} UZS | ~${p.hours}h | rating ${p.rating}`).join("\n");
  const langName = { uz: "Uzbek (Latin script)", en: "English", ru: "Russian" }[getLang()];
  const country = countryByCode(store.get("trip", {}).country || "OTHER");
  const res = await gemini.generate(
    `Create a ${pf.days}-day itinerary in ${regionById(pf.region).name.en}, Uzbekistan for a tourist (citizenship: ${country.name}).
Budget: $${pf.budget} total (1 USD = ${USD_RATE} UZS) covering entrance tickets, meals and local transport (accommodation NOT included).
Interests: ${pf.interests.join(", ") || "any"}. Extra wishes: ${pf.free || "none"}.
Known places (id | name | type | ticket | duration | rating):
${list}
Rules: use place ids from the list for sights (kind "place"); you may add meals (kind "meal") naming a real type of national dish/restaurant area with realistic cost in UZS; add one "transfer" item per day for local transport cost; 3–5 sights per day max, logical geographic order, realistic times from ~09:00.
All human-readable text in ${langName}.
Return JSON: {"days":[{"title":"...","items":[{"time":"HH:MM","kind":"place|meal|transfer","id":"<place id or empty>","title":"...","note":"one sentence","cost":<number UZS>}]}],"tips":["...","..."]}`,
    { json: true, system: "You are an expert local travel planner for Uzbekistan. Be realistic about prices and distances.", temperature: 0.6 }
  );
  // Tekshiruv: noma'lum id'larni tashlab yuborish, chipta narxini bazadan olish
  const days = (res.days || []).slice(0, pf.days).map(d => ({
    title: String(d.title || ""),
    items: (d.items || []).filter(it => it.kind !== "place" || (placeById(it.id) && placeById(it.id).region === pf.region)).map(it => {
      const p = it.kind === "place" ? placeById(it.id) : null;
      return { time: String(it.time || ""), kind: it.kind || "note", id: p ? p.id : "", title: p ? L(p.name) : String(it.title || ""),
        note: String(it.note || ""), cost: p ? p.price : Math.max(0, Number(it.cost) || 0) };
    })
  }));
  if (!days.length) throw new Error("Empty plan");
  return { source: "ai", days, tips: (res.tips || []).map(String).slice(0, 6) };
}

/* ---------- Natijani chizish ---------- */
function renderPlan(plan) {
  const box = document.getElementById("result");
  let tickets = 0, meals = 0, transport = 0;
  plan.days.forEach(d => d.items.forEach(it => {
    if (it.kind === "place") tickets += it.cost; else if (it.kind === "meal") meals += it.cost; else if (it.kind === "transfer") transport += it.cost;
  }));
  const total = tickets + meals + transport, budget = pf.budget * USD_RATE;
  const ids = [...new Set(plan.days.flatMap(d => d.items.filter(i => i.kind === "place" && placeById(i.id)?.price).map(i => i.id)))];

  box.innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <h2 style="margin:0">${plan.source === "ai" ? "✨ " + t("plan.aiResult") : "⚙️ " + t("plan.offline")}</h2>
      <button class="btn gold" id="addPlanTickets" ${ids.length ? "" : "disabled"}>🎟️ ${t("plan.addTickets")} (${ids.length})</button>
    </div>
    ${plan.source === "offline" && !gemini.enabled() ? `<p class="notice small">${t("common.aiNeeded")}</p>` : ""}
    <div class="summary" style="margin:16px 0">
      <div class="card"><span class="muted small">${t("trip.tickets")}</span><b>${money(tickets)}</b></div>
      <div class="card"><span class="muted small">${t("plan.meal")}</span><b>${money(meals)}</b></div>
      <div class="card"><span class="muted small">${t("trip.transportCost")}</span><b>${money(transport)}</b></div>
      <div class="card" style="border-color:${total > budget ? "var(--danger)" : "var(--ok)"}"><span class="muted small">${t("plan.budgetUsed")}</span>
        <b>${usd(total)} / $${pf.budget}</b><span class="small muted">${money(total)}</span></div>
    </div>
    ${total > budget ? `<p class="notice">${t("plan.overBudget")}</p>` : ""}
    <div class="grid c2" style="align-items:start">
      ${plan.days.map((d, i) => `
        <div class="card">
          <span class="pill gold">${i + 1}-${t("plan.day")}</span>
          <h3 style="margin-top:8px">${esc(d.title)}</h3>
          <div class="timeline">
            ${d.items.map(it => `
              <div class="tl-item ${it.kind === "meal" ? "meal" : it.kind === "transfer" ? "leg" : ""}">
                <div class="card flat" style="padding:10px 14px">
                  <div class="row" style="justify-content:space-between">
                    <span>${it.time ? `<span class="time">${esc(it.time)}</span> · ` : ""}<b>${esc(it.title)}</b></span>
                    <span class="small">${money(it.cost)}</span></div>
                  ${it.note ? `<div class="small muted">${esc(it.note)}</div>` : ""}
                </div></div>`).join("")}
          </div>
        </div>`).join("")}
    </div>
    ${plan.tips.length ? `<div class="card" style="margin-top:16px"><h3>💡 ${t("trip.aiTips")}</h3><ul>${plan.tips.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}`;

  document.getElementById("addPlanTickets").onclick = () => {
    ids.forEach(id => cart.add(id)); toast("🎟️ " + t("common.added"), "ok");
    setTimeout(() => { location.href = "cart.html"; }, 700);
  };
}

document.getElementById("planForm").addEventListener("submit", async e => {
  e.preventDefault();
  pf.region = document.getElementById("pRegion").value;
  pf.days = Math.min(7, Math.max(1, parseInt(document.getElementById("pDays").value) || 1));
  pf.budget = Math.max(20, parseInt(document.getElementById("pBudget").value) || 200);
  pf.free = document.getElementById("pFree").value.trim();
  store.set("plannerForm", pf);
  const btn = document.getElementById("pGo"), status = document.getElementById("pStatus");
  btn.disabled = true; status.innerHTML = `<span class="spinner"></span> ${t("common.loading")}`;
  let plan;
  try {
    plan = gemini.enabled() ? await aiPlan() : offlinePlan();
    status.textContent = "";
  } catch (err) {
    status.textContent = `${t("common.error")}: ${err.message}`;
    plan = offlinePlan();
  }
  store.set("lastPlan", { form: { ...pf }, plan });
  btn.disabled = false;
  renderPlan(plan);
  document.getElementById("result").scrollIntoView({ behavior: "smooth" });
});

document.addEventListener("langchange", renderForm);
renderForm();
const last = store.get("lastPlan");
if (last && last.form.region === pf.region) renderPlan(last.plan);
