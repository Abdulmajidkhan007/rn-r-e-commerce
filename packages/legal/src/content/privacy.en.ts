const privacy = `# Privacy Policy

Last updated: 2026-06-27

KidsWear sells children's clothing. Our customers are adults (parents and guardians). This service is not directed at children under 18.

## Data We Collect

We collect only what is needed to run the service:

- **Email address** — used for account authentication via Firebase Auth. We do not store your password; Firebase handles the credential hash.
- **Display name** — the name you enter when creating or updating your profile.
- **Phone number** — optional; used for order contact purposes.
- **Shipping addresses** — full name, phone, region, district, street, and an optional note.
- **Language preference** — stored to show the app in your chosen language.
- **Avatar image** — optional profile photo you choose to upload, stored in Firebase Storage.
- **Device push token** — stored so we can send you order-status notifications.
- **Biometric AppLock** — on mobile, a boolean flag (on/off) is stored in device secure storage only. No biometric data leaves your device; your real session remains Firebase Auth.
- **Order data** — items purchased, quantities, prices, shipping address, payment amounts, and order-status history.

## How We Use Your Data

- To create and manage your account.
- To fulfill and track your orders.
- To send order-status push notifications.
- To display the app in your preferred language.
- To allow admins to manage products and orders.

## Who Has Access

- **You** — you can view and edit your own profile, addresses, and order history.
- **KidsWear admins** — access is role-gated via Firebase; admins can view orders and manage the product catalog.
- We do not sell, rent, or share your data with third parties for marketing.

## Third Parties

We use the following infrastructure providers:

- **Google Firebase** (Auth, Firestore, Storage, Cloud Functions, FCM) — [https://policies.google.com/privacy](https://policies.google.com/privacy)

No other third-party analytics, advertising networks, or data brokers are used.

## Retention

- Account data is kept while your account is active.
- Order records are kept for at least 12 months for accounting and legal purposes.
- You may request deletion of your account and associated data (see Your Rights).

## Your Rights

You have the right to:

- **Access** — request a copy of the data we hold about you.
- **Correction** — ask us to correct inaccurate data.
- **Deletion** — ask us to delete your account and personal data.

To exercise these rights, contact us at santexnika.atoyo@gmail.com. We will respond within 30 days where applicable law requires.

## Children's Policy

KidsWear sells children's clothing to adults. This service is intended for users 18 years of age or older. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately and we will delete it promptly.

## Changes

We may update this policy from time to time. The "Last updated" date at the top of this page will reflect any changes. Material changes will also be announced within the app.

## Contact

For privacy questions or data requests:

santexnika.atoyo@gmail.com

*(Placeholder address — to be replaced before production launch.)*
`;

export default privacy;
