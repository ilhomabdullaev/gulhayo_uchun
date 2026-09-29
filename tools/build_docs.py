# -*- coding: utf-8 -*-
"""Tourist.uz — tanlov hujjatlarini yaratish.
Ishga tushirish:  pip install python-docx python-pptx openpyxl && python tools/build_docs.py
Natija: docs/ papkasida .docx, .xlsx, .pptx fayllar.
[KVADRAT QAVS] ichidagi joylarni jamoa o'z ma'lumotlari bilan to'ldiradi."""
import os
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from pptx import Presentation
from pptx.util import Inches, Pt as PPt, Emu
from pptx.dml.color import RGBColor as PRGB
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs")
os.makedirs(OUT, exist_ok=True)

SITE_URL = "https://ilhomabdullaev.github.io/gulhayo_uchun/"
USD = 12700
BLUE = (0x1B, 0x4F, 0x9C)
TEAL = (0x12, 0x9A, 0x9A)
GOLD = (0xC9, 0x96, 0x2B)

# ------------------------------------------------------------------ SMETA
# (bo'lim, nomi, birlik, miqdor, birlik narxi so'm, izoh)
BUDGET = [
    ("Dasturiy ta'minot", "Mobil ilova (Android + iOS, Flutter) ishlab chiqish", "oy", 6, 4_500_000, "1 nafar dasturchi, 6 oy"),
    ("Dasturiy ta'minot", "Backend, veb-platforma va admin panel", "oy", 6, 3_500_000, "1 nafar dasturchi, 6 oy"),
    ("Dasturiy ta'minot", "UI/UX dizayn (ilova va sayt)", "loyiha", 1, 4_000_000, "Figma maketlar, brend"),
    ("Kontent", "Obidalar bo'yicha matnlarni tarixchi-ekspert tekshiruvi", "obida", 40, 150_000, "AI xatolarini oldini olish"),
    ("Kontent", "Tarjimalarni ona tili egasi tomonidan tahrirlash", "matn×til", 240, 25_000, "40 obida × 6 asosiy til"),
    ("Sun'iy intellekt va API", "Google Gemini API (matn + ovoz), 12 oy", "oy", 12, 40 * USD, "~$40/oy, keshlash bilan"),
    ("Sun'iy intellekt va API", "Xarita va tirbandlik API (Google/Yandex), 12 oy", "oy", 12, 30 * USD, "~$30/oy, bepul limitdan tashqari"),
    ("Infratuzilma", "Server (VPS) va ma'lumotlar bazasi, 12 oy", "oy", 12, 250_000, ""),
    ("Infratuzilma", "Domen (.uz) va SSL sertifikat", "yil", 1, 150_000, ""),
    ("Infratuzilma", "App Store ($99) va Google Play ($25) akkauntlari", "to'plam", 1, 124 * USD, "bir martalik / yillik"),
    ("Integratsiya", "To'lov tizimlarini ulash (Payme, Click, Uzcard/Humo, Visa/MC)", "loyiha", 1, 2_000_000, "test va sertifikatlash"),
    ("Marketing", "Obidalar yonida QR-stendlar", "dona", 40, 100_000, "ilovani yuklab olish uchun"),
    ("Marketing", "SMM, mehmonxona va turoperatorlar uchun flayerlar", "loyiha", 1, 5_000_000, "3 oylik kampaniya"),
    ("Sinov", "Samarqandda sayyohlar bilan dala sinovi", "loyiha", 1, 2_500_000, "2 kishi, 2 hafta"),
]
CONTINGENCY = 0.05


def budget_rows():
    rows = [(s, n, u, q, p, q * p, c) for s, n, u, q, p, c in BUDGET]
    sub = sum(r[5] for r in rows)
    return rows, sub, round(sub * CONTINGENCY), sub + round(sub * CONTINGENCY)


def fmt(n):
    return f"{n:,.0f}".replace(",", " ")


# ------------------------------------------------------------------ DOCX yordamchilari
def base_doc():
    d = Document()
    sec = d.sections[0]
    sec.left_margin, sec.right_margin, sec.top_margin, sec.bottom_margin = Cm(3), Cm(1.5), Cm(2), Cm(2)
    st = d.styles["Normal"]
    st.font.name = "Times New Roman"
    st.font.size = Pt(14)
    st.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    st.paragraph_format.space_after = Pt(4)
    st.paragraph_format.line_spacing = 1.15
    for lvl, size in ((1, 16), (2, 14), (3, 14)):
        h = d.styles[f"Heading {lvl}"]
        h.font.name = "Times New Roman"
        h.font.size = Pt(size)
        h.font.bold = True
        h.font.color.rgb = RGBColor(*BLUE)
        h.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    return d


def para(d, text, bold=False, italic=False, align=None, size=None, color=None):
    p = d.add_paragraph()
    r = p.add_run(text)
    r.bold, r.italic = bold, italic
    if size:
        r.font.size = Pt(size)
    if color:
        r.font.color.rgb = RGBColor(*color)
    if align == "c":
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == "j":
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    return p


def bullets(d, items):
    for it in items:
        p = d.add_paragraph(style="List Bullet")
        if isinstance(it, tuple):
            p.add_run(it[0]).bold = True
            p.add_run(it[1])
        else:
            p.add_run(it)


def shade(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def table(d, header, rows, widths=None, size=11):
    t = d.add_table(rows=1, cols=len(header))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(header):
        c = t.rows[0].cells[i]
        c.text = ""
        r = c.paragraphs[0].add_run(h)
        r.bold = True
        r.font.size = Pt(size)
        r.font.color.rgb = RGBColor(255, 255, 255)
        shade(c, "1B4F9C")
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = ""
            bold = isinstance(v, tuple)
            txt = v[0] if bold else v
            r = cells[i].paragraphs[0].add_run(str(txt))
            r.font.size = Pt(size)
            r.bold = bold
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Cm(w)
    d.add_paragraph()
    return t


ANALOGS_HEADER = ["Imkoniyat", "Google Maps", "TripAdvisor", "GetYourGuide", "izi.TRAVEL", "ChatGPT", "Tourist.uz"]
ANALOGS = [
    ["AI kunlik marshrut (budjet bilan)", "—", "qisman", "—", "—", "+", "+"],
    ["O'zbekiston obidalariga onlayn chipta", "—", "—", "qisman (tur)", "—", "—", "+"],
    ["Bir nechta obida — yagona QR", "—", "—", "—", "—", "—", "+"],
    ["Tirbandlikni hisobga olgan yo'l vaqti", "+", "—", "—", "—", "—", "+"],
    ["GPS asosida avtomatik audio-gid", "—", "—", "—", "+", "—", "+"],
    ["Sayyohning ona tilida AI hikoya (14 til)", "—", "—", "—", "cheklangan", "matn", "+"],
    ["Fuqarolikka qarab moslashuv (til, viza, valyuta)", "—", "—", "—", "—", "—", "+"],
    ["Narxlar so'mda, mahalliy to'lov (Payme, Click)", "—", "—", "—", "—", "—", "+"],
    ["Mutaxassis tekshirgan mahalliy kontent", "—", "sharhlar", "—", "qisman", "—", "+"],
]


# ------------------------------------------------------------------ 1. LOYIHA ARIZASI
def build_application():
    rows, sub, cont, total = budget_rows()
    d = base_doc()
    para(d, "SamDPI [institutning to'liq nomini yozing]", bold=True, align="c", size=12)
    para(d, "«ENG YAXSHI KREATIV G'OYA» TANLOVI — INSTITUT BOSQICHI", bold=True, align="c", size=12)
    d.add_paragraph()
    para(d, "INNOVATSION LOYIHA", bold=True, align="c", size=18, color=BLUE)
    para(d, "«TOURIST.UZ» — O'zbekistonga tashrif buyuruvchi sayyohlar uchun sun'iy intellektga asoslangan "
            "marshrut tuzuvchi, onlayn chipta va ko'p tilli ovozli gid platformasi", bold=True, align="c", size=15)
    d.add_paragraph()
    table(d, ["Ma'lumot", "Qiymat"], [
        ["Loyiha rahbari (ilmiy maslahatchi)", "[F.I.Sh., lavozimi, kafedra]"],
        ["Mualliflar (talabalar)", "[F.I.Sh., fakultet, kurs, guruh — har bir ishtirokchi]"],
        ["Yo'nalish", "Axborot texnologiyalari, sun'iy intellekt, turizm"],
        ["Loyiha holati", "Ishlaydigan prototip (veb-sayt) tayyor, ilgari hech qayerda himoya qilinmagan"],
        ["Prototip manzili", SITE_URL],
        ["Loyihaning umumiy qiymati", f"{fmt(total)} so'm (≈ ${total / USD:,.0f})"],
        ["Amalga oshirish muddati", "12 oy (MVP — 6 oy, tijoriy ishga tushirish — 12 oy)"],
        ["Aloqa", "[telefon, e-mail, Telegram]"],
    ], widths=[6, 10], size=12)

    d.add_heading("1. Loyihaning qisqacha mazmuni (annotatsiya)", 1)
    para(d, "Tourist.uz — O'zbekistonga kelgan xorijiy va mahalliy sayyohning butun sayohatini bitta ilovada yig'uvchi "
            "platforma. Sayyoh fuqaroligini va borishni istagan hududini tanlaydi, sun'iy intellekt unga eng mos obidalarni "
            "tartib bilan taklif qiladi. Sayyoh kun davomida 5 tagacha manzil tanlaydi, transport turini belgilaydi va "
            "tirbandlikni hisobga olgan holda har bir manzilga yetib borish vaqtini ko'radi. Barcha obidalarga "
            "chiptalar onlayn, bitta QR kod ko'rinishida sotib olinadi. Obidaga yaqinlashganda GPS sayyoh joylashuvini "
            "aniqlaydi va AI gid unga o'z ona tilida (14 til) audio-ekskursiya o'qib beradi. Shuningdek, «AI Sayohat Planner» "
            "budjet, kunlar soni va qiziqishlar asosida tayyor ko'p kunlik marshrut, ovqatlanish joylari va chiptalar "
            "to'plamini avtomatik tuzadi.", align="j")
    para(d, "Asosiy g'oya bitta jumlada: «O'zbekiston bo'ylab sayohatni AI rejalashtiradi, chiptani bitta QR bilan beradi, "
            "obida oldida esa sizga ona tilingizda gapirib beradi».", italic=True, align="j")

    d.add_heading("2. Muammo va g'oyaning dolzarbligi", 1)
    para(d, "O'zbekiston turizmni iqtisodiyotning ustuvor tarmog'i sifatida rivojlantirmoqda: ko'plab davlatlar uchun vizasiz "
            "rejim va elektron viza joriy etilgan, xorijiy sayyohlar oqimi yildan-yilga o'smoqda "
            "[⚠ so'nggi yil statistikasini stat.uz yoki Turizm qo'mitasi rasmiy saytidan olib, aniq raqam bilan kiriting]. "
            "Biroq sayyoh bugun quyidagi muammolarga duch keladi:", align="j")
    bullets(d, [
        ("Axborot tarqoqligi: ", "marshrut, chipta, transport va obida tarixi haqidagi ma'lumot turli saytlar va ilovalarda."),
        ("Chipta navbatlari: ", "Registon, Shohi Zinda, Go'ri Amir kabi obidalarda chipta kassada, naqd pul bilan olinadi; mavsumda navbat vaqtni oladi."),
        ("Til to'sig'i: ", "gidlar asosan rus va ingliz tillarida; xitoy, koreys, yapon, arab, turk sayyohlari uchun sifatli gid kam va qimmat."),
        ("Vaqtni rejalashtirish: ", "sayyoh obidalar orasidagi masofa va tirbandlikni bilmaydi, kunini noto'g'ri rejalashtiradi."),
        ("Budjet noaniqligi: ", "chipta, ovqat va transport narxlari oldindan ma'lum emas."),
    ])
    para(d, "Loyiha turizm sohasini raqamlashtirish bo'yicha davlat siyosatiga mos keladi, sayyohning qoniqishini oshiradi, "
            "qayta tashrif ehtimolini ko'paytiradi va mahalliy biznes (restoranlar, taksi, hunarmandlar) daromadini oshiradi.", align="j")

    d.add_heading("3. Ilmiy va innovatsion yangiligi", 1)
    bullets(d, [
        ("Kontekstga sezgir AI tavsiya: ", "obidalar sayyohning fuqaroligi, madaniy kelib chiqishi va qiziqishlariga qarab katta til modeli (Google Gemini) yordamida tartiblanadi va har bir tavsiya uchun «nega aynan shu joy» izohi beriladi."),
        ("Budjetga cheklangan marshrut optimizatsiyasi: ", "AI rejasi ma'lumotlar bazasidagi haqiqiy chipta narxlari bilan tekshiriladi (gallyutsinatsiyaga qarshi validatsiya), marshrut tartibi «eng yaqin qo'shni» algoritmi bilan geografik jihatdan optimallashtiriladi."),
        ("Vaqtga bog'liq tirbandlik modeli: ", "yo'l vaqti masofa, transport turi va kun/hafta vaqtiga bog'liq tirbandlik koeffitsiyenti asosida hisoblanadi; to'liq versiyada real vaqtli API ma'lumotlari bilan to'ldiriladi."),
        ("Geofencing asosidagi generativ audio-gid: ", "GPS obidaga 150 m radiusga kirilganini aniqlaydi, AI shu obida haqida sayyohning ona tilida (14 til) hikoya yaratadi va nutq sintezi (brauzer TTS yoki Gemini TTS) orqali o'qib beradi. Matnlar keshlanadi va tarixchi-ekspert tomonidan tekshiriladi."),
        ("Yagona raqamli chipta: ", "bir nechta obidaga chipta bitta QR kodda birlashtiriladi."),
    ])

    d.add_heading("4. Mavjud analoglardan ustunligi", 1)
    para(d, "Quyidagi jadvalda mashhur xalqaro servislar bilan taqqoslash keltirilgan:", align="j")
    table(d, ANALOGS_HEADER, [[(r[0],)] + r[1:6] + [(r[6],)] for r in ANALOGS], size=9)
    para(d, "Xulosa: analoglarning har biri muammoning faqat bir qismini hal qiladi, hech biri O'zbekiston obidalariga "
            "onlayn chipta, mahalliy to'lov tizimlari va sayyohning ona tilidagi GPS-gidni bitta ilovada birlashtirmaydi. "
            "Tourist.uzning asosiy ustunligi — mahalliy integratsiya va «hammasi bir joyda» tamoyili.", align="j")

    d.add_heading("5. Texnik yechim va prototip", 1)
    para(d, f"Loyihaning ishlaydigan birinchi versiyasi (prototip) tayyor va quyidagi manzilda ochiq: {SITE_URL}", bold=True)
    table(d, ["Modul", "Prototipda amalga oshirilgan"], [
        ["Sayohat ustasi", "Fuqarolik (19 variant) → hudud (5 ta) → AI tartiblagan 34 obida → 5 tagacha tanlash → marshrut"],
        ["Yo'l vaqti", "4 transport turi, tirbandlik koeffitsiyenti, marshrutni optimallashtirish, Yandex/Google xaritaga havola"],
        ["AI Planner", "Budjet, kunlar, qiziqishlar → kunlik reja, ovqatlanish, xarajatlar hisobi, chiptalar to'plami"],
        ["Ovozli AI gid", "GPS kuzatuvi, radar, 14 tilda AI hikoya, ovozli o'qish (brauzer TTS / Gemini TTS)"],
        ["Chiptalar", "Savat, tashrif sanasi, demo to'lov, yagona QR chipta, buyurtmalar tarixi"],
        ["Sozlamalar", "Google Gemini API kaliti va modelini kiritish, ulanishni tekshirish"],
        ["Interfeys", "3 til (o'zbek, ingliz, rus), mobil qurilmaga moslashgan, tungi rejim"],
    ], widths=[4, 12], size=11)
    para(d, "Texnologiyalar: HTML5, CSS3, JavaScript (prototip); Google Gemini API (matn va nutq); Geolocation API; "
            "Web Speech API; GitHub Pages (hosting). To'liq versiyada: Flutter (mobil ilova), Python/FastAPI yoki "
            "PHP/Laravel (backend), PostgreSQL, Payme/Click API, Yandex/Google Maps API.", align="j")

    d.add_heading("6. Xarajatlar smetasi va uning asoslanishi", 1)
    para(d, "Prototip bepul xizmatlar (GitHub Pages, Gemini API bepul limiti) yordamida deyarli nol xarajat bilan yaratildi. "
            "Quyida bitta hudud (Samarqand) uchun tijoriy MVP ni 12 oyda ishga tushirish smetasi keltirilgan "
            f"(1 USD = {fmt(USD)} so'm deb olingan):", align="j")
    trs = [[str(i + 1), r[1], f"{r[3]} {r[2]}", fmt(r[4]), fmt(r[5]), r[6]] for i, r in enumerate(rows)]
    trs.append(["", ("Jami",), "", "", (fmt(sub),), ""])
    trs.append(["", "Kutilmagan xarajatlar (5%)", "", "", fmt(cont), ""])
    trs.append(["", ("UMUMIY SUMMA",), "", "", (fmt(total),), f"≈ ${total / USD:,.0f}"])
    table(d, ["№", "Xarajat moddasi", "Miqdor", "Narxi, so'm", "Summa, so'm", "Izoh"], trs, widths=[0.8, 6.5, 2, 2.4, 2.6, 3], size=9)
    para(d, "Asoslash: dasturchilar ish haqi O'zbekistondagi o'rta darajali frilanser stavkalari asosida; API xarajatlari "
            "Google narxlari va kutilayotgan so'rovlar soni (keshlash bilan) asosida; kontent xarajatlari — 40 ta obida × "
            "6 asosiy til. Eng katta modda — dasturiy ta'minot (≈78%), chunki loyihaning asosiy qiymati shu. "
            "Batafsil hisob-kitob ilova qilingan Excel faylda.", align="j")

    d.add_heading("7. Daromad modeli va o'zini oqlash muddati", 1)
    bullets(d, [
        ("Chipta sotuvidan komissiya: ", "5–7% (muzeylar va Madaniy meros agentligi bilan hamkorlik shartnomasi asosida)."),
        ("Premium audio-gid: ", "kengaytirilgan ekskursiyalar, oflayn paketlar — $2–3."),
        ("Hamkorlar reklamasi: ", "restoran, mehmonxona, hunarmandchilik ustaxonalari uchun tavsiyalar bo'limida."),
        ("B2B: ", "turoperatorlar va mehmonxonalar uchun oq yorliqli (white-label) versiya."),
    ])
    para(d, "Prognoz (2-yil, faqat Samarqand): 20 000 foydalanuvchi × o'rtacha 150 000 so'mlik chipta = 3 mlrd so'm "
            "aylanma × 6% = 180 mln so'm; premium va reklama — ≈ 100 mln so'm. Loyiha ishga tushgandan so'ng "
            "taxminan 12–18 oyda o'zini oqlaydi. [⚠ prognoz — taxminiy, himoyada shunday deb ayting]", align="j")

    d.add_heading("8. Amalga oshirishdan kutilayotgan natijalar", 1)
    table(d, ["Ko'rsatkich", "1-yil maqsadi"], [
        ["Faol foydalanuvchilar", "10 000+"],
        ["Onlayn sotilgan chiptalar", "15 000+"],
        ["Obidalar kirishida navbatda kutish vaqti", "30–50% ga qisqarishi"],
        ["Qo'llab-quvvatlanadigan gid tillari", "14 (6 tasi ekspert tekshirgan)"],
        ["Qamrab olingan hududlar", "Samarqand → Buxoro, Xiva, Toshkent, Shahrisabz"],
        ["Hamkor restoran, hunarmand va taksi xizmatlari", "50+"],
        ["Sayyoh qoniqishi (ilova ichidagi so'rovnoma)", "4.5 / 5 dan yuqori"],
    ], widths=[9, 7], size=11)
    para(d, "Ijtimoiy natijalar: O'zbekiston turizm imidjining yaxshilanishi, mahalliy tadbirkorlar daromadining oshishi, "
            "talabalar uchun gid-kontent yaratish bo'yicha ish o'rinlari, milliy madaniy merosni raqamli targ'ib qilish.", align="j")

    d.add_heading("9. Amalga oshirish rejasi", 1)
    table(d, ["Bosqich", "Muddat", "Natija"], [
        ["0. Prototip", "Bajarildi", "Ishlaydigan veb-prototip, AI integratsiyasi"],
        ["1. Hamkorlik", "1–2-oy", "Madaniy meros agentligi / muzeylar bilan chipta bo'yicha kelishuv, to'lov tizimlari"],
        ["2. MVP", "2–6-oy", "Mobil ilova, backend, 40 obida kontenti, 6 til"],
        ["3. Dala sinovi", "6–7-oy", "Samarqandda 100+ sayyoh bilan sinov, xatolarni tuzatish"],
        ["4. Ishga tushirish", "8-oy", "App Store / Google Play, marketing, QR-stendlar"],
        ["5. Kengayish", "9–12-oy", "Buxoro, Xiva, Toshkent; B2B versiya"],
    ], widths=[4, 3, 9], size=11)

    d.add_heading("10. Xavflar va ularni bartaraf etish", 1)
    table(d, ["Xavf", "Choralar"], [
        ["Chipta tizimiga ulanish uchun ruxsat olish", "Dastlab bitta muzey bilan pilot; agentlik bilan memorandum; vaqtincha «bron + kassada QR» modeli"],
        ["AI noto'g'ri tarixiy ma'lumot berishi", "Asosiy matnlar tarixchi-ekspert tomonidan tekshiriladi va keshlanadi; AI faqat tasdiqlangan manba asosida yozadi"],
        ["Shaxsiy ma'lumotlar xavfsizligi", "Fuqarolik faqat til/viza sozlamasi uchun; «Shaxsga doir ma'lumotlar to'g'risida»gi qonunga muvofiq saqlash"],
        ["Internet yo'qligi", "Oflayn rejim: audio va xaritani oldindan yuklab olish"],
        ["API narxlarining oshishi", "Keshlash, bepul limitlar, muqobil provayderlar"],
    ], widths=[6, 10], size=11)

    d.add_heading("11. Xulosa", 1)
    para(d, "Tourist.uz sayyohning O'zbekistondagi sayohatini boshidan oxirigacha — rejalashtirish, chipta, yo'l va "
            "ekskursiyani — bitta raqamli xizmatga birlashtiradi. Loyiha dolzarb, innovatsion, ishlaydigan prototipga ega, "
            "xarajatlari asoslangan va aniq o'lchanadigan natijalarga yo'naltirilgan.", align="j")
    d.add_paragraph()
    para(d, "Loyiha rahbari: ______________ [F.I.Sh.]        Mualliflar: ______________ [F.I.Sh.]")
    para(d, "Sana: «___» ____________ 2026-yil")
    path = os.path.join(OUT, "01_Loyiha_arizasi_Tourist_uz.docx")
    d.save(path)
    return path


# ------------------------------------------------------------------ 2. SMETA (Excel, formulalar bilan)
def build_budget_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = "Smeta"
    thin = Side(style="thin", color="BBBBBB")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    head_fill = PatternFill("solid", fgColor="1B4F9C")
    sec_fill = PatternFill("solid", fgColor="E8EEF8")
    ws["A1"] = "«Tourist.uz» loyihasi — xarajatlar smetasi (MVP, 12 oy, Samarqand)"
    ws["A1"].font = Font(bold=True, size=14, color="1B4F9C")
    ws["A2"] = "USD kursi (so'm):"
    ws["C2"] = USD
    ws["C2"].font = Font(bold=True)
    ws["D2"] = "← kursni o'zgartirsangiz, API qatorlari avtomatik qayta hisoblanadi"
    ws["D2"].font = Font(italic=True, color="888888")
    hdr = ["№", "Bo'lim", "Xarajat moddasi", "Birlik", "Miqdor", "Birlik narxi, so'm", "Summa, so'm", "Izoh"]
    for i, h in enumerate(hdr, 1):
        c = ws.cell(row=4, column=i, value=h)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = head_fill
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = border
    r = 5
    usd_items = {"Google Gemini API": 40, "Xarita va tirbandlik": 30, "App Store": 124}
    for i, (sec, name, unit, qty, price, note) in enumerate(BUDGET, 1):
        usd_amt = next((v for k, v in usd_items.items() if name.startswith(k)), None)
        vals = [i, sec, name, unit, qty, f"={usd_amt}*$C$2" if usd_amt else price, f"=E{r}*F{r}", note]
        for j, v in enumerate(vals, 1):
            c = ws.cell(row=r, column=j, value=v)
            c.border = border
            c.alignment = Alignment(vertical="center", wrap_text=j in (3, 8))
            if j in (6, 7):
                c.number_format = "#,##0"
        r += 1
    last = r - 1
    rows_tot = [("Jami", f"=SUM(G5:G{last})"), ("Kutilmagan xarajatlar (5%)", f"=ROUND(G{r}*0.05,0)"),
                ("UMUMIY SUMMA", f"=G{r}+G{r + 1}"), ("UMUMIY SUMMA, USD", f"=G{r + 2}/$C$2")]
    for k, (label, formula) in enumerate(rows_tot):
        ws.cell(row=r + k, column=3, value=label).font = Font(bold=True)
        c = ws.cell(row=r + k, column=7, value=formula)
        c.font = Font(bold=True)
        c.number_format = "#,##0"
        for j in range(1, 9):
            ws.cell(row=r + k, column=j).fill = sec_fill
            ws.cell(row=r + k, column=j).border = border
    for col, w in zip("ABCDEFGH", (5, 20, 52, 10, 9, 17, 17, 32)):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A5"

    # Tuzilma varag'i
    ws2 = wb.create_sheet("Bo'limlar bo'yicha")
    ws2.append(["Bo'lim", "Summa, so'm", "Ulushi"])
    for c in ws2[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = head_fill
    secs = []
    for s, *_ in BUDGET:
        if s not in secs:
            secs.append(s)
    for i, s in enumerate(secs, 2):
        ws2.cell(row=i, column=1, value=s)
        ws2.cell(row=i, column=2, value=f"=SUMIF(Smeta!B5:B{last},A{i},Smeta!G5:G{last})").number_format = "#,##0"
        ws2.cell(row=i, column=3, value=f"=B{i}/SUM($B$2:$B${len(secs) + 1})").number_format = "0.0%"
    ws2.column_dimensions["A"].width = 28
    ws2.column_dimensions["B"].width = 18

    # Daromad prognozi
    ws3 = wb.create_sheet("Daromad prognozi")
    data = [
        ("Ko'rsatkich (2-yil, Samarqand)", "Qiymat"),
        ("Chipta xarid qilgan foydalanuvchilar", 20000),
        ("O'rtacha chek (chiptalar), so'm", 150000),
        ("Komissiya", 0.06),
        ("Komissiyadan daromad, so'm", "=B2*B3*B4"),
        ("Premium audio-gid xaridlari", 3000),
        ("Premium narxi, so'm", "=2.5*Smeta!C2"),
        ("Premiumdan daromad, so'm", "=B6*B7"),
        ("Reklama va B2B, so'm", 80000000),
        ("JAMI DAROMAD, so'm", "=B5+B8+B9"),
        ("Loyiha xarajati, so'm", f"=Smeta!G{r + 2}"),
        ("O'zini oqlash muddati, oy (taxminiy)", "=ROUND(B11/(B10/12),1)"),
    ]
    for row in data:
        ws3.append(list(row))
    for c in ws3[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = head_fill
    for i in range(2, len(data) + 1):
        ws3.cell(row=i, column=2).number_format = "0%" if i == 4 else "#,##0.0" if i == 12 else "#,##0"
    ws3.column_dimensions["A"].width = 42
    ws3.column_dimensions["B"].width = 20
    ws3.cell(row=len(data) + 2, column=1, value="Diqqat: bu prognoz taxminiy, himoyada shunday deb ko'rsating.").font = Font(italic=True, color="C0392B")
    path = os.path.join(OUT, "02_Xarajatlar_smetasi_Tourist_uz.xlsx")
    wb.save(path)
    return path


# ------------------------------------------------------------------ 3. TAQDIMOT
def build_pptx():
    rows, sub, cont, total = budget_rows()
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    W, H = prs.slide_width, prs.slide_height
    blank = prs.slide_layouts[6]

    def rect(s, x, y, w, h, color, shape=MSO_SHAPE.RECTANGLE):
        sh = s.shapes.add_shape(shape, x, y, w, h)
        sh.fill.solid()
        sh.fill.fore_color.rgb = PRGB(*color)
        sh.line.fill.background()
        return sh

    def text(s, x, y, w, h, content, size=20, bold=False, color=(0x1C, 0x24, 0x33), align=None):
        tb = s.shapes.add_textbox(x, y, w, h)
        tf = tb.text_frame
        tf.word_wrap = True
        lines = content if isinstance(content, list) else [content]
        for i, line in enumerate(lines):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            r = p.add_run()
            r.text = line
            r.font.size = PPt(size)
            r.font.bold = bold
            r.font.color.rgb = PRGB(*color)
            r.font.name = "Calibri"
            p.space_after = PPt(8)
            if align == "c":
                p.alignment = PP_ALIGN.CENTER
        return tb

    def slide(title, num):
        s = prs.slides.add_slide(blank)
        rect(s, 0, 0, W, Inches(0.12), TEAL)
        rect(s, 0, H - Inches(0.45), W, Inches(0.45), (0xF0, 0xEB, 0xE1))
        text(s, Inches(0.6), Inches(0.35), Inches(12), Inches(0.9), title, 34, True, BLUE)
        text(s, Inches(0.6), H - Inches(0.42), Inches(8), Inches(0.4), "Tourist.uz  •  «Eng yaxshi kreativ g'oya» 2026", 12, color=(0x5C, 0x65, 0x77))
        text(s, W - Inches(1.2), H - Inches(0.42), Inches(0.8), Inches(0.4), str(num), 12, True, (0x5C, 0x65, 0x77))
        return s

    def card(s, x, y, w, h, title, body, color=BLUE):
        rect(s, x, y, w, h, (0xFF, 0xFF, 0xFF), MSO_SHAPE.ROUNDED_RECTANGLE).line.color.rgb = PRGB(0xE2, 0xDB, 0xCD)
        rect(s, x, y, Inches(0.12), h, color)
        text(s, x + Inches(0.3), y + Inches(0.15), w - Inches(0.4), Inches(0.6), title, 20, True, color)
        text(s, x + Inches(0.3), y + Inches(0.75), w - Inches(0.4), h - Inches(0.8), body, 15)

    # 1. Titul
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, BLUE)
    rect(s, 0, H - Inches(1.6), W, Inches(1.6), TEAL)
    text(s, Inches(0.8), Inches(1.4), Inches(11.5), Inches(1.4), "TOURIST.UZ", 66, True, (0xFF, 0xFF, 0xFF))
    text(s, Inches(0.8), Inches(2.8), Inches(11.5), Inches(1.6),
         "AI marshrut, onlayn chipta va ona tilidagi ovozli gid — O'zbekiston sayyohlari uchun bitta ilovada", 28, False, (0xFF, 0xFF, 0xFF))
    text(s, Inches(0.8), Inches(4.6), Inches(11.5), Inches(0.8), "«Eng yaxshi kreativ g'oya» tanlovi — institut bosqichi, 2026", 20, False, (0xE0, 0xB4, 0x53))
    text(s, Inches(0.8), H - Inches(1.35), Inches(11.5), Inches(1.2),
         ["Mualliflar: [F.I.Sh.]   •   Ilmiy rahbar: [F.I.Sh.]", SITE_URL], 18, False, (0xFF, 0xFF, 0xFF))

    # 2. Muammo
    s = slide("Muammo: sayyoh nimalarga duch keladi?", 2)
    items = [("Tarqoq axborot", "Marshrut, chipta, transport va tarix — turli ilovalarda"),
             ("Kassadagi navbat", "Obidalarga chipta faqat joyida, ko'pincha naqd"),
             ("Til to'sig'i", "Xitoy, koreys, arab, turk tillarida gid kam va qimmat"),
             ("Vaqt va budjet", "Masofa, tirbandlik va narxlar oldindan noma'lum")]
    for i, (a, b) in enumerate(items):
        card(s, Inches(0.6 + (i % 2) * 6.2), Inches(1.5 + (i // 2) * 2.6), Inches(5.9), Inches(2.3), a, b, [BLUE, TEAL, GOLD, BLUE][i])

    # 3. Yechim
    s = slide("Yechim: sayohat — bitta ilovada", 3)
    steps = ["1. Fuqarolik", "2. Hudud", "3. AI tavsiyasi\n(5 tagacha joy)", "4. Transport va\nyo'l vaqti", "5. Onlayn chipta\n(yagona QR)", "6. Ovozli AI gid"]
    for i, st in enumerate(steps):
        x = Inches(0.6 + i * 2.07)
        rect(s, x, Inches(2.0), Inches(1.9), Inches(1.9), [BLUE, TEAL][i % 2], MSO_SHAPE.ROUNDED_RECTANGLE)
        text(s, x + Inches(0.1), Inches(2.4), Inches(1.7), Inches(1.4), st, 17, True, (0xFF, 0xFF, 0xFF), "c")
    text(s, Inches(0.6), Inches(4.5), Inches(12), Inches(2),
         ["+ AI Sayohat Planner: «3 kun, tarixiy obidalar va milliy taomlar, $200» → tayyor kunlik reja, ovqatlanish joylari va chiptalar to'plami",
          "Asosiy g'oya: sayohatni AI rejalashtiradi, chiptani bitta QR bilan beradi, obida oldida esa ona tilingizda gapirib beradi."], 19)

    # 4. Innovatsiya
    s = slide("Ilmiy va innovatsion yangilik", 4)
    text(s, Inches(0.6), Inches(1.4), Inches(12.2), Inches(5.5), [
        "• Fuqarolik va qiziqishga qarab AI tavsiya (Google Gemini) — har bir joy uchun «nega» izohi",
        "• Budjetga cheklangan reja + narxlarni bazadan tekshirish (AI gallyutsinatsiyasiga qarshi)",
        "• Kun va hafta vaqtiga bog'liq tirbandlik modeli, marshrutni geografik optimallashtirish",
        "• Geofencing: obidaga 150 m yaqinlashganda gid o'zi ishga tushadi",
        "• Generativ gid 14 tilda + nutq sintezi (brauzer TTS / Gemini TTS)",
        "• Bir nechta obidaga yagona raqamli QR chipta"], 22)

    # 5. Analoglar
    s = slide("Mavjud analoglardan ustunligi", 5)
    rows_n, cols_n = len(ANALOGS) + 1, len(ANALOGS_HEADER)
    tbl = s.shapes.add_table(rows_n, cols_n, Inches(0.5), Inches(1.35), Inches(12.3), Inches(5.3)).table
    tbl.columns[0].width = Inches(4.3)
    for j in range(1, cols_n):
        tbl.columns[j].width = Inches(8.0 / (cols_n - 1))
    for j, h in enumerate(ANALOGS_HEADER):
        c = tbl.cell(0, j)
        c.text = h
        c.text_frame.paragraphs[0].runs[0].font.size = PPt(13)
        c.text_frame.paragraphs[0].runs[0].font.bold = True
    for i, row in enumerate(ANALOGS, 1):
        for j, v in enumerate(row):
            c = tbl.cell(i, j)
            c.text = v
            run = c.text_frame.paragraphs[0].runs[0]
            run.font.size = PPt(12)
            if j == cols_n - 1:
                run.font.bold = True
                c.fill.solid()
                c.fill.fore_color.rgb = PRGB(0xDD, 0xF2, 0xF2)

    # 6. Prototip
    s = slide("Ishlaydigan prototip — hoziroq sinab ko'ring", 6)
    text(s, Inches(0.6), Inches(1.4), Inches(7.4), Inches(5), [
        "• 5 hudud, 34 obida, 19 davlat, 14 gid tili",
        "• Sayohat ustasi: fuqarolik → hudud → AI tavsiyasi → marshrut",
        "• 4 transport turi, tirbandlik, Yandex/Google xarita",
        "• AI Planner: budjet va qiziqish bo'yicha ko'p kunlik reja",
        "• GPS audio-gid: radar, avtomatik ishga tushish, ovoz",
        "• Savat, demo to'lov, yagona QR chipta",
        "• Interfeys 3 tilda, telefonga moslashgan"], 20)
    rect(s, Inches(8.4), Inches(1.6), Inches(4.3), Inches(4.2), (0xF0, 0xEB, 0xE1), MSO_SHAPE.ROUNDED_RECTANGLE)
    text(s, Inches(8.6), Inches(2.1), Inches(3.9), Inches(3.5),
         ["JONLI DEMO", "", SITE_URL, "", "[bu yerga saytning skrinshotini qo'ying]"], 16, True, BLUE, "c")

    # 7. Texnologiyalar
    s = slide("Texnologiyalar va arxitektura", 7)
    card(s, Inches(0.6), Inches(1.5), Inches(3.9), Inches(4.6), "Prototip", ["HTML5, CSS3, JavaScript", "Geolocation API", "Web Speech API", "GitHub Pages"], BLUE)
    card(s, Inches(4.7), Inches(1.5), Inches(3.9), Inches(4.6), "Sun'iy intellekt", ["Google Gemini — tavsiya, reja, gid matni", "Gemini TTS — ovoz", "JSON-sxema + validatsiya", "Keshlash (xarajatni kamaytirish)"], TEAL)
    card(s, Inches(8.8), Inches(1.5), Inches(3.9), Inches(4.6), "To'liq versiya", ["Flutter mobil ilova", "Python/FastAPI yoki Laravel", "PostgreSQL", "Payme, Click, Uzcard, Visa", "Yandex/Google tirbandlik API"], GOLD)

    # 8. Smeta
    s = slide(f"Xarajatlar smetasi: {fmt(total)} so'm (≈ ${total / USD:,.0f})", 8)
    secs = {}
    for r in rows:
        secs[r[0]] = secs.get(r[0], 0) + r[5]
    secs["Kutilmagan (5%)"] = cont
    y = Inches(1.5)
    mx = max(secs.values())
    for name, val in secs.items():
        text(s, Inches(0.6), y, Inches(3.6), Inches(0.5), name, 17, True)
        rect(s, Inches(4.3), y + Inches(0.08), int(Inches(6.2) * val / mx), Inches(0.38), TEAL)
        text(s, Inches(4.4) + int(Inches(6.2) * val / mx), y, Inches(2.5), Inches(0.5), f"{fmt(val)}", 15)
        y += Inches(0.62)
    text(s, Inches(0.6), Inches(6.3), Inches(12), Inches(0.6), "Prototip bepul xizmatlarda deyarli nol xarajat bilan yaratildi. Batafsil — Excel smetada.", 15, color=(0x5C, 0x65, 0x77))

    # 9. Daromad
    s = slide("Daromad modeli", 9)
    card(s, Inches(0.6), Inches(1.5), Inches(5.9), Inches(2.2), "Chipta komissiyasi 5–7%", "Muzeylar va agentlik bilan hamkorlikda", BLUE)
    card(s, Inches(6.8), Inches(1.5), Inches(5.9), Inches(2.2), "Premium audio-gid $2–3", "Kengaytirilgan ekskursiya, oflayn paket", TEAL)
    card(s, Inches(0.6), Inches(4.0), Inches(5.9), Inches(2.2), "Hamkorlar reklamasi", "Restoran, mehmonxona, hunarmandlar", GOLD)
    card(s, Inches(6.8), Inches(4.0), Inches(5.9), Inches(2.2), "B2B (white-label)", "Turoperator va mehmonxonalar uchun", BLUE)

    # 10. Natijalar
    s = slide("Kutilayotgan natijalar (1-yil)", 10)
    kpis = [("10 000+", "faol foydalanuvchi"), ("15 000+", "onlayn chipta"), ("30–50%", "navbat vaqti qisqaradi"),
            ("14", "gid tili"), ("5", "hudud"), ("50+", "mahalliy hamkor")]
    for i, (a, b) in enumerate(kpis):
        x, y = Inches(0.6 + (i % 3) * 4.15), Inches(1.5 + (i // 3) * 2.5)
        rect(s, x, y, Inches(3.9), Inches(2.2), (0xFF, 0xFF, 0xFF), MSO_SHAPE.ROUNDED_RECTANGLE).line.color.rgb = PRGB(0xE2, 0xDB, 0xCD)
        text(s, x, y + Inches(0.3), Inches(3.9), Inches(1), a, 44, True, [BLUE, TEAL, GOLD][i % 3], "c")
        text(s, x, y + Inches(1.35), Inches(3.9), Inches(0.7), b, 18, False, align="c")

    # 11. Reja
    s = slide("Amalga oshirish rejasi (12 oy)", 11)
    phases = [("Prototip", "bajarildi ✓"), ("Hamkorlik", "1–2-oy"), ("MVP", "2–6-oy"), ("Dala sinovi", "6–7-oy"), ("Ishga tushirish", "8-oy"), ("Kengayish", "9–12-oy")]
    rect(s, Inches(0.8), Inches(3.35), Inches(11.8), Inches(0.1), (0xE2, 0xDB, 0xCD))
    for i, (a, b) in enumerate(phases):
        x = Inches(0.6 + i * 2.07)
        rect(s, x + Inches(0.75), Inches(3.1), Inches(0.5), Inches(0.5), GOLD if i == 0 else BLUE, MSO_SHAPE.OVAL)
        text(s, x, Inches(2.0), Inches(2), Inches(0.9), a, 18, True, align="c")
        text(s, x, Inches(3.8), Inches(2), Inches(0.9), b, 16, align="c")

    # 12. Yakun
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, BLUE)
    text(s, Inches(0.8), Inches(2.0), Inches(11.7), Inches(1.2), "E'tiboringiz uchun rahmat!", 54, True, (0xFF, 0xFF, 0xFF), "c")
    text(s, Inches(0.8), Inches(3.4), Inches(11.7), Inches(1), "Tourist.uz — O'zbekistonni dunyoga ona tilida tanishtiramiz", 26, False, (0xE0, 0xB4, 0x53), "c")
    text(s, Inches(0.8), Inches(4.8), Inches(11.7), Inches(1), [SITE_URL, "[telefon / Telegram]"], 20, False, (0xFF, 0xFF, 0xFF), "c")
    path = os.path.join(OUT, "03_Taqdimot_Tourist_uz.pptx")
    prs.save(path)
    return path


# ------------------------------------------------------------------ 4. HIMOYA NUTQI VA SAVOLLAR
def build_speech():
    rows, sub, cont, total = budget_rows()
    d = base_doc()
    para(d, "«TOURIST.UZ» — HIMOYA NUTQI VA HAKAMLAR SAVOLLARIGA TAYYORGARLIK", bold=True, align="c", size=16, color=BLUE)
    d.add_heading("1. Himoya nutqi (5–7 daqiqa)", 1)
    speech = [
        ("1-slayd (20 s)", "Assalomu alaykum, hurmatli hakamlar! Biz [F.I.Sh.]. Sizga «Tourist.uz» loyihasini taqdim etamiz — O'zbekistonga kelgan sayyoh uchun AI marshrut, onlayn chipta va ona tilidagi ovozli gidni bitta ilovada birlashtiruvchi platforma."),
        ("2-slayd (40 s)", "Tasavvur qiling: Koreyadan kelgan sayyoh Samarqandga keldi. U qaysi obidaga birinchi borishni bilmaydi, Registonda kassada navbatda turadi, gid esa faqat rus yoki ingliz tilida. Taksida qancha yurishini, kun oxirigacha qancha pul ketishini bilmaydi. Bu to'rt muammo: tarqoq axborot, navbat, til to'sig'i va noaniq vaqt-budjet."),
        ("3-slayd (40 s)", "Bizning yechim olti qadamdan iborat. Sayyoh fuqaroligini va hududni tanlaydi. AI unga eng mos joylarni tartib bilan taklif qiladi. U 5 tagacha joy tanlaydi, transportni belgilaydi va tirbandlikni hisobga olgan yo'l vaqtini ko'radi. Chiptalarni bitta QR kod bilan onlayn oladi. Obidaga yetganda esa telefon o'zi uning ona tilida gapirib beradi."),
        ("4-slayd (40 s)", "Innovatsion jihatlar: AI tavsiyasi sayyohning madaniy kelib chiqishiga moslashadi; AI tuzgan reja bazadagi haqiqiy narxlar bilan tekshiriladi, ya'ni AI «o'ylab topolmaydi»; obidaga 150 metr yaqinlashganda gid o'zi ishga tushadi va 14 tilda gapiradi."),
        ("5-slayd (40 s)", "Google Maps, TripAdvisor, GetYourGuide, izi.TRAVEL va ChatGPT muammoning faqat bir qismini hal qiladi. Hech biri O'zbekiston obidalariga chipta, Payme va Click orqali to'lov hamda ona tilidagi GPS-gidni birlashtirmaydi. Bizning ustunligimiz — mahalliy integratsiya."),
        ("6-slayd — JONLI DEMO (90 s)", "Hozir buni jonli ko'rsatamiz. [Saytni oching → Sayohat → Germaniya → Samarqand → AI tavsiyasi → 4 ta joy → Taksi → marshrut → Chiptalarni savatga → Demo to'lov → QR. Keyin Audio-gid → Registon → «Obida oldida turibman» → ovoz.]"),
        ("7-slayd (20 s)", "Prototip HTML/JavaScript va Google Gemini sun'iy intellektida qurilgan. To'liq versiyada Flutter mobil ilovasi, backend va to'lov tizimlari ulanadi."),
        ("8–9-slayd (40 s)", f"MVP ni 12 oyda ishga tushirish uchun {fmt(total)} so'm kerak. Eng katta modda — dasturiy ta'minot. Prototipni esa bepul xizmatlar yordamida deyarli nol xarajat bilan yaratdik. Daromad chipta komissiyasi, premium gid, reklama va B2B hisobidan. Loyiha taxminan 12–18 oyda o'zini oqlaydi."),
        ("10–11-slayd (30 s)", "Birinchi yilda 10 mingdan ortiq foydalanuvchi, 15 mingdan ortiq onlayn chipta, navbatlarning 30–50% qisqarishi va 5 hududni qamrab olishni kutyapmiz."),
        ("12-slayd (10 s)", "Tourist.uz — O'zbekistonni dunyoga ona tilida tanishtiramiz. E'tiboringiz uchun rahmat! Savollaringizga tayyormiz."),
    ]
    for head, body in speech:
        p = d.add_paragraph()
        p.add_run(head + ". ").bold = True
        p.add_run(body)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    d.add_heading("2. Demo uchun tekshiruv ro'yxati (himoyadan oldin)", 1)
    bullets(d, [
        "Sayt ochilishini internet orqali tekshiring (telefon va noutbukda).",
        "Sozlamalar sahifasida Gemini API kaliti kiritilganini va «Ulanishni tekshirish» yashil ekanini tekshiring.",
        "Audio-gid uchun ovoz balandligini oshiring. Chrome brauzerida ingliz va rus ovozlari bor; o'zbek tili uchun «Gemini TTS» belgisini yoqing.",
        "Internet uzilib qolsa: sayt AI kalitisiz ham oflayn algoritm bilan ishlaydi — demo baribir ko'rsatiladi.",
        "Oldindan bitta buyurtma qilib qo'ying — QR chipta «Mening buyurtmalarim» bo'limida tursin.",
    ])

    d.add_heading("3. Hakamlar berishi mumkin bo'lgan savollar va javoblar", 1)
    qa = [
        ("ChatGPT ham marshrut tuzib beradi. Sizning farqingiz nima?",
         "ChatGPT faqat matn beradi: chipta sotmaydi, to'lov qilmaydi, GPS orqali obidani aniqlamaydi, narxlarni tekshirmaydi. Biz AI rejasini bazadagi haqiqiy narx va obidalar bilan tekshiramiz, keyin shu reja bo'yicha chipta sotamiz va joyida gid beramiz."),
        ("Obidalarga chipta sotish uchun ruxsat bormi?",
         "Hozir yo'q — prototipda to'lov demo rejimda. 1-bosqichda Madaniy meros agentligi va muzeylar bilan memorandum tuzish rejalashtirilgan. Dastlab bitta muzey bilan pilot boshlaymiz. Ruxsat olinguncha «onlayn bron + kassada QR» modeli ishlaydi."),
        ("AI noto'g'ri tarixiy ma'lumot aytib qo'ysa-chi?",
         "Asosiy matnlar tarixchi-ekspert tomonidan tekshiriladi va saqlanadi (smetada bu uchun alohida modda bor). AI faqat tasdiqlangan ma'lumot asosida tarjima qiladi va hikoya shaklida yozadi. Prototipda ham AI ga faqat aniq faktlarni aytish topshirig'i berilgan."),
        ("Nega fuqarolikni so'raysiz? Bu shaxsiy ma'lumot emasmi?",
         "Fuqarolik gid tilini, interfeys tilini, viza haqida ma'lumotni va madaniy tavsiyalarni avtomatik sozlash uchun kerak. Pasport ma'lumoti so'ralmaydi, prototipda hamma narsa faqat foydalanuvchi qurilmasida saqlanadi."),
        ("Tirbandlikni qanday hisoblaysiz?",
         "Prototipda masofa, transport tezligi va kun vaqtiga bog'liq koeffitsiyent (tig'iz soatlarda ×1.6–1.7) bilan. To'liq versiyada Yandex yoki Google tirbandlik API dan real vaqt ma'lumoti olinadi — smetada bu uchun xarajat bor."),
        ("Internet bo'lmasa ishlaydimi?",
         "To'liq versiyada audio va xaritani oldindan yuklab olish (oflayn paket) bo'ladi. Prototip esa AI kalitisiz ham ichki algoritm bilan ishlaydi."),
        ("Smetadagi raqamlar qayerdan olingan?",
         f"Dasturchilar ish haqi — mahalliy frilanser stavkalari; API — Google narxlari va kutilayotgan so'rovlar soni; 1 USD = {fmt(USD)} so'm. Excel faylda har bir qator formulasi bilan ko'rsatilgan."),
        ("Raqobatchi — «Uzbekistan Travel» kabi rasmiy ilovalar-chi?",
         "Rasmiy ilovalar asosan ma'lumot beradi. Bizda sotuv (chipta), shaxsiy AI reja va GPS audio-gid bor. Biz ular bilan hamkorlik qilishga ham tayyormiz — masalan, kontent almashish."),
        ("Loyiha qanday qilib o'zini oqlaydi?",
         "Chipta komissiyasi (5–7%), premium audio-gid, hamkorlar reklamasi va turoperatorlar uchun B2B. Prognoz bo'yicha 12–18 oyda — Excel fayldagi «Daromad prognozi» varag'iga qarang."),
        ("Kelajakda qanday rivojlantirasiz?",
         "Boshqa hududlar, AR (kamerani obidaga qaratsa tarixiy ko'rinishi), mehmonxona va poyezd chiptalari integratsiyasi, turoperatorlar uchun versiya."),
    ]
    for q, a in qa:
        p = d.add_paragraph()
        p.add_run("Savol: ").bold = True
        p.add_run(q).italic = True
        p = d.add_paragraph()
        p.add_run("Javob: ").bold = True
        p.add_run(a)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    path = os.path.join(OUT, "04_Himoya_nutqi_va_savollar.docx")
    d.save(path)
    return path


if __name__ == "__main__":
    rows, sub, cont, total = budget_rows()
    print(f"Smeta: jami {fmt(sub)} + 5% {fmt(cont)} = {fmt(total)} so'm (${total / USD:,.0f})")
    for f in (build_application, build_budget_xlsx, build_pptx, build_speech):
        print("✓", os.path.relpath(f(), ROOT))
