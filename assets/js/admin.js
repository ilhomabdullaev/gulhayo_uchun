/* Admin panel: statistika, buyurtmalar, chipta tekshirish, obidalar narxi, foydalanuvchilar.
 * Kirish huquqi ikki joyda tekshiriladi: bu yerda (interfeys) va firestore.rules'da (haqiqiy himoya). */

renderNav("admin");
const $ = id => document.getElementById(id);
let ORDERS = [], USERS = [];

function fmtDate(ms) { return ms ? new Date(ms).toLocaleString("ru-RU").slice(0, 17) : "—"; }
function itemsText(o) { return o.items.map(i => `${L(placeById(i.id)?.name) || i.id} × ${i.qty}`).join(", "); }

/* ---------- Kirish nazorati ---------- */
cloud.onChange(user => {
  const gate = $("gate");
  gate.classList.remove("hidden");
  if (!cloud.enabled) {
    gate.innerHTML = `<h3>Firebase hali ulanmagan</h3>
      <p>Admin panel ishlashi uchun <code>assets/js/firebase-config.js</code> fayliga Firebase sozlamasini qo'yish kerak.
      Batafsil: README → «Firebase ulash».</p>`;
    return;
  }
  if (!user) {
    gate.innerHTML = `<p>Admin panelga kirish uchun tizimga kiring.</p><a class="btn" href="login.html?next=admin.html">${t("acc.login")}</a>`;
    $("panel").classList.add("hidden"); $("refresh").classList.add("hidden");
    return;
  }
  if (!cloud.isAdmin()) {
    const d = cloud.adminDiag || {};
    gate.innerHTML = `<h3>⛔ Ruxsat yo'q</h3><p class="small">Siz <b>${esc(user.email)}</b> sifatida kirdingiz. Bu email admin emas.
      Admin Firebase Console → Firestore → Rules ichida belgilanadi va email tasdiqlangan bo'lishi kerak
      (eng osoni — «Google orqali kirish»).</p>
      <div class="notice small"><b>Tashxis:</b><br>
        Kirish usuli: ${esc(d.provider || "—")}<br>
        Email tasdiqlangan: ${d.emailVerified === true ? "✅ ha" : d.emailVerified === false ? "❌ yo'q — «Chiqish», so'ng «Google orqali kirish»" : "—"}<br>
        Firestore javobi: <code>${esc(d.error || "—")}</code></div>
      <button class="btn" id="recheck" style="margin-top:12px">🔄 Qayta tekshirish</button>`;
    $("recheck").onclick = async () => {
      $("recheck").disabled = true;
      const okAdmin = await cloud.recheckAdmin().catch(() => false);
      if (!okAdmin) toast("Hali ham admin emas — tashxisga qarang", "error");
    };
    $("panel").classList.add("hidden");
    return;
  }
  gate.classList.add("hidden");
  $("panel").classList.remove("hidden");
  $("refresh").classList.remove("hidden");
  loadAll();
});

async function loadAll() {
  $("kpis").innerHTML = `<span class="spinner"></span>`;
  try {
    [ORDERS, USERS] = await Promise.all([cloud.allOrders(), cloud.allUsers()]);
  } catch (e) {
    $("kpis").innerHTML = `<p class="notice">Ma'lumot yuklanmadi: ${esc(authError(e))}</p>`;
    return;
  }
  renderStats(); renderOrders(); renderPlaces(); renderUsers();
}
$("refresh").onclick = loadAll;

/* ---------- Tablar ---------- */
$("tabs").addEventListener("click", e => {
  const b = e.target.closest("[data-tab]"); if (!b) return;
  document.querySelectorAll("#tabs button").forEach(x => x.classList.toggle("sel", x === b));
  document.querySelectorAll("[data-pane]").forEach(p => p.classList.toggle("hidden", p.dataset.pane !== b.dataset.tab));
  if (b.dataset.tab === "check") $("checkCode").focus();
});

/* ---------- Statistika ---------- */
function renderStats() {
  const valid = ORDERS.filter(o => o.status !== "cancelled");
  const revenue = valid.reduce((s, o) => s + (o.total || 0), 0);
  const tickets = valid.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const used = ORDERS.filter(o => o.status === "used").length;
  const today = new Date().toDateString();
  const todayCount = ORDERS.filter(o => o.createdMs && new Date(o.createdMs).toDateString() === today).length;
  $("kpis").innerHTML = [
    ["Foydalanuvchilar", USERS.length, ""], ["Buyurtmalar", ORDERS.length, `bugun: ${todayCount}`],
    ["Sotilgan chiptalar", tickets, `ishlatilgan buyurtma: ${used}`], ["Tushum (demo)", money(revenue), usd(revenue)]
  ].map(([k, v, sub]) => `<div class="card"><span class="muted small">${k}</span><b>${v}</b><span class="small muted">${sub}</span></div>`).join("");

  const byPlace = {}, byRegion = {};
  valid.forEach(o => o.items.forEach(i => {
    const p = placeById(i.id); if (!p) return;
    byPlace[i.id] = byPlace[i.id] || { qty: 0, sum: 0 };
    byPlace[i.id].qty += i.qty; byPlace[i.id].sum += (i.price || p.price) * i.qty;
    byRegion[p.region] = (byRegion[p.region] || 0) + (i.price || p.price) * i.qty;
  }));
  const top = Object.entries(byPlace).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  $("topPlaces").innerHTML = top.length ? `<table><thead><tr><th>Obida</th><th>Chipta</th><th>Summa</th></tr></thead><tbody>
    ${top.map(([id, v]) => `<tr><td>${esc(L(placeById(id).name))}</td><td>${v.qty}</td><td>${money(v.sum)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="muted small">Hali buyurtma yo'q</p>`;
  const regs = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);
  $("byRegion").innerHTML = regs.length ? `<table><thead><tr><th>Hudud</th><th>Tushum</th></tr></thead><tbody>
    ${regs.map(([r, v]) => `<tr><td>${esc(L(regionById(r).name))}</td><td>${money(v)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="muted small">—</p>`;
}

/* ---------- Buyurtmalar ---------- */
$("oStatus").innerHTML += ORDER_STATUSES.map(s => `<option value="${s}">${statusLabel(s)}</option>`).join("");
function statusSelect(o) {
  return `<select data-status="${esc(o.docId)}" style="width:auto;padding:4px 8px">${ORDER_STATUSES.map(s =>
    `<option value="${s}" ${o.status === s ? "selected" : ""}>${statusLabel(s)}</option>`).join("")}</select>`;
}
function renderOrders() {
  const q = $("oSearch").value.trim().toLowerCase(), st = $("oStatus").value;
  const list = ORDERS.filter(o => (!st || o.status === st) &&
    (!q || [o.id, o.email, o.name].some(v => (v || "").toLowerCase().includes(q))));
  $("ordersTable").innerHTML = list.length ? `<table><thead><tr><th>Kod</th><th>Yaratilgan</th><th>Tashrif</th><th>Mijoz</th>
    <th>Chiptalar</th><th>Summa</th><th>Holat</th></tr></thead><tbody>
    ${list.map(o => `<tr><td><code>${esc(o.id)}</code></td><td class="small">${fmtDate(o.createdMs)}</td><td>${esc(o.date)}</td>
      <td class="small">${esc(o.name)}<br><span class="muted">${esc(o.email)}</span></td>
      <td class="small">${esc(itemsText(o))}</td><td>${money(o.total)}</td><td>${statusSelect(o)}</td></tr>`).join("")}
    </tbody></table>` : `<p class="muted small">Buyurtma topilmadi</p>`;
}
$("oSearch").addEventListener("input", renderOrders);
$("oStatus").addEventListener("change", renderOrders);
$("ordersTable").addEventListener("change", async e => {
  const sel = e.target.closest("[data-status]"); if (!sel) return;
  await changeStatus(sel.dataset.status, sel.value);
});
async function changeStatus(docId, status) {
  try {
    await cloud.setOrderStatus(docId, status);
    const o = ORDERS.find(x => x.docId === docId); if (o) o.status = status;
    toast("✓ " + statusLabel(status), "ok"); renderStats(); renderOrders();
  } catch (e) { toast(authError(e), "error"); }
}

/* ---------- Chipta tekshirish (kassir rejimi) ---------- */
$("checkForm").addEventListener("submit", async e => {
  e.preventDefault();
  let code = $("checkCode").value.trim().toUpperCase();
  if (code.startsWith("TOURIST.UZ|")) code = code.split("|")[1]; // QR matnining o'zi kiritilsa
  const o = ORDERS.find(x => x.id.toUpperCase() === code);
  const box = $("checkResult");
  if (!o) { box.innerHTML = `<p class="notice">❌ <b>${esc(code)}</b> — bunday chipta topilmadi. «Yangilash» tugmasini bosib qayta urinib ko'ring.</p>`; return; }
  const todayIso = new Date().toISOString().slice(0, 10);
  const warn = o.status === "used" ? "⚠️ Bu chipta avval ishlatilgan!" : o.status === "cancelled" ? "⚠️ Bu buyurtma bekor qilingan!"
    : o.date !== todayIso ? `⚠️ Tashrif sanasi: ${esc(o.date)} (bugun emas)` : "";
  box.innerHTML = `<div class="card flat">
    <div class="row" style="justify-content:space-between"><code>${esc(o.id)}</code><span class="status ${esc(o.status)}">${statusLabel(o.status)}</span></div>
    <p><b>${esc(o.name)}</b> · ${esc(o.email)}<br>📅 ${esc(o.date)}</p><p class="small">${esc(itemsText(o))}</p>
    ${warn ? `<p class="notice small">${warn}</p>` : `<p style="color:var(--ok);font-weight:700">✅ Chipta haqiqiy</p>`}
    ${o.status === "paid_demo" ? `<button class="btn accent" id="markUsed">Kirishga ruxsat berish (ishlatildi deb belgilash)</button>` : ""}
  </div>`;
  const mb = $("markUsed");
  if (mb) mb.onclick = async () => { await changeStatus(o.docId, "used"); $("checkForm").requestSubmit(); };
});

/* ---------- Obidalar va narxlar ---------- */
function renderPlaces() {
  $("placesTable").innerHTML = `<table><thead><tr><th></th><th>Obida</th><th>Narx, so'm</th><th>Surat havolasi (https://…)</th><th>Faol</th><th></th></tr></thead><tbody>
    ${PLACES_ALL.map(p => `<tr><td style="width:72px">${placeMedia(p, "thumb")}</td>
      <td><b>${esc(L(p.name))}</b><br><span class="small muted">${esc(L(regionById(p.region).name))}</span></td>
      <td><input type="number" min="0" step="1000" value="${p.price}" data-price="${p.id}" style="width:120px"></td>
      <td><input type="url" placeholder="https://…jpg" value="${esc(p.photo || "")}" data-photo="${p.id}" style="min-width:220px"></td>
      <td><input type="checkbox" data-active="${p.id}" ${p.active !== false ? "checked" : ""} style="width:auto"></td>
      <td><button class="btn sm" data-save="${p.id}">Saqlash</button></td></tr>`).join("")}</tbody></table>
    <p class="small muted" style="margin-top:10px">Surat uchun o'zingiz olgan yoki litsenziyasi ruxsat bergan rasm havolasini kiriting (https bilan boshlanishi shart).
    Bo'sh qoldirilsa — obida turiga mos naqshli rasm ko'rsatiladi.</p>`;
}
$("placesTable").addEventListener("click", async e => {
  const b = e.target.closest("[data-save]"); if (!b) return;
  const id = b.dataset.save, q = sel => $("placesTable").querySelector(sel);
  const price = Math.max(0, parseInt(q(`[data-price="${id}"]`).value) || 0);
  const active = q(`[data-active="${id}"]`).checked;
  const photo = q(`[data-photo="${id}"]`).value.trim();
  if (photo && !/^https:\/\//.test(photo)) { toast("Surat havolasi https:// bilan boshlanishi kerak", "error"); return; }
  b.disabled = true;
  try {
    await cloud.savePlace(id, { price, active, photo });
    const p = PLACES_ALL.find(x => x.id === id); p.price = price; p.active = active; p.photo = photo;
    toast(`✓ ${L(p.name)} saqlandi`, "ok"); renderPlaces();
  } catch (err) { toast(authError(err), "error"); }
  b.disabled = false;
});

/* ---------- Foydalanuvchilar ---------- */
function renderUsers() {
  const count = {};
  ORDERS.forEach(o => { count[o.uid] = (count[o.uid] || 0) + 1; });
  $("usersTable").innerHTML = USERS.length ? `<table><thead><tr><th>Ism</th><th>Email</th><th>Fuqarolik</th><th>Til</th>
    <th>Buyurtmalar</th><th>Oxirgi kirish</th></tr></thead><tbody>
    ${USERS.map(u => { const c = countryByCode(u.country); return `<tr><td>${esc(u.name)}</td><td class="small">${esc(u.email)}</td>
      <td>${c ? `${c.flag} ${esc(c.name)}` : "—"}</td><td>${esc((u.lang || "").toUpperCase())}</td>
      <td>${count[u.uid] || 0}</td><td class="small">${fmtDate(u.lastMs)}</td></tr>`; }).join("")}</tbody></table>`
    : `<p class="muted small">Hali foydalanuvchi yo'q</p>`;
}

/* ---------- AI sozlamalari (Firestore → config/ai) ---------- */
function aiFormValues() {
  return {
    mode: (document.querySelector('input[name="aiMode"]:checked') || {}).value || "firebase",
    key: $("aiKey").value.trim(),
    model: $("aiModel").value.trim() || DEFAULT_MODEL,
    ttsModel: $("aiTts").value.trim() || DEFAULT_TTS_MODEL
  };
}
function aiStatus(msg, ok) { $("aiStatus").textContent = msg; $("aiStatus").style.color = ok === undefined ? "" : ok ? "var(--ok)" : "var(--danger)"; }
function renderAiForm() {
  const c = cloud.aiConfig || {};
  const mode = c.mode || "firebase";
  document.querySelectorAll('input[name="aiMode"]').forEach(r => { r.checked = r.value === mode; });
  $("aiKey").value = c.key || "";
  $("aiModel").value = c.model || DEFAULT_MODEL;
  $("aiTts").value = c.ttsModel || DEFAULT_TTS_MODEL;
}
document.addEventListener("aiconfig", renderAiForm);
renderAiForm();
$("aiShow").onclick = () => { $("aiKey").type = $("aiKey").type === "password" ? "text" : "password"; };
$("aiForm").addEventListener("submit", async e => {
  e.preventDefault();
  const v = aiFormValues();
  if (v.mode === "key" && !v.key) { aiStatus("«Gemini API kaliti» rejimi uchun kalit kiriting", false); $("aiKey").focus(); return; }
  try { await cloud.saveAiConfig(v); aiStatus("✓ Saqlandi — barcha foydalanuvchilar uchun amal qiladi", true); renderNav("admin"); }
  catch (err) { aiStatus("Saqlanmadi: " + authError(err) + " (Firestore Rules'ga config bo'limini qo'shganmisiz?)", false); }
});
$("aiTest").onclick = async () => {
  const v = aiFormValues();
  if (v.mode === "key" && !v.key) { aiStatus("Kalit kiriting", false); return; }
  aiStatus("Tekshirilmoqda…");
  try {
    const txt = await gemini.generate("Reply with exactly: Salom, Tourist.uz!", { temperature: 0 }, v);
    aiStatus(`✓ Ishlayapti (${v.mode === "key" ? "API kaliti" : "Firebase AI Logic"}, ${v.model}): «${txt.trim().slice(0, 60)}»`, true);
  } catch (err) { aiStatus("Xato: " + (err.message || err), false); }
};
$("aiLoad").onclick = async () => {
  const key = $("aiKey").value.trim();
  if (!key) { aiStatus("Modellar ro'yxati uchun kalit kerak", false); $("aiKey").focus(); return; }
  try {
    const models = await gemini.listModels(key);
    $("aiModels").innerHTML = models.map(m => `<option value="${esc(m.id)}">${esc(m.label)}</option>`).join("");
    aiStatus(`✓ ${models.length} ta model: ${models.slice(0, 6).map(m => m.id).join(", ")}…`, true);
  } catch (err) { aiStatus("Xato: " + err.message, false); }
};
