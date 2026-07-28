import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import {
  cancelPayment,
  confirmDeposit,
  isAlreadyPaid,
  isPayable,
  loadOrder,
  safeEqual,
  somToTiyin,
} from './shared.js';

/**
 * Payme (Paycom) Merchant API endpoint.
 *
 * Payme drives the transaction: after the customer pays on their hosted
 * checkout, Payme calls this JSON-RPC endpoint. Everything here answers *their*
 * protocol — including the requirement that errors come back as JSON-RPC error
 * objects with specific negative codes, never as HTTP error statuses, or Payme
 * treats the callback as a transport failure and retries forever.
 *
 * Configure the merchant key as a secret:
 *   firebase functions:secrets:set PAYME_MERCHANT_KEY
 */
const PAYME_MERCHANT_KEY = defineSecret('PAYME_MERCHANT_KEY');

/** Payme's documented error codes. */
export const PaymeError = {
  InvalidAmount: -31001,
  TransactionNotFound: -31003,
  CantPerform: -31008,
  InvalidAccount: -31050,
  MethodNotFound: -32601,
  Unauthorized: -32504,
} as const;

/** Payme transaction states. */
export const PaymeState = {
  Created: 1,
  Completed: 2,
  CancelledBeforePerform: -1,
  CancelledAfterPerform: -2,
} as const;

interface JsonRpcRequest {
  method?: string;
  params?: Record<string, unknown>;
  id?: number | string | null;
}

function rpcError(
  id: JsonRpcRequest['id'],
  code: number,
  message: string,
  data?: string,
): Record<string, unknown> {
  return {
    error: { code, message: { ru: message, uz: message, en: message }, ...(data ? { data } : {}) },
    id: id ?? null,
  };
}

function rpcResult(id: JsonRpcRequest['id'], result: Record<string, unknown>): Record<string, unknown> {
  return { result, id: id ?? null };
}

/**
 * Verifies the `Basic` header Payme sends. The username is always the literal
 * `Paycom`; the password is the merchant key.
 */
export function isAuthorized(authHeader: string | undefined, merchantKey: string): boolean {
  if (!authHeader?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator === -1) return false;
  const user = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  return user === 'Paycom' && safeEqual(password, merchantKey);
}

/** Pulls our order id out of Payme's `account` object, whatever field it uses. */
export function orderIdFromAccount(params: Record<string, unknown> | undefined): string {
  const account = params?.['account'];
  if (account == null || typeof account !== 'object') return '';
  const values = Object.values(account as Record<string, unknown>);
  const first = values.find((v) => typeof v === 'string' && v.length > 0);
  return typeof first === 'string' ? first : '';
}

export const paymeWebhook = onRequest(
  { secrets: [PAYME_MERCHANT_KEY], cors: false },
  async (req, res) => {
    const body = (req.body ?? {}) as JsonRpcRequest;
    const id = body.id ?? null;

    if (!isAuthorized(req.headers.authorization, PAYME_MERCHANT_KEY.value())) {
      // Still HTTP 200: Payme reads the JSON-RPC error, not the status code.
      res.json(rpcError(id, PaymeError.Unauthorized, 'Unauthorized'));
      return;
    }

    try {
      const params = body.params ?? {};

      switch (body.method) {
        case 'CheckPerformTransaction': {
          const orderId = orderIdFromAccount(params);
          const order = await loadOrder(orderId);
          if (!order) {
            res.json(rpcError(id, PaymeError.InvalidAccount, 'Order not found', 'account'));
            return;
          }
          if (!isPayable(order)) {
            res.json(rpcError(id, PaymeError.CantPerform, 'Order is not awaiting payment'));
            return;
          }
          if (Number(params['amount']) !== somToTiyin(order.depositAmount)) {
            res.json(rpcError(id, PaymeError.InvalidAmount, 'Amount does not match the deposit'));
            return;
          }
          res.json(rpcResult(id, { allow: true }));
          return;
        }

        case 'CreateTransaction': {
          const orderId = orderIdFromAccount(params);
          const order = await loadOrder(orderId);
          if (!order) {
            res.json(rpcError(id, PaymeError.InvalidAccount, 'Order not found', 'account'));
            return;
          }
          if (Number(params['amount']) !== somToTiyin(order.depositAmount)) {
            res.json(rpcError(id, PaymeError.InvalidAmount, 'Amount does not match the deposit'));
            return;
          }
          if (!isPayable(order) && !isAlreadyPaid(order)) {
            res.json(rpcError(id, PaymeError.CantPerform, 'Order is not awaiting payment'));
            return;
          }
          res.json(
            rpcResult(id, {
              create_time: Number(params['time']) || Date.now(),
              transaction: orderId,
              state: PaymeState.Created,
            }),
          );
          return;
        }

        case 'PerformTransaction': {
          const orderId = String(params['id'] ?? '');
          const order = await loadOrder(orderId);
          if (!order) {
            res.json(rpcError(id, PaymeError.TransactionNotFound, 'Transaction not found'));
            return;
          }
          const performTime = Date.now();
          const outcome = await confirmDeposit(orderId, 'payme', orderId, performTime);
          if (outcome === 'not-found') {
            res.json(rpcError(id, PaymeError.TransactionNotFound, 'Transaction not found'));
            return;
          }
          if (outcome === 'not-payable') {
            res.json(rpcError(id, PaymeError.CantPerform, 'Order is not awaiting payment'));
            return;
          }
          // 'confirmed' and 'already-confirmed' answer identically — Payme
          // retries PerformTransaction and expects a stable success response.
          res.json(
            rpcResult(id, {
              perform_time: order.payment?.paidAt ?? performTime,
              transaction: orderId,
              state: PaymeState.Completed,
            }),
          );
          return;
        }

        case 'CancelTransaction': {
          const orderId = String(params['id'] ?? '');
          const order = await loadOrder(orderId);
          if (!order) {
            res.json(rpcError(id, PaymeError.TransactionNotFound, 'Transaction not found'));
            return;
          }
          const cancelTime = Date.now();
          const reason = Number(params['reason']) || 0;
          await cancelPayment(orderId, 'payme', orderId, reason, cancelTime);
          res.json(
            rpcResult(id, {
              cancel_time: cancelTime,
              transaction: orderId,
              state:
                order.status === 'deposit_paid'
                  ? PaymeState.CancelledAfterPerform
                  : PaymeState.CancelledBeforePerform,
            }),
          );
          return;
        }

        case 'CheckTransaction': {
          const orderId = String(params['id'] ?? '');
          const order = await loadOrder(orderId);
          if (!order) {
            res.json(rpcError(id, PaymeError.TransactionNotFound, 'Transaction not found'));
            return;
          }
          const paid = isAlreadyPaid(order);
          const cancelled = order.status === 'cancelled';
          res.json(
            rpcResult(id, {
              create_time: order.payment?.createdAt ?? 0,
              perform_time: order.payment?.paidAt ?? 0,
              cancel_time: order.payment?.cancelledAt ?? 0,
              transaction: orderId,
              state: cancelled
                ? PaymeState.CancelledBeforePerform
                : paid
                  ? PaymeState.Completed
                  : PaymeState.Created,
              reason: order.payment?.cancelReason ?? null,
            }),
          );
          return;
        }

        default:
          res.json(rpcError(id, PaymeError.MethodNotFound, 'Method not found'));
          return;
      }
    } catch (err) {
      logger.error('paymeWebhook error', { method: body.method, err });
      res.json(rpcError(id, PaymeError.CantPerform, 'Internal error'));
    }
  },
);
