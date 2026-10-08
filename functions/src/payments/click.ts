import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { cancelPayment, confirmDeposit, isAlreadyPaid, isPayable, loadOrder, safeEqual } from './shared.js';

/**
 * Click SHOP-API endpoint.
 *
 * Click calls this twice per payment: `Prepare` (action 0) to reserve, then
 * `Complete` (action 1) to settle. Both carry an MD5 signature over a fixed
 * field order plus the secret key. As with Payme, failures are reported in the
 * response body — `error` — and not as HTTP statuses.
 *
 * Configure the secret key:
 *   firebase functions:secrets:set CLICK_SECRET_KEY
 */
const CLICK_SECRET_KEY = defineSecret('CLICK_SECRET_KEY');

export const ClickAction = { Prepare: 0, Complete: 1 } as const;

/** Click's documented error codes. */
export const ClickError = {
  Success: 0,
  SignCheckFailed: -1,
  IncorrectAmount: -2,
  ActionNotFound: -3,
  AlreadyPaid: -4,
  TransactionNotFound: -6,
  TransactionCancelled: -9,
} as const;

export interface ClickRequest {
  click_trans_id?: string;
  service_id?: string;
  merchant_trans_id?: string;
  merchant_prepare_id?: string;
  amount?: string;
  action?: string;
  sign_time?: string;
  sign_string?: string;
  error?: string;
}

/**
 * Click's signature is an MD5 over concatenated fields in a fixed order. The
 * `merchant_prepare_id` slot participates only on Complete, which is why the
 * two actions cannot share one naive concatenation.
 */
export function buildSignString(req: ClickRequest, secretKey: string): string {
  const isComplete = String(req.action) === String(ClickAction.Complete);
  const parts = [
    req.click_trans_id ?? '',
    req.service_id ?? '',
    secretKey,
    req.merchant_trans_id ?? '',
    ...(isComplete ? [req.merchant_prepare_id ?? ''] : []),
    req.amount ?? '',
    req.action ?? '',
    req.sign_time ?? '',
  ];
  return parts.join('');
}

export function verifySignature(req: ClickRequest, secretKey: string): boolean {
  const expected = createHash('md5').update(buildSignString(req, secretKey)).digest('hex');
  return safeEqual((req.sign_string ?? '').toLowerCase(), expected);
}

/**
 * Click sends amounts as a decimal string in som and tolerates trailing
 * decimals ("150000.00"), so compare numerically rather than by string.
 */
export function amountMatches(amount: string | undefined, depositSom: number): boolean {
  // Number('') and Number('   ') are 0, not NaN, so an absent amount would
  // validate against a zero deposit. Reject blank input before parsing.
  if (amount == null || amount.trim() === '') return false;
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return false;
  return Math.round(parsed) === depositSom;
}

function reply(
  res: Response,
  req: ClickRequest,
  error: number,
  extra: Record<string, unknown> = {},
): void {
  res.json({
    click_trans_id: req.click_trans_id,
    merchant_trans_id: req.merchant_trans_id,
    error,
    error_note: error === ClickError.Success ? 'Success' : 'Error',
    ...extra,
  });
}

export const clickWebhook = onRequest(
  { secrets: [CLICK_SECRET_KEY], cors: false },
  async (rawReq, res) => {
    const req = (rawReq.body ?? {}) as ClickRequest;

    try {
      if (!verifySignature(req, CLICK_SECRET_KEY.value())) {
        reply(res, req, ClickError.SignCheckFailed);
        return;
      }

      const orderId = req.merchant_trans_id ?? '';
      const order = await loadOrder(orderId);
      if (!order) {
        reply(res, req, ClickError.TransactionNotFound);
        return;
      }

      if (!amountMatches(req.amount, order.depositAmount)) {
        reply(res, req, ClickError.IncorrectAmount);
        return;
      }

      const action = Number(req.action);

      if (action === ClickAction.Prepare) {
        if (order.status === 'cancelled') {
          reply(res, req, ClickError.TransactionCancelled);
          return;
        }
        if (isAlreadyPaid(order)) {
          reply(res, req, ClickError.AlreadyPaid);
          return;
        }
        if (!isPayable(order)) {
          reply(res, req, ClickError.TransactionNotFound);
          return;
        }
        // merchant_prepare_id must be echoed back on Complete; the order id
        // serves as it, keeping the whole flow keyed on one identifier.
        reply(res, req, ClickError.Success, { merchant_prepare_id: orderId });
        return;
      }

      if (action === ClickAction.Complete) {
        // A non-zero error on Complete means Click is rolling the payment back.
        const clickError = Number(req.error ?? 0);
        if (clickError < 0) {
          await cancelPayment(orderId, 'click', req.click_trans_id ?? '', clickError, Date.now());
          reply(res, req, ClickError.TransactionCancelled);
          return;
        }

        const outcome = await confirmDeposit(
          orderId,
          'click',
          req.click_trans_id ?? '',
          Date.now(),
        );

        if (outcome === 'not-found') {
          reply(res, req, ClickError.TransactionNotFound);
          return;
        }
        if (outcome === 'already-confirmed') {
          // Retries are expected; report the documented code rather than
          // confirming a second time.
          reply(res, req, ClickError.AlreadyPaid, { merchant_confirm_id: orderId });
          return;
        }
        if (outcome === 'not-payable') {
          reply(res, req, ClickError.TransactionCancelled);
          return;
        }

        reply(res, req, ClickError.Success, { merchant_confirm_id: orderId });
        return;
      }

      reply(res, req, ClickError.ActionNotFound);
    } catch (err) {
      logger.error('clickWebhook error', { action: req.action, err });
      reply(res, req, ClickError.ActionNotFound);
    }
  },
);
