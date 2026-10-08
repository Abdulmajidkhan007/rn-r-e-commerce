import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { db, messaging } from './admin.js';

export interface PushPayload {
  title: string;
  body: string;
  /** FCM data payload — values must be strings. */
  data?: Record<string, string>;
}

/**
 * FCM is the only channel on both web and native. User docs written before the
 * Expo removal may still hold a legacy `pushTokens.expo` array; it is never
 * read, so those entries just go stale. No migration is needed.
 */
const TOKEN_FIELD = 'pushTokens.fcm';

function tokensOf(data: Record<string, unknown> | undefined): string[] {
  const pushTokens = data?.['pushTokens'] as { fcm?: unknown } | undefined;
  const fcm = pushTokens?.fcm;
  return Array.isArray(fcm) ? fcm.filter((t): t is string => typeof t === 'string') : [];
}

/**
 * Drops tokens FCM reported as permanently invalid (app uninstalled, token
 * rotated). Leaving them would make every later send retry a dead device.
 */
async function pruneTokens(uid: string, tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  try {
    await db()
      .collection('users')
      .doc(uid)
      .update({ [TOKEN_FIELD]: FieldValue.arrayRemove(...tokens) });
  } catch (err) {
    logger.warn('pruneTokens failed', { uid, err });
  }
}

async function sendTo(uid: string, tokens: string[], payload: PushPayload): Promise<void> {
  if (tokens.length === 0) return;

  const response = await messaging().sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    ...(payload.data ? { data: payload.data } : {}),
  });

  const dead: string[] = [];
  response.responses.forEach((res, i) => {
    if (res.success) return;
    const code = res.error?.code;
    const token = tokens[i];
    if (
      token != null &&
      (code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument')
    ) {
      dead.push(token);
    }
  });

  await pruneTokens(uid, dead);
}

/** Sends a push to every device registered by one user. */
export async function sendToUid(uid: string, payload: PushPayload): Promise<void> {
  try {
    const userDoc = await db().collection('users').doc(uid).get();
    await sendTo(uid, tokensOf(userDoc.data()), payload);
  } catch (err) {
    logger.error('sendToUid failed', { uid, err });
  }
}

/** Sends a push to every device of every admin user. */
export async function sendToAdmins(payload: PushPayload): Promise<void> {
  try {
    const admins = await db().collection('users').where('role', '==', 'admin').get();
    await Promise.all(admins.docs.map((doc) => sendTo(doc.id, tokensOf(doc.data()), payload)));
  } catch (err) {
    logger.error('sendToAdmins failed', { err });
  }
}
