/* Audio-gid uchun oldindan yozilgan ovozlar (har qanday telefonda ishlaydi, brauzer ovoziga bog'liq emas).
 * Fayl qo'shish: assets/audio/<til>/ papkasiga yuklang va shu yerga yozing:  obida_id: "fayl_nomi"
 * Masalan: uz: { registan: "registan.mp3", guramir: "guramir.m4a" }
 * Obida id'lari: assets/js/data.js (registan, shahizinda, guramir, bibikhanym, ...).
 * Ovoz yozuvi assets/js/narrations.js dagi matnni (yoki docs/05_Audio_gid_matnlari.docx) o'qib yozilishi kerak —
 * ekranda o'sha matn ko'rsatiladi. */
const AUDIO = {
  uz: {},
  en: {},
  ru: {}
};
function audioFor(id, lang) {
  const f = AUDIO[lang] && AUDIO[lang][id];
  return f ? (/^https:\/\//.test(f) ? f : `assets/audio/${lang}/${f}`) : null;
}
