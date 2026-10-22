import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { manualStockDelta, type Product, type ProductVariant } from '@kidswear/core';
import { stockErrorMessage, useAdjustStock } from '@kidswear/data';
import { useAuth } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';

export type ManualReason = 'intake' | 'writeoff' | 'inventory';

export interface StockMoveTarget {
  product: Product;
  variant: ProductVariant;
  /** "Kofta — M / Red", already localized. */
  label: string;
  reason: ManualReason;
}

const TITLE = {
  intake: 'inventory.intake',
  writeoff: 'inventory.writeoff',
  inventory: 'inventory.count',
} as const;

export interface StockMoveDialogProps {
  target: StockMoveTarget | null;
  onClose: () => void;
  onDone: (delta: number) => void;
}

/** Kirim / hisobdan chiqarish / inventarizatsiya for one variant. */
export function StockMoveDialog({
  target,
  onClose,
  onDone,
}: StockMoveDialogProps): React.ReactElement {
  return (
    <Dialog open={target !== null} onClose={onClose} fullWidth maxWidth="xs">
      {target && (
        <StockMoveForm
          key={`${target.variant.id}-${target.reason}`}
          target={target}
          onClose={onClose}
          onDone={onDone}
        />
      )}
    </Dialog>
  );
}

function StockMoveForm({
  target,
  onClose,
  onDone,
}: StockMoveDialogProps & { target: StockMoveTarget }): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();
  const adjust = useAdjustStock();
  const { product, variant, reason, label } = target;
  const [quantity, setQuantity] = useState(reason === 'inventory' ? String(variant.stock) : '');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const qty = Number(quantity);
  const valid =
    quantity.trim() !== '' &&
    Number.isInteger(qty) &&
    qty >= 0 &&
    (reason === 'inventory' || qty > 0);
  const delta = valid ? manualStockDelta(product, variant.id, reason, qty) : null;

  const submit = async (): Promise<void> => {
    if (!user || !valid) {
      setError(t('inventory.errors.invalidQuantity'));
      return;
    }
    try {
      const applied = await adjust.mutateAsync({
        productId: product.id,
        variantId: variant.id,
        reason,
        quantity: qty,
        note,
        by: user.uid,
      });
      onDone(applied);
    } catch (e) {
      const msg = stockErrorMessage(e);
      setError(t(msg.key, { defaultValue: msg.key }));
    }
  };

  return (
    <>
      <DialogTitle>{t(TITLE[reason])}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle2">{label}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('inventory.current', { count: variant.stock })}
            </Typography>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            type="number"
            label={
              reason === 'inventory' ? t('inventory.countedQuantity') : t('inventory.quantity')
            }
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            slotProps={{ htmlInput: { min: 0, step: 1, inputMode: 'numeric' } }}
            helperText={
              delta !== null
                ? t('inventory.difference', { delta: delta > 0 ? `+${delta}` : delta })
                : ' '
            }
          />
          <TextField
            label={t('inventory.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('actions.cancel')}</Button>
        <Button
          variant="contained"
          disabled={adjust.isPending || !valid}
          onClick={() => void submit()}
        >
          {t('inventory.apply')}
        </Button>
      </DialogActions>
    </>
  );
}
