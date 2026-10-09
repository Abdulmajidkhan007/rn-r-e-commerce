# KidsWear — reja: atoyo-e-commerce darajasiga olib chiqish

> atoyo.uz real do'konda ishlaydi va unda sinalgan funksiyalar bor. Bu yerda —
> ulardan qaysilari KidsWear'ga kerak, qaysi tartibda va nimaga bog'liq.
> Tuzilgan: 2026-10-09.

## Asosiy cheklov: Blaze

Server tomonidagi hamma narsa (Telegram bot, to'lov webhook'lari, e'lon
tarqatish, AI) **Cloud Functions** talab qiladi → Firebase **Blaze**. Billing
hisobining loyiha limiti to'lgan. Yechim (egasi): ishlatilmayotgan loyihadan
billing'ni uzish yoki limitni oshirishni so'rash. Ungacha faqat 1-guruh.

## 1-guruh — Blaze'siz qilsa bo'ladi ✅ (2026-10-09, veb)

| # | Funksiya | atoyo'da | Nima qilinadi |
|---|---|---|---|
| 1 | Aloqa sahifasi | `/api/contact` | Forma → Firestore `messages` (rules bilan cheklangan); admin panelda ro'yxat |
| 2 | Blog | `/admin/blog` | Admin maqola yozadi (uz/en/ru), saytda ro'yxat + sahifa |
| 3 | Promo-kod | `/admin/promokod` | Admin kod yaratadi (foiz/summa, muddat, limit); checkout'da qo'llanadi. Yakuniy tekshiruv — 2-guruhda serverga ko'chadi |
| 4 | Yetkazib berish narxi | `/api/delivery` | Viloyat bo'yicha narx jadvali admin sozlamalarida; checkout'da hisoblanadi |
| 5 | Sevimlilar (wishlist) | bor | Foydalanuvchi profilida saqlanadi |
| 6 | Admin hisobot | `/admin/hisobot` | Kunlik/oylik savdo, eng ko'p sotilgan mahsulot (mavjud buyurtmalardan) |

## 2-guruh — Blaze kerak

| # | Funksiya | atoyo'da | Nima qilinadi |
|---|---|---|---|
| 7 | Buyurtma → Telegram guruh | forum topic + tugmalar | Yangi buyurtma admin guruhiga tushadi; tugmalar holatni o'zgartiradi (webhook) |
| 8 | E'lon (broadcast) | `/admin/xabar`, `/elon` | Bot obunachilari, email va kanalga bir vaqtda |
| 9 | Payme / Click jonli | bor | Merchant shartnomasi + secret'lar; kod tayyor |
| 10 | Push bildirishnoma | FCM | Buyurtma holati o'zgarganda; kod tayyor (`onOrderUpdate`) |
| 11 | AI yordamchi | `/api/assistant` | Gemini: katalog bo'yicha savol-javob, o'lcham maslahati |
| 12 | Rasm yuklash | Storage | Admin mahsulot rasmini o'zi yuklaydi (hozir URL bilan) |

## 3-guruh — keyin

Optom narx (`/admin/optom`), ombor (`/admin/ombor`), do'kon TV ekrani (`/tv`),
Play Store'ga chiqarish (listing qoralamasi bor: `store/`).

1-guruh vebda tayyor: emulyatorda brauzer bilan to'liq oqim sinaldi (aloqa →
admin: yetkazish, promo, blog → sevimlilar → promo bilan buyurtma → hisobot),
qoidalar 51 test. **Mobil ilova (2026-10-09):** 1-guruh ilovaga ham
qo'shildi — sevimlilar, blog, aloqa, checkout'da promo-kod va hudud narxi,
admin: hisobot, xabarlar, blog, promo, yetkazish. APK: `releases/latest/download/kidswear.apk`.

## Tartib

1 → 2 → 3 → 4 (bir hafta ichida, Blaze'siz), keyin Blaze ochilishi bilan
7 → 9 → 10 → 8. Har band alohida commit + test; jonli saytda tekshirilgach
`docs/LOYIHA-HAQIDA.md` dagi jadval yangilanadi.
