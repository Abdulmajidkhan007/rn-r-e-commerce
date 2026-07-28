# Google Play listing — English

Draft copy for the Play Console. Review and edit before submitting; the
character limits below are Google's hard caps.

## App name (30 chars max)

```
KidsWear — Kids' Clothing
```

## Short description (80 chars max)

```
Shop children's clothing in Uzbekistan. Pay a 50% deposit, track every order.
```

(76 characters)

## Full description (4000 chars max)

```
KidsWear is an online store for children's clothing in Uzbekistan.

Browse the catalogue, pick sizes and colours, and place an order in a few taps.
You pay a 50% deposit up front and settle the rest on delivery — so you are
never asked for the full amount before you have seen the item.

WHAT YOU CAN DO

• Browse by category, search by name, and sort by price
• See live stock levels before you order — no surprises after checkout
• Save several delivery addresses and reuse them at checkout
• Pay a 50% deposit to confirm your order
• Follow your order from confirmation to delivery, with push notifications at
  every status change
• Cancel an order yourself while it is still being prepared
• Use the app in Uzbek, Russian or English
• Switch between light and dark themes
• Lock the app behind your fingerprint or face, so your account stays private on
  a shared phone

DELIVERY AND PAYMENT

Orders are delivered across Uzbekistan. Prices are shown in Uzbek som (UZS).
The 50% deposit confirms your order; the remainder is due on delivery.

ACCOUNT

You need an account to order, so we can attach your orders and delivery
addresses to you. You can sign in with an email address and password, or with
your Google account.

ABOUT THIS APP

KidsWear sells clothing for children, but the app is intended for adult buyers
— parents and guardians aged 18 and over. It is not designed for or marketed to
children.

Questions or problems? Contact us at the address on our website, and see our
privacy policy and terms in the app under Profile.
```

## Category and tags

- **Category:** Shopping
- **Tags:** clothing, shopping, kids
- **Content rating:** expect *Everyone* — no violence, no user-to-user
  communication, no gambling, no ads. Answer the questionnaire honestly; the
  only nuance is that the app sells goods (a purchase flow), which the
  questionnaire asks about separately.
- **Target audience:** 18+. Do **not** opt into the Families programme — the app
  is for adult buyers, which keeps it out of scope for the child-audience rules.

## Contact details

- **Email:** ⚠️ replace the `support@kidswear.example` placeholder throughout
  `packages/legal` and here with a real, monitored address before submitting.
- **Privacy policy URL:** `https://<your-domain>/privacy` — must be publicly
  reachable before you can submit. It is produced by deploying the web app.
- **Website:** `https://<your-domain>`

## Graphics checklist

| Asset            | Requirement                                   | Status |
| ---------------- | --------------------------------------------- | ------ |
| App icon         | 512×512 PNG, 32-bit, no alpha                 | Generate from `assets/source/kidswear-mark.svg` (`npm run brand:assets`) — currently a **placeholder mark**, replace with real branding |
| Feature graphic  | 1024×500 PNG or JPEG, no alpha                | ❌ not produced yet |
| Phone screenshots| 2–8, min 320 px, max 3840 px, 16:9 or 9:16    | ❌ requires a running build |
| Tablet screenshots | Optional, but improves listing quality      | ❌ |

Screenshots worth capturing, in this order — they should tell the purchase
story: catalogue → product detail → cart with the deposit split → order tracking
timeline → profile with language/theme.

## Data safety form

Answers derived from what the code actually stores. Re-check if the data model
changes.

**Does your app collect or share any of the required user data types?** Yes.

| Data type | Collected | Shared | Required | Purpose | Where in the code |
| --------- | --------- | ------ | -------- | ------- | ----------------- |
| Name | Yes | No | Yes | Account management, order fulfilment | `UserProfile.displayName`, `Address.fullName` |
| Email address | Yes | No | Yes | Account management | `UserProfile.email` (Firebase Auth) |
| Phone number | Yes | No | Optional | Order fulfilment (delivery contact) | `UserProfile.phone`, `Address.phone` |
| Address | Yes | No | Yes | Order fulfilment (delivery) | `Address` |
| Photos | Yes | No | Optional | Account management (profile avatar) | `UserProfile.avatarUrl`, Firebase Storage |
| Purchase history | Yes | No | Yes | App functionality (order history) | `orders` collection |
| App activity / other | No | — | — | — | no analytics SDK is initialised |

**Security practices to declare:**

- Data is encrypted in transit — yes (all Firebase traffic is HTTPS/TLS).
- Users can request deletion — ⚠️ **currently not implemented in the app.** The
  privacy policy points users at the support email for deletion requests. Google
  accepts an off-app request channel, but you must declare it that way, and the
  policy page must state the route. An in-app "delete my account" flow would be
  the stronger answer.
- Committed to the Play Families policy — no (adult-audience app).
- Independent security review — no.

**Not collected**, and worth being able to state confidently: no advertising ID,
no location, no contacts, no messages, no health data, no payment card details
(the deposit runs through a payment provider; the app never sees card numbers).

> ⚠️ Firebase Analytics is **not** initialised — `measurementId` is passed only
> when the env var is set, and no analytics calls exist in the codebase. If you
> ever enable Analytics, the "App activity" and "Device or other IDs" rows above
> have to change.

## Pre-submission checklist

- [ ] Real support email replacing `support@kidswear.example` everywhere
- [ ] Web app deployed, so the privacy policy URL resolves publicly
- [ ] Real brand assets replacing the generated placeholder mark
- [ ] Upload keystore generated and backed up (see README → Release signing)
- [ ] `versionCode` / `versionName` set for the first release
- [ ] `google-services.json` in place and the gradle plugin uncommented
- [ ] SHA-1/SHA-256 of the **upload key** registered in the Firebase Console
- [ ] Signed `.aab` built with `./gradlew bundleRelease`
- [ ] Screenshots and feature graphic captured from that build
- [ ] Firestore rules and Cloud Functions deployed (the app is not safe to ship
      without the rules in force)
