/* Tourist.uz — milliy uslubdagi grafika: Registon silueti, obida turlari uchun rasmlar, hudud belgilari.
 * Hammasi SVG (rasm fayllarisiz), ranglar CSS o'zgaruvchilaridan olinadi — tungi rejimda ham ishlaydi. */

/* Obida turlari: fon gradienti + oq chiziqli rasm */
const TYPE_ART = {
  religion: { g: ["#0f7f86", "#1aa5a5"], svg: '<path d="M14 52h36V38c0-10-8-18-18-18S14 28 14 38z"/><path d="M32 20v-8"/><path d="M29 9a4 4 0 1 0 6 0 3 3 0 1 1-6 0z"/><path d="M10 52h44M22 52V42a4 4 0 0 1 8 0v10M34 52V42a4 4 0 0 1 8 0v10"/>' },
  history:  { g: ["#1d3f8f", "#3d63c4"], svg: '<path d="M10 54V14h44v40"/><path d="M22 54V34c0-8 10-14 10-14s10 6 10 14v20"/><path d="M10 20h44M16 14V8M48 14V8"/>' },
  museum:   { g: ["#8a4b2a", "#b5552b"], svg: '<circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="12"/><path d="M32 8v48M8 32h48M17 17l30 30"/><circle cx="32" cy="32" r="2.5"/>' },
  bazaar:   { g: ["#b9801a", "#d9a42a"], svg: '<path d="M8 24l6-12h36l6 12"/><path d="M8 24c0 4 4 6 8 6s8-2 8-6c0 4 4 6 8 6s8-2 8-6c0 4 4 6 8 6s8-2 8-6"/><path d="M12 30v24h40V30"/><circle cx="32" cy="44" r="6"/><path d="M32 38v-3"/>' },
  food:     { g: ["#9c3b28", "#c8553d"], svg: '<path d="M10 30h44c0 12-10 20-22 20S10 42 10 30z"/><path d="M6 30h52M22 50l-4 6M42 50l4 6"/><path d="M24 22c-2-3 2-5 0-8M32 22c-2-3 2-5 0-8M40 22c-2-3 2-5 0-8"/>' },
  modern:   { g: ["#33415c", "#55688f"], svg: '<path d="M32 6v10M26 16h12l-2 10h-8z"/><path d="M28 26l-8 30M36 26l8 30M24 42h16"/><circle cx="32" cy="20" r="2"/>' },
  craft:    { g: ["#a0522d", "#c97b4a"], svg: '<path d="M24 12h16M26 12c0 6-10 10-10 22 0 10 7 18 16 18s16-8 16-18c0-12-10-16-10-22"/><path d="M18 34h28M20 42h24"/><path d="M48 24c6 0 8 4 8 8s-3 7-8 7"/>' },
  nature:   { g: ["#2f6b4f", "#4c9a6f"], svg: '<path d="M4 54l18-28 10 14 8-10 20 24z"/><path d="M18 32l4 4 4-6"/><circle cx="48" cy="14" r="5"/>' }
};

/* Hududlar uchun ramziy belgi */
const REGION_ART = {
  samarkand:  { type: "religion", svg: TYPE_ART.religion.svg },
  bukhara:    { type: "history", svg: '<path d="M26 56l2-40h8l2 40z"/><path d="M25 16h14l-2-6H27z"/><path d="M32 10V5M27 28h10M26.5 40h11"/>' },
  khiva:      { type: "religion", svg: '<path d="M18 56l4-32h20l4 32z"/><path d="M20 24h24M19 36h26M18.5 46h27"/><path d="M22 24c0-6 4-10 10-10s10 4 10 10"/>' },
  tashkent:   { type: "modern", svg: TYPE_ART.modern.svg },
  shahrisabz: { type: "history", svg: '<path d="M8 56V12h14v44M42 56V12h14v44"/><path d="M22 20h20"/><path d="M8 12l7-6 7 6M42 12l7-6 7 6"/>' }
};

function artSvg(inner, size = 64) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/* Obida kartasi uchun ravoqli rasm maydoni: admin surat URL'ini kiritgan bo'lsa — surat, aks holda tur rasmi */
function placeMedia(p, extraClass = "") {
  const a = TYPE_ART[p.type] || TYPE_ART.history;
  const photo = p.photo && /^https:\/\//.test(p.photo)
    ? `<img src="${esc(p.photo)}" alt="${esc(L(p.name))}" loading="lazy" onerror="this.remove()">` : "";
  return `<div class="place-media ${extraClass}" style="--g1:${a.g[0]};--g2:${a.g[1]}">
    <span class="pm-pattern"></span>${artSvg(a.svg, 56)}${photo}</div>`;
}

function regionBadge(id, size = 44) {
  const r = REGION_ART[id] || REGION_ART.samarkand;
  const g = TYPE_ART[r.type].g;
  return `<span class="region-badge" style="--g1:${g[0]};--g2:${g[1]};width:${size}px;height:${size}px">${artSvg(r.svg, size * 0.62)}</span>`;
}

/* Registon ansambli silueti: Ulug'bek (chap), Tillakori (o'rta), Sherdor (o'ng). viewBox 1200×320, yer y=310 */
function registanSkyline() {
  const G = 310;
  // Minora: yuqoriga torayadi, ayvoncha (sharafa), fonar va gumbazcha
  const minaret = (x, top) => `
    <path class="sk-2" d="M${x} ${G}L${x + 26} ${G}L${x + 23} ${top + 30}L${x + 3} ${top + 30}Z"/>
    <rect class="sk-band" x="${x + 4}" y="${top + 70}" width="18" height="4"/><rect class="sk-band" x="${x + 4}" y="${top + 130}" width="19" height="4"/>
    <rect class="sk-1" x="${x - 3}" y="${top + 22}" width="32" height="9"/>
    <rect class="sk-2" x="${x + 4}" y="${top + 6}" width="18" height="17"/>
    <path class="sk-dome" d="M${x + 2} ${top + 7}Q${x + 13} ${top - 16} ${x + 24} ${top + 7}Z"/>`;
  // Uchli (sharqona) ravoq
  const arch = (ax, aw, sy, cls) => `<path class="${cls}" d="M${ax} ${G}V${sy}Q${ax} ${sy - aw * 0.5} ${ax + aw / 2} ${sy - aw * 0.8}Q${ax + aw} ${sy - aw * 0.5} ${ax + aw} ${sy}V${G}Z"/>`;
  // Peshtoq: ramka, koshin belbog', ichki ravoq, guldastalar
  const portal = (x, w, top, suns = false) => {
    const aw = w * 0.56, ax = x + (w - aw) / 2, sy = top + (G - top) * 0.42;
    return `<rect class="sk-1" x="${x}" y="${top}" width="${w}" height="${G - top}"/>
      <rect class="sk-band" x="${x + 7}" y="${top + 8}" width="${w - 14}" height="4"/>
      <rect class="sk-band" x="${x + 7}" y="${top + 8}" width="4" height="${G - top - 8}"/><rect class="sk-band" x="${x + w - 11}" y="${top + 8}" width="4" height="${G - top - 8}"/>
      ${arch(ax - 6, aw + 12, sy, "sk-frame")}${arch(ax, aw, sy, "sk-glow")}
      <rect class="sk-1" x="${x - 6}" y="${top - 16}" width="12" height="16"/><path class="sk-dome" d="M${x - 7} ${top - 15}Q${x} ${top - 30} ${x + 7} ${top - 15}Z"/>
      <rect class="sk-1" x="${x + w - 6}" y="${top - 16}" width="12" height="16"/><path class="sk-dome" d="M${x + w - 7} ${top - 15}Q${x + w} ${top - 30} ${x + w + 7} ${top - 15}Z"/>
      ${suns ? `<circle class="sk-glow" cx="${ax - 4}" cy="${sy - aw * 0.55}" r="9"/><circle class="sk-glow" cx="${ax + aw + 4}" cy="${sy - aw * 0.55}" r="9"/>` : ""}`;
  };
  // Qanot devor: ikki qator ravoqli tokchalar
  const wing = (x, w, top) => {
    let n = "";
    for (let cx = x + 14; cx + 18 <= x + w - 10; cx += 30) {
      n += arch(cx, 18, top + 30, "sk-niche").replace(`V${G}Z`, `V${top + 50}Z`).replace(`M${cx} ${G}`, `M${cx} ${top + 50}`);
      n += arch(cx, 18, top + 66, "sk-niche").replace(`V${G}Z`, `V${top + 86}Z`).replace(`M${cx} ${G}`, `M${cx} ${top + 86}`);
    }
    return `<rect class="sk-2" x="${x}" y="${top}" width="${w}" height="${G - top}"/>${n}`;
  };
  // Qovurg'ali gumbaz baraban ustida
  const dome = (cx, r, y) => `<rect class="sk-2" x="${cx - r}" y="${y}" width="${2 * r}" height="28"/>
    <rect class="sk-band" x="${cx - r}" y="${y + 4}" width="${2 * r}" height="3"/>
    <path class="sk-dome" d="M${cx - r} ${y}Q${cx - r} ${y - r * 1.25} ${cx} ${y - r * 1.5}Q${cx + r} ${y - r * 1.25} ${cx + r} ${y}Z"/>
    <path class="sk-rib" d="M${cx} ${y - r * 1.5}V${y}M${cx - r * 0.5} ${y - r * 1.05}Q${cx - r * 0.45} ${y - r * 0.5} ${cx - r * 0.42} ${y}M${cx + r * 0.5} ${y - r * 1.05}Q${cx + r * 0.45} ${y - r * 0.5} ${cx + r * 0.42} ${y}"/>
    <path class="sk-rib" d="M${cx} ${y - r * 1.5}v-10"/>`;
  return `<svg class="skyline" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Registon ansambli, Samarqand">
    <circle class="sk-sun" cx="452" cy="118" r="30"/>
    <!-- Tillakori (orqaroqda) -->
    ${wing(480, 240, 215)}${dome(662, 38, 178)}${portal(545, 110, 122)}
    <!-- Ulug'bek madrasasi -->
    ${wing(110, 310, 200)}${portal(205, 120, 92)}${minaret(86, 58)}${minaret(418, 58)}
    <!-- Sherdor madrasasi -->
    ${wing(790, 310, 200)}${dome(838, 30, 172)}${dome(1062, 30, 172)}${portal(885, 120, 92, true)}${minaret(766, 58)}${minaret(1098, 58)}
    <rect class="sk-1" x="0" y="${G}" width="1200" height="10"/>
  </svg>`;
}
