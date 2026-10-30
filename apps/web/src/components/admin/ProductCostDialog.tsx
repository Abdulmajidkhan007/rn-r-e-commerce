import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import {
  normalizeProductCost,
  productVariants,
  unitCostFor,
  variantPrice,
  type Product,
  type ProductCost,
} from '@kidswear/core';
import { useProductCosts, useSaveProductCost } from '@kidswear/data';
import { useAuth } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatPrice } from '@kidswear/utils';
import { TableSkeleton } from './TableSkeleton';

export interface ProductCostDialogProps {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Admin-only purchase cost of a product: a default plus optional per-variant
 * values. Stored in `productCosts/{id}`, never on the public product.
 */
export function ProductCostDialog({
  product,
  onClose,
  onSaved,
}: ProductCostDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const costs = useProductCosts();
  return (
    <Dialog open={product !== null} onClose={onClose} fullWidth maxWidth="sm">
      {product && (
        <>
          <DialogTitle>{t('profit.costTitle', { name: product.name.uz })}</DialogTitle>
          {costs.isLoading ? (
            <DialogContent>
              <TableSkeleton rows={3} columns={3} />
            </DialogContent>
          ) : costs.isError ? (
            <DialogContent>
              <Alert severity="error">{t('profit.loadFailed')}</Alert>
            </DialogContent>
          ) : (
            <CostForm
              key={product.id}
              product={product}
              current={costs.data?.get(product.id) ?? null}
              onClose={onClose}
              onSaved={onSaved}
            />
          )}
        </>
      )}
    </Dialog>
  );
}

/** '' → undefined; anything else must be a non-negative integer. */
function parseCost(raw: string): number | undefined | 'invalid' {
  if (raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : 'invalid';
}

function CostForm({
  product,
  current,
  onClose,
  onSaved,
}: {
  product: Product;
  current: ProductCost | null;
  onClose: () => void;
  onSaved: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();
  const language = useAppSelector((s) => s.ui.language);
  const save = useSaveProductCost();
  const variants = productVariants(product);
  const [base, setBase] = useState(current?.cost !== undefined ? String(current.cost) : '');
  const [perVariant, setPerVariant] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      variants.map((v) => {
        const own = current?.variants[v.id];
        return [v.id, own !== undefined ? String(own) : ''];
      }),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  const parsedBase = parseCost(base);
  const parsed = Object.fromEntries(
    Object.entries(perVariant).map(([id, raw]) => [id, parseCost(raw)]),
  );
  const invalid = parsedBase === 'invalid' || Object.values(parsed).includes('invalid');
  const draft = invalid
    ? null
    : normalizeProductCost(
        {
          cost: parsedBase as number | undefined,
          variants: parsed as Record<string, number | undefined>,
        },
        variants.map((v) => v.id),
      );

  const submit = async (): Promise<void> => {
    if (!user || !draft) {
      setError(t('profit.invalidCost'));
      return;
    }
    try {
      await save.mutateAsync({ productId: product.id, input: draft, by: user.uid });
      onSaved();
    } catch {
      setError(t('adminContent.saveFailed'));
    }
  };

  const showVariants = variants.length > 1 || variants[0]?.id !== 'default';

  return (
    <>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">{t('profit.costHint')}</Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            type="number"
            label={t('profit.defaultCost')}
            value={base}
            onChange={(e) => setBase(e.target.value)}
            error={parsedBase === 'invalid'}
            helperText={parsedBase === 'invalid' ? t('profit.invalidCost') : ' '}
            slotProps={{ htmlInput: { min: 0, step: 1, inputMode: 'numeric' } }}
          />
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label={t('profit.cost')}>
              <TableHead>
                <TableRow>
                  {showVariants && <TableCell>{t('profit.variant')}</TableCell>}
                  <TableCell align="right">{t('profit.price')}</TableCell>
                  {showVariants && <TableCell>{t('profit.variantCost')}</TableCell>}
                  <TableCell align="right">{t('profit.unitProfit')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {variants.map((v) => {
                  const label = [v.size, v.color].filter(Boolean).join(' / ') || '—';
                  const price = variantPrice(product, v);
                  const unit = draft ? unitCostFor(draft, v.id) : null;
                  const own = parsed[v.id];
                  return (
                    <TableRow key={v.id}>
                      {showVariants && <TableCell>{label}</TableCell>}
                      <TableCell align="right">{formatPrice(price, language)}</TableCell>
                      {showVariants && (
                        <TableCell sx={{ minWidth: (theme) => theme.spacing(15) }}>
                          <TextField
                            size="small"
                            type="number"
                            placeholder={t('profit.variantCostPlaceholder')}
                            value={perVariant[v.id] ?? ''}
                            error={own === 'invalid'}
                            onChange={(e) =>
                              setPerVariant((prev) => ({ ...prev, [v.id]: e.target.value }))
                            }
                            slotProps={{
                              htmlInput: {
                                min: 0,
                                step: 1,
                                inputMode: 'numeric',
                                'aria-label': `${t('profit.variantCost')} ${label}`,
                              },
                            }}
                          />
                        </TableCell>
                      )}
                      <TableCell
                        align="right"
                        sx={{ color: unit !== null && price - unit < 0 ? 'error.main' : undefined }}
                      >
                        {unit === null ? t('profit.missing') : formatPrice(price - unit, language)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('actions.cancel')}</Button>
        <Button
          variant="contained"
          disabled={save.isPending || invalid}
          onClick={() => void submit()}
        >
          {t('actions.save')}
        </Button>
      </DialogActions>
    </>
  );
}
