# Firestore zaxira nusxasi va tiklash (Faza 12)

Har kuni 06:17 (Toshkent) GitHub Actions (`.github/workflows/backup.yml`) Firestore'ning
**hamma kolleksiyalarini** (ichki kolleksiyalar bilan) Admin SDK orqali o'qiydi,
**shifrlaydi** va egasining **alohida private** repo'siga yozadi. Oxirgi 14 ta nusxa
saqlanadi (`BACKUP_KEEP`, 7–30).

## Nima saqlanadi, nima saqlanmaydi

| Bor                                                                                                                                      | Yo'q                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Firestore'dagi hamma hujjatlar: mahsulotlar, buyurtmalar, foydalanuvchi profillari, cheklar (`receipts`), tannarx, sozlamalar, sharhlar… | Firebase **Auth** akkauntlari (email/parol, Google bog'lanishi) — `firebase auth:export` bilan alohida olinadi |
| Turlari aniq tiklanadi: sana (Timestamp), GeoPoint, hujjat havolalari, baytlar, vektorlar                                                | Cloud **Storage** fayllari (Spark'da yo'q; rasm va cheklar hozir Firestore'da — ular zaxirada bor)             |
|                                                                                                                                          | Functions secret'lari, Hosting fayllari (ular kodda/GitHub'da)                                                 |

## Shifrlash

- Fayl: `kidswear-firestore-YYYYMMDD-HHMMSS.kwbk`.
- `gzip(JSON)` → **AES-256-GCM**; kalit paroldan **scrypt** (N=2¹⁷, r=8, p=1) bilan olinadi,
  har faylga yangi tasodifiy salt va IV. Sarlavha (KDF parametrlari, salt, IV) ham GCM bilan
  tasdiqlanadi — fayldagi bitta bayt o'zgarsa yoki parol noto'g'ri bo'lsa, ochilmaydi
  (yarim yoki buzuq ma'lumot chiqmaydi).
- Kod: `scripts/lib/backup-format.ts`; testlar: `scripts/backup-format.test.ts`,
  `test/backup/backup-restore.test.ts` (emulyatorda zaxira → o'chirish → tiklash).
- Workflow nusxani yozgach diskdagi faylni qayta ochib, eksport bilan solishtiradi.
- Logda faqat kolleksiya nomlari, sonlar, hajm va SHA-256 — ma'lumot yo'q.

## Nega Actions artifact emas, private repo

Bu repo **ochiq**. Ochiq repo'ning Actions artifact'larini GitHub'ga kirgan har kim yuklab
oladi — fayl shifrlangan bo'lsa ham, shaxsiy ma'lumot (telefon, manzil, cheklar) bor
nusxani ochiq joyga qo'ymaymiz: parol bir kun sizsa, hamma eski nusxalar ochiladi.
Spark'da Cloud Storage bucket ham yo'q (billing kerak). Shuning uchun: **alohida private
GitHub repo**, `backups` branch'i. Har zaxirada bitta yangi commit (orphan) bilan
force-push qilinadi — eski nusxalar tarixda qolmaydi (GitHub bog'lanmagan obyektlarni
keyinroq o'zi tozalaydi), faqat oxirgi `BACKUP_KEEP` tasi.
Workflow yozishdan oldin repo haqiqatan **private** ekanini API orqali tekshiradi; private
bo'lmasa — to'xtaydi.

## Bir martalik sozlash (egasi, telefondan ham bo'ladi)

1. **Private repo** yarating, masalan `kidswear-backups` (bo'sh, README shart emas).
   _Visibility: Private._
2. **Token:** GitHub → Settings → Developer settings → _Fine-grained tokens_ → Generate:
   - Repository access: _Only select repositories_ → `kidswear-backups`;
   - Permissions → Repository → **Contents: Read and write** (boshqasi kerak emas);
   - Muddati: 1 yil (eslatma qo'ying — muddati tugasa zaxira to'xtaydi).
3. **Parol** — kamida 24 belgi, tasodifiy. Masalan parol menejerida 40 belgilik parol
   yarating (yoki kompyuterda `openssl rand -base64 36`).
   ⚠️ **Parol nusxasini parol menejerida (yoki qog'ozda, seyfda) saqlang.** GitHub secret'ni
   qayta o'qib bo'lmaydi; parol yo'qolsa, zaxiralarni hech kim (siz ham) ocha olmaydi.
4. Bu repo'da (`rn-r-e-commerce`) → Settings → Secrets and variables → Actions:

   | Tur            | Nomi                       | Qiymati                              |
   | -------------- | -------------------------- | ------------------------------------ |
   | Secret         | `BACKUP_PASSPHRASE`        | 3-qadamdagi parol                    |
   | Secret         | `BACKUP_REPO_TOKEN`        | 2-qadamdagi token                    |
   | Variable       | `BACKUP_REPO`              | `Abdulmajidkhan007/kidswear-backups` |
   | Variable       | `BACKUP_KEEP`              | ixtiyoriy, `7`–`30` (standart `14`)  |
   | (bor) Secret   | `FIREBASE_SERVICE_ACCOUNT` | deploy uchun berilgan                |
   | (bor) Variable | `FIREBASE_PROJECT_ID`      | deploy uchun berilgan                |

5. Actions → **Backup (Firestore, encrypted)** → _Run workflow_ — birinchi nusxa. Keyin
   `kidswear-backups` repo'sida `backups` branch'ida `.kwbk` fayl, `SHA256SUMS`, `README.md`
   paydo bo'ladi.
6. Actions → **Restore (Firestore backup)** → `mode: drill` — nusxa emulyatorga tiklanib,
   hujjatlar soni chiqadi (jonli bazaga tegmaydi). Shu o'tsa, zaxira ishlaydi.

Workflow yiqilsa GitHub email yuboradi (Settings → Notifications → Actions).
Service account'ga Firestore o'qish/yozish ruxsati deploy uchun allaqachon bor.

## Tiklash

### A. Telefondan (GitHub Actions)

Actions → **Restore (Firestore backup)** → Run workflow:

- `mode`: `drill` — sinov (emulyatorda). `live` — **jonli bazaga**.
- `file`: `latest` yoki aniq nom (`kidswear-firestore-20261104-011700.kwbk`).
- `collections`: bo'sh = hammasi; masalan `products,categories` — faqat shular.
- `confirm`: `live` uchun loyiha ID sini **aynan** yozing. Yozilmasa yoki xato bo'lsa —
  faqat _dry run_ (nima yozilishini ko'rsatadi, hech narsa yozmaydi).

Avval `confirm` siz ishga tushirib, logdagi sonlarni tekshiring, keyin `confirm` bilan.

### B. Kompyuterdan

```bash
git clone --branch backups https://github.com/Abdulmajidkhan007/kidswear-backups.git
cd kidswear-backups && sha256sum --check SHA256SUMS && cd ..

export BACKUP_PASSPHRASE='…'                       # parol menejeridan
export GOOGLE_APPLICATION_CREDENTIALS=./sa.json    # service account kaliti (gitignore'da)

# 1) dry run — hech narsa yozilmaydi
node scripts/restore-firestore.ts kidswear-backups/<fayl>.kwbk --project <loyiha-id>
# 2) haqiqiy tiklash (faqat ba'zi kolleksiyalar: --collections products,orders)
node scripts/restore-firestore.ts kidswear-backups/<fayl>.kwbk --project <loyiha-id> --confirm <loyiha-id>
```

Ichini ko'rish uchun (shaxsiy ma'lumot! ishlatib bo'lgach o'chiring):
`node scripts/restore-firestore.ts <fayl>.kwbk --decrypt-to plain.json`.

### Emulyatorda sinash (kompyuter)

```bash
npx firebase emulators:start --only firestore --project kidswear-local &
node scripts/seed-emulator.mjs kidswear-local
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 BACKUP_PASSPHRASE='kamida-24-belgili-sinov-paroli'
node scripts/backup-firestore.ts /tmp/b.kwbk --project kidswear-local
node scripts/restore-firestore.ts /tmp/b.kwbk --project kidswear-local --confirm kidswear-local
```

Avtomatik sinov: `npm run test:rules` (CI'da ham) — `test/backup/backup-restore.test.ts`.

## Tiklash qanday ishlaydi (muhim)

- Zaxiradagi har hujjat `set()` bilan **to'liq ustidan yoziladi**.
- Zaxirada **yo'q** hujjatlar (zaxiradan keyin yaratilganlar) **o'chirilmaydi**. Bazani
  aynan zaxira holatiga qaytarish kerak bo'lsa — avval o'sha kolleksiyalarni Firebase
  Console'da qo'lda o'chiring.
- Boshqa loyihaning zaxirasini tiklash `--allow-other-project` siz rad etiladi.
- Auth akkauntlari tiklanmaydi (yuqoriga qarang) — foydalanuvchi profili (`users/{uid}`)
  tiklansa ham, akkaunt o'chirilgan bo'lsa u kira olmaydi.

## Parol yoki token almashtirish

- **Token** muddati tugasa: yangisini yarating va `BACKUP_REPO_TOKEN` ni yangilang.
- **Parol** almashtirilsa: eski nusxalar ESKI parol bilan ochiladi. Eski parolni ham
  `BACKUP_KEEP` kun saqlang (yoki almashtirgach bir marta `drill` qiling va eski
  nusxalar aylanib chiqib ketguncha eski parolni o'chirmang).
- Parol sizib chiqdi deb gumon bo'lsa: yangi parol qo'ying, `kidswear-backups` repo'sini
  o'chirib qayta yarating (eski shifrlangan nusxalar yo'qoladi) va `Backup` ni qo'lda
  ishga tushiring.
