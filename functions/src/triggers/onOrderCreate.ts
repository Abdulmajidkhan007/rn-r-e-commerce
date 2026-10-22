import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { sendToUid, sendToAdmins } from '../lib/push.js';
import { localeFor, getCopy } from '../lib/i18n.js';
import type { Order, OrderItem } from '../types.js';
import { applyLinesToStock, type StockUpdate, type StockedProduct } from '../lib/stock.js';

export const onOrderCreate = onDocumentCreated(
  'orders/{orderId}',
  async (event) => {
    try {
      const order = event.data?.data() as Order | undefined;
      if (!order || order.status !== 'deposit_paid') return;

      const orderId = event.params.orderId;

      // Group lines per product: variants of one product share its document.
      const linesByProduct = new Map<string, OrderItem[]>();
      for (const item of order.items) {
        linesByProduct.set(item.productId, [...(linesByProduct.get(item.productId) ?? []), item]);
      }

      const productIds = [...linesByProduct.keys()];
      const orderRef = db().collection('orders').doc(orderId);

      let outOfStock = false;

      await db().runTransaction(async (tx) => {
        const productRefs = productIds.map((id) => db().collection('products').doc(id));
        const productDocs = await Promise.all(productRefs.map((ref) => tx.get(ref)));

        const updates: { ref: (typeof productRefs)[number]; next: StockUpdate }[] = [];
        for (let i = 0; i < productDocs.length; i++) {
          const productDoc = productDocs[i];
          const ref = productRefs[i];
          const productId = productIds[i];
          if (productDoc == null || ref == null || productId == null) continue;

          const next = productDoc.exists
            ? applyLinesToStock(
                productDoc.data() as StockedProduct,
                linesByProduct.get(productId) ?? [],
              )
            : null;
          if (!next) {
            outOfStock = true;
            break;
          }
          updates.push({ ref, next });
        }

        if (outOfStock) {
          tx.update(orderRef, {
            status: 'cancelled',
            cancelReason: 'out_of_stock',
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          for (const { ref, next } of updates) {
            tx.update(ref, { ...next, updatedAt: FieldValue.serverTimestamp() });
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
