# Tourist.uz — AI sayohat yordamchisi (prototip)

O'zbekistonga tashrif buyuruvchi sayyohlar uchun platforma. Imkoniyatlari:

- **Sayohat ustasi.** Sayyoh fuqaroligini va hududni tanlaydi. AI obidalarni tavsiya tartibida ko'rsatadi, sayyoh 5 tagacha joy tanlaydi va transportni belgilaydi. Natijada tirbandlikni hisobga olgan kunlik marshrut chiqadi.
- **AI Sayohat Planner.** Budjet, kunlar soni va qiziqishlar kiritiladi. Natijada kunlik reja, ovqatlanish joylari va chiptalar to'plami tuziladi.
- **Ovozli ko'p tilli AI gid.** GPS obidani aniqlaydi va AI 14 tilda hikoya qilib, uni ovoz chiqarib o'qiydi.
- **Onlayn chipta.** Savat va demo to'lov bor, barcha chiptalar bitta QR kodda beriladi.

«Eng yaxshi kreativ g'oya» (SamDPI, 2026) tanlovi uchun tayyorlangan.

**Jonli sayt:** https://ilhomabdullaev.github.io/gulhayo_uchun/ (quyidagi 1-bo'limdagi sozlamadan keyin ishlaydi)

---

## 1. Saytni GitHub Pages'da ochish (bir marta, 2 daqiqa)

1. https://github.com/ilhomabdullaev/gulhayo_uchun/settings/pages sahifasini oching.
2. **Build and deployment → Source** qatorida **Deploy from a branch** ni tanlang.
3. **Branch** qatorida `claude/sharp-mayer-k3eh4f` tarmog'ini va `/ (root)` papkasini tanlang, keyin **Save** tugmasini bosing.
4. 1–2 daqiqadan keyin sahifa tepasida manzil chiqadi: **https://ilhomabdullaev.github.io/gulhayo_uchun/**

Server, PHP yoki Python kerak emas. Sayt statik: HTML, CSS va JavaScript.

## 2. Google Gemini API kalitini ulash

1. https://aistudio.google.com/app/apikey sahifasida bepul kalit oling (`AIza...` bilan boshlanadi).
2. Saytda **Sozlamalar** sahifasini oching, kalitni kiriting va **Saqlash** tugmasini bosing.
3. **Ulanishni tekshirish** tugmasini bosing. Yashil yozuv chiqsa, AI ulangan. Menyudagi `AI` belgisi ham yashil bo'ladi.
4. Model maydonida `gemini-2.5-flash` turadi. **Mavjud modellarni yuklash** tugmasi orqali boshqa modelni tanlash mumkin.

> **Xavfsizlik.** Kalit faqat shu brauzerda saqlanadi (localStorage) va to'g'ridan-to'g'ri Google serveriga yuboriladi. GitHub'ga yuklanmaydi.
> Himoyada ishlatiladigan kalitga Google Cloud Console → *APIs & Services → Credentials → Application restrictions → Websites* orqali `https://ilhomabdullaev.github.io/*` cheklovini qo'ying.
> Kalitni hech qachon kodga yozmang.

AI kaliti bo'lmasa ham sayt ishlaydi. Bu holda ichki (oflayn) algoritm ishlatiladi, shuning uchun internet yoki kalit bilan muammo bo'lsa ham demo to'xtamaydi.

## 3. Ro'yxatdan o'tish va admin panel (Firebase)

Firebase ulanmagan bo'lsa ham sayt demo rejimida ishlaydi: ma'lumotlar faqat brauzerda saqlanadi.
Ulangandan keyin quyidagi imkoniyatlar ishlaydi:

- foydalanuvchilar **email/parol** yoki **Google** orqali ro'yxatdan o'tadi;
- buyurtmalar umumiy bazada saqlanadi va istalgan qurilmadan ko'rinadi;
- `admin.html` sahifasida **admin panel** ochiladi: statistika, barcha buyurtmalar, **chipta tekshirish** (kassir rejimi), obidalar narxini o'zgartirish va o'chirish, foydalanuvchilar ro'yxati.

### Firebase loyihasini ochish (bir marta, ~10 daqiqa, bepul)

1. https://console.firebase.google.com sahifasida **Add project** tugmasini bosing, masalan, `tourist-uz` nomini kiriting. Google Analytics shart emas.
2. **Build → Authentication → Get started** bo'limida:
   - **Sign-in method** yorlig'ida **Email/Password** va **Google** ni yoqing.
   - **Settings → Authorized domains** yorlig'ida `ilhomabdullaev.github.io` domenini qo'shing.
3. **Build → Firestore Database → Create database** bo'limida **Production mode** va joylashuvni (masalan, `eur3`) tanlang.
   - **Rules** yorlig'iga repozitoriydagi `firestore.rules` faylini to'liq nusxalang.
   - `admin_email@example.com` o'rniga admin emailini yozing va **Publish** tugmasini bosing.
4. **⚙️ Project settings → Your apps → Web (`</>`)** bo'limida ilovani ro'yxatdan o'tkazing. Chiqqan `firebaseConfig` qiymatlarini `assets/js/firebase-config.js` fayliga qo'ying.
5. Shu faylda `ADMIN_EMAILS` ro'yxatiga admin emailini yozing. U `firestore.rules` faylidagi email bilan bir xil bo'lishi shart.
6. Admin o'sha email bilan saytda ro'yxatdan o'tadi. Shundan keyin menyuda **Admin** tugmasi paydo bo'ladi.

> `firebaseConfig` qiymatlari maxfiy emas, ular baribir brauzerga yuboriladi. Haqiqiy himoya `firestore.rules` qoidalarida:
> foydalanuvchi faqat o'z buyurtmalarini ko'radi, holat va narxlarni faqat admin o'zgartiradi.
> Bu qoidalar lokal Firebase emulyatorida sinovdan o'tgan.
> Cheklov: prototipda to'lov demo rejimida, shuning uchun buyurtma summasini brauzer yuboradi. Haqiqiy to'lov ulanganda summa serverda hisoblanishi kerak.

**Keyinchalik o'z serveringizga ko'chirish:** Firebase'ning bepul tarifi prototip va dastlabki foydalanuvchilar uchun yetarli.
Hajm oshsa, sayt fayllarini istalgan xostingga (va `tourist.uz` domeniga) ko'chirish mumkin. Firebase shu holicha ishlashda davom etadi.
Yoki ma'lumotlarni eksport qilib, o'z backendingizga (PHP/Laravel yoki Python/FastAPI + PostgreSQL) o'tkazasiz.
Buning uchun faqat `assets/js/cloud.js` qatlamini almashtirish kifoya.

## 4. Hujjatlar (`docs/` papkasi)

| Fayl | Mazmuni |
|---|---|
| `01_Loyiha_arizasi_Tourist_uz.docx` | Tanlov arizasi: 5 ta baholash mezoni bo'yicha bo'limlar, analoglar jadvali, smeta, natijalar, xavflar |
| `02_Xarajatlar_smetasi_Tourist_uz.xlsx` | Formulali smeta (kursni o'zgartirsangiz, qayta hisoblanadi), bo'limlar ulushi, daromad prognozi |
| `03_Taqdimot_Tourist_uz.pptx` | Himoya uchun 12 slaydli taqdimot |
| `04_Himoya_nutqi_va_savollar.docx` | Slaydlar bo'yicha nutq matni, demo tekshiruv ro'yxati, hakamlar savollariga 10 ta javob |

`[kvadrat qavs]` ichidagi joylarni (F.I.Sh., guruh, telefon, statistika) o'zingiz to'ldiring. Hujjatlarni qayta yaratish uchun:

```bash
pip install python-docx python-pptx openpyxl
python tools/build_docs.py
```

## 5. Loyiha tuzilishi

```
index.html        Bosh sahifa
trip.html         Sayohat ustasi (fuqarolik → hudud → joylar → marshrut)
planner.html      AI Sayohat Planner
guide.html        GPS audio-gid
cart.html         Chiptalar savati va QR
settings.html     Gemini API kaliti
login.html        Kirish / ro'yxatdan o'tish (Firebase Auth)
admin.html        Admin panel
firestore.rules   Firestore xavfsizlik qoidalari
assets/js/cloud.js            Firebase qatlami (auth, buyurtmalar, narxlar)
assets/js/firebase-config.js  Firebase sozlamasi va admin email(lar)
assets/js/data.js Obidalar, hududlar, davlatlar, transport (tahrirlash oson)
assets/js/i18n.js Interfeys tarjimalari (uz / en / ru)
assets/js/common.js  Umumiy funksiyalar: Gemini klienti, geo, savat
tools/build_docs.py  Tanlov hujjatlarini yaratuvchi skript
```

**Yangi obida qo'shish:** `assets/js/data.js` faylidagi `PLACES` ro'yxatiga yangi yozuv qo'shing (id, region, koordinata, narx, nomi va tavsifi 3 tilda).

## 6. Demo cheklovlari (himoyada ochiq ayting)

- Chipta narxlari va koordinatalar **taxminiy**. To'lov **demo**: karta ma'lumoti so'ralmaydi.
- Tirbandlik masofa va kun vaqtiga bog'liq koeffitsiyent bilan hisoblanadi. Real vaqt API to'liq versiyada ulanadi.
- Brauzer ovozlari qurilmaga bog'liq. Ovoz yo'q tillar (masalan, o'zbek) uchun gid sahifasida **Gemini TTS** belgisini yoqing.
