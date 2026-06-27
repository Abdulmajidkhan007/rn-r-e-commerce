import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { db } from '../lib/admin.js';
import { sendToUid } from '../lib/push.js';
import { localeFor, getCopy } from '../lib/i18n.js';
import type { Order, OrderStatus } from '../types.js';

export const onOrderUpdate = onDocumentUpdated(
  'orders/{orderId}',
  async (event) => {
    try {
      const before = event.data?.before.data() as Order | undefined;
      const after = event.data?.after.data() as Order | undefined;

      if (!before || !after) return;
      if (before.status === after.status) return;

      // Skip out_of_stock cancellations — onOrderCreate already pushed that
      if (after.status === 'cancelled' && after.cancelReason === 'out_of_stock') return;

      const orderId = event.params.orderId;

      const userDoc = await db().collection('users').doc(after.userId).get();
      const locale = localeFor(userDoc.data() ?? {});
      const copy = getCopy(locale);

      const statusLabel = copy.status[after.status as OrderStatus] ?? after.status;
      const title = statusLabel;
      const body = copy.statusBody(statusLabel);

      await sendToUid(after.userId, {
        title,
        body,
        data: { orderId },
      });
    } catch (err) {
      logger.error('onOrderUpdate error', err);
    }
  }
);
