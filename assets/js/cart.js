/* Chiptalar savati va DEMO buyurtma: haqiqiy to'lov yo'q, karta ma'lumoti so'ralmaydi */

renderNav("cart");

function tomorrow() { const d = new Date(Date.now() + 86400000); return d.toISOString().slice(0, 10); }

function renderCart() {
  const items = cart.items();
  const box = document.getElementById("cartBox");
  if (!items.length) {
    box.innerHTML = `<div class="card flat"><p class="muted">${t("cart.empty")}</p>
      <a class="btn" href="trip.html">🧭 ${t("hero.cta")}</a></div>`;
    return;
  }
  box.innerHTML = `
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>${t("nav.trip")}</th><th>${t("cart.qty")}</th><th>${t("trip.tickets")}</th><th></th></tr></thead>
        <tbody>${items.map(i => {
          const p = placeById(i.id);
          return `<tr><td><b>${esc(L(p.name))}</b><br><span class="small muted">${esc(L(regionById(p.region).name))}</span></td>
            <td><input type="number" min="1" max="20" value="${i.qty}" data-qty="${p.id}"></td>
            <td>${money(p.price * i.qty)}</td>
            <td><button class="btn sm danger" data-del="${p.id}">✕</button></td></tr>`;
        }).join("")}</tbody>
        <tfoot><tr><th colspan="2">${t("trip.total")}</th><th>${money(cart.total())}<br><span class="small muted">${usd(cart.total())}</span></th><th></th></tr></tfoot>
      </table></div>

      <form id="payForm" class="grid c3" style="margin-top:20px">
        <div class="field"><label for="cDate" data-i18n="cart.visitDate">${t("cart.visitDate")}</label><input type="date" id="cDate" required value="${tomorrow()}" min="${new Date().toISOString().slice(0, 10)}"></div>
        <div class="field"><label for="cName">${t("cart.name")}</label><input id="cName" required autocomplete="name"></div>
        <div class="field"><label for="cEmail">${t("cart.email")}</label><input id="cEmail" type="email" autocomplete="email"></div>
        <div style="grid-column:1/-1">
          <p class="notice small">${t("cart.payNote")}</p>
          <div class="row">
            <button class="btn gold" type="submit">💳 ${t("cart.pay")} — ${money(cart.total())}</button>
            <button class="btn ghost" type="button" id="clearCart">${t("cart.clear")}</button>
          </div>
        </div>
      </form>
    </div>`;

  box.querySelectorAll("[data-qty]").forEach(inp => inp.addEventListener("change", () => { cart.setQty(inp.dataset.qty, parseInt(inp.value) || 1); renderCart(); }));
  box.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => { cart.remove(b.dataset.del); renderCart(); }));
  document.getElementById("clearCart").onclick = () => { cart.clear(); renderCart(); };
  document.getElementById("payForm").addEventListener("submit", e => {
    e.preventDefault();
    const order = {
      id: "TU-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      date: document.getElementById("cDate").value,
      name: document.getElementById("cName").value.trim(),
      items: cart.items(), total: cart.total(), created: new Date().toISOString()
    };
    const orders = store.get("orders", []); orders.unshift(order); store.set("orders", orders);
    cart.clear(); renderCart(); showOrder(order); renderOrders();
    toast("✅ " + t("cart.order"), "ok");
  });
}

function qrPayload(o) {
  return `TOURIST.UZ|${o.id}|${o.date}|${o.items.map(i => `${i.id}x${i.qty}`).join(",")}|${o.total}`;
}
function drawQr(el, text, size) {
  el.innerHTML = "";
  if (window.QRCode) new QRCode(el, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
  else el.innerHTML = `<code class="small">${esc(text)}</code>`;
}

function ticketHtml(o) {
  return `<div class="ticket">
    <div class="qr" id="qr-${o.id}"></div>
    <div style="flex:1;min-width:220px">
      <span class="pill gold">DEMO</span>
      <h3 style="margin:8px 0">${esc(o.id)}</h3>
      <div class="small">📅 ${esc(o.date)} · 👤 ${esc(o.name)}</div>
      <ul class="small">${o.items.map(i => `<li>${esc(L(placeById(i.id)?.name))} × ${i.qty}</li>`).join("")}</ul>
      <b>${money(o.total)}</b>
    </div></div>`;
}

function showOrder(o) {
  const box = document.getElementById("orderBox");
  box.innerHTML = `<h2>✅ ${t("cart.order")}</h2><p class="muted">${t("cart.qr")}</p>${ticketHtml(o)}
    <div class="row no-print" style="margin-top:12px"><button class="btn ghost" onclick="window.print()">🖨️ ${t("cart.print")}</button></div>`;
  drawQr(document.getElementById("qr-" + o.id), qrPayload(o), 180);
  box.scrollIntoView({ behavior: "smooth" });
}

function renderOrders() {
  const orders = store.get("orders", []);
  const box = document.getElementById("orders");
  box.innerHTML = orders.length ? orders.slice(0, 10).map(ticketHtml).join("") : `<p class="muted">—</p>`;
  orders.slice(0, 10).forEach(o => { const el = box.querySelector("#qr-" + CSS.escape(o.id)); if (el) drawQr(el, qrPayload(o), 110); });
}

document.addEventListener("langchange", () => { renderCart(); renderOrders(); });
renderCart();
renderOrders();
