import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { totalVariantStock, type ProductVariant } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';

export interface VariantsTableProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  /** Removes one combination (the form adds it to `variantsExcluded`). */
  onRemove: (id: string) => void;
  excludedCount: number;
  onRestore: () => void;
  /** Per-row error message keys, already translated. */
  rowError?: (index: number) => string | undefined;
}

/** Empty input → undefined (optional price), else an integer. */
function parseOptionalInt(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

/**
 * Size × colour matrix of the product form: one row per combination with its
 * own stock, optional price and code. Scrolls horizontally inside its own box
 * on narrow screens so the dialog never does.
 */
export function VariantsTable({
  variants,
  onChange,
  onRemove,
  excludedCount,
  onRestore,
  rowError,
}: VariantsTableProps): React.ReactElement {
  const { t } = useTranslation();

  const patch = (index: number, next: Partial<ProductVariant>): void => {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...next } : v)));
  };

  return (
    <Stack spacing={1}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
      >
        <Typography variant="subtitle2">{t('admin.variants')}</Typography>
        <Typography variant="body2" color="text.secondary" data-testid="variants-total">
          {t('admin.variantsTotalStock', { count: totalVariantStock(variants) })}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t('admin.variantsHint')}
      </Typography>

      {variants.length === 0 ? (
        <Alert severity="warning">{t('admin.variantsEmpty')}</Alert>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label={t('admin.variants')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.variantSize')}</TableCell>
                <TableCell>{t('admin.variantColor')}</TableCell>
                <TableCell>{t('admin.variantStock')}</TableCell>
                <TableCell>{t('admin.variantPrice')}</TableCell>
                <TableCell>{t('admin.variantSku')}</TableCell>
                <TableCell padding="checkbox" />
              </TableRow>
            </TableHead>
            <TableBody>
              {variants.map((v, index) => {
                const error = rowError?.(index);
                const label =
                  [v.size, v.color].filter(Boolean).join(' / ') || t('admin.variantAny');
                return (
                  <TableRow key={v.id} data-testid="variant-row">
                    <TableCell>{v.size || t('admin.variantAny')}</TableCell>
                    <TableCell>{v.color || t('admin.variantAny')}</TableCell>
                    <TableCell sx={{ minWidth: (theme) => theme.spacing(12) }}>
                      <TextField
                        size="small"
                        type="number"
                        value={Number.isNaN(v.stock) ? '' : v.stock}
                        onChange={(e) => patch(index, { stock: Number(e.target.value) })}
                        error={!!error}
                        helperText={error}
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            'aria-label': `${t('admin.variantStock')} ${label}`,
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: (theme) => theme.spacing(15) }}>
                      <TextField
                        size="small"
                        type="number"
                        value={v.price ?? ''}
                        onChange={(e) => {
                          const price = parseOptionalInt(e.target.value);
                          const { price: _drop, ...rest } = v;
                          onChange(
                            variants.map((row, i) =>
                              i === index ? (price === undefined ? rest : { ...rest, price }) : row,
                            ),
                          );
                        }}
                        slotProps={{
                          htmlInput: {
                            min: 1,
                            'aria-label': `${t('admin.variantPrice')} ${label}`,
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: (theme) => theme.spacing(15) }}>
                      <TextField
                        size="small"
                        value={v.sku ?? ''}
                        onChange={(e) => patch(index, { sku: e.target.value })}
                        slotProps={{
                          htmlInput: { 'aria-label': `${t('admin.variantSku')} ${label}` },
                        }}
                      />
                    </TableCell>
                    <TableCell padding="checkbox">
                      <Tooltip title={t('admin.variantRemove')}>
                        <IconButton
                          aria-label={`${t('admin.variantRemove')} ${label}`}
                          onClick={() => onRemove(v.id)}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {excludedCount > 0 && (
        <Button size="small" onClick={onRestore} sx={{ alignSelf: 'flex-start' }}>
          {t('admin.variantsRestore', { count: excludedCount })}
        </Button>
      )}
    </Stack>
  );
}
