/* Xarita: Leaflet + OpenStreetMap (bepul, API kalit kerak emas).
 * OSM foydalanish qoidasiga ko'ra "© OpenStreetMap" atributsiyasi ko'rsatilishi shart. */

/* Saytdagi L() tarjima funksiyasi bilan to'qnashmaslik uchun Leaflet'ni LF nomiga o'tkazamiz
   (leaflet.js common.js'dan KEYIN yuklanishi kerak). */
const LF = (window.L && typeof window.L.noConflict === "function") ? window.L.noConflict() : null;

function makeMap(elId, center, zoom = 14) {
  if (!LF) { // kutubxona yuklanmasa, sahifa baribir ishlaydi
    const el = document.getElementById(elId);
    if (el) el.innerHTML = `<p class="small muted" style="padding:16px">Map unavailable</p>`;
    return null;
  }
  const map = LF.map(elId, { zoomControl: true, scrollWheelZoom: false }).setView(center, zoom);
  LF.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(map);
  addFullscreenControl(map);
  return map;
}

/* Butun ekran rejimi: CSS orqali (iPhone Safari ham qo'llab-quvvatlaydi). Chiqish: ✕ tugmasi yoki Esc. */
function addFullscreenControl(map) {
  const Ctl = LF.Control.extend({
    options: { position: "topright" },
    onAdd() {
      const btn = LF.DomUtil.create("a", "leaflet-bar map-fs-btn");
      btn.href = "#"; btn.role = "button"; btn.title = "Fullscreen"; btn.innerHTML = "⛶";
      LF.DomEvent.disableClickPropagation(btn);
      LF.DomEvent.on(btn, "click", e => { LF.DomEvent.preventDefault(e); toggleMapFullscreen(map, btn); });
      return btn;
    }
  });
  map.addControl(new Ctl());
}
function toggleMapFullscreen(map, btn, force) {
  const el = map.getContainer();
  const on = force !== undefined ? force : !el.classList.contains("map-full");
  el.classList.toggle("map-full", on);
  document.body.classList.toggle("map-full-open", on);
  btn.innerHTML = on ? "✕" : "⛶";
  btn.title = on ? "Exit fullscreen" : "Fullscreen";
  map.scrollWheelZoom[on ? "enable" : "disable"]();
  setTimeout(() => map.invalidateSize(), 50);
  if (on) {
    const onKey = e => { if (e.key === "Escape") { toggleMapFullscreen(map, btn, false); } };
    map._fsKey = onKey; document.addEventListener("keydown", onKey);
  } else if (map._fsKey) { document.removeEventListener("keydown", map._fsKey); map._fsKey = null; }
}

/* Rangli raqamli/belgili pin (rasm fayllarisiz) */
function pinIcon(label = "", kind = "place") {
  return LF.divIcon({
    className: "",
    html: `<div class="pin ${kind}"><span>${esc(label)}</span></div>`,
    iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28]
  });
}
function meIcon() {
  return LF.divIcon({ className: "", html: `<div class="me-pin"></div>`, iconSize: [20, 20], iconAnchor: [10, 10] });
}
