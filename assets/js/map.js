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
  return map;
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
