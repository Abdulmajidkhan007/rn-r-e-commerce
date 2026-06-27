import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { sendToUid, sendToAdmins } from '../lib/push.js';
import { localeFor, getCopy } from '../lib/i18n.js';
import type { Order } from '../types.js';

export const onOrderCreate = onDocumentCreated(
  'orders/{orderId}',
  async (event) => {
    try {
      const order = event.data?.data() as Order | undefined;
      if (!order || order.status !== 'deposit_paid') return;

      const orderId = event.params.orderId;

      // Aggregate qty per productId
      const qtyMap = new Map<string, number>();
      for (const item of order.items) {
        qtyMap.set(item.productId, (qtyMap.get(item.productId) ?? 0) + item.quantity);
      }

      const productIds = [...qtyMap.keys()];
      const orderRef = db().collection('orders').doc(orderId);

      let outOfStock = false;

      await db().runTransaction(async (tx) => {
        const productRefs = productIds.map((id) => db().collection('products').doc(id));
        const productDocs = await Promise.all(productRefs.map((ref) => tx.get(ref)));

        for (let i = 0; i < productDocs.length; i++) {
          const productDoc = productDocs[i];
          const productId = productIds[i];
          if (productDoc == null || productId == null) continue;

          const requestedQty = qtyMap.get(productId) ?? 0;
          if (!productDoc.exists || (productDoc.data()?.['stock'] ?? 0) < requestedQty) {
            outOfStock = true;
            break;
          }
        }

        if (outOfStock) {
          tx.update(orderRef, {
            status: 'cancelled',
            cancelReason: 'out_of_stock',
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          for (let i = 0; i < productDocs.length; i++) {
            const productDoc = productDocs[i];
            const productId = productIds[i];
            if (productDoc == null || productId == null) continue;

            const currentStock = productDoc.data()?.['stock'] as number ?? 0;
            const requestedQty = qtyMap.get(productId) ?? 0;
            tx.update(db().collection('products').doc(productId), {
              stock: currentStock - requestedQty,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      });

      // Load customer locale
      const userDoc = await db().collection('users').doc(order.userId).get();
      const locale = localeFor(userDoc.data() ?? {});
      const copy = getCopy(locale);

      if (outOfStock) {
        await sendToUid(order.userId, {
          title: copy.orderCancelled,
          body: copy.outOfStockReason,
          data: { orderId },
        });
      } else {
        await sendToAdmins({
          title: copy.newOrder,
          body: `${order.shippingAddress.fullName} — ${order.total} UZS`,
          data: { orderId },
        });
      }
    } catch (err) {
      logger.error('onOrderCreate error', err);
    }
  }
);
