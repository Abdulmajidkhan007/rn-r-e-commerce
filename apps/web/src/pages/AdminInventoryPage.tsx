import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import {
  productVariants,
  variantLabel,
  type Product,
  type ProductVariant,
  type StockMove,
  type StockMoveReason,
} from '@kidswear/core';
import { LOW_STOCK_THRESHOLD, useAdminProducts, useStockMoves } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDateTime } from '@kidswear/utils';
import { Card } from '@/components';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';
import {
  StockMoveDialog,
  type ManualReason,
  type StockMoveTarget,
} from '@/components/admin/StockMoveDialog';
import { useLocalized } from '@/lib/useLocalized';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const REASON_LABEL = {
  sale: 'inventory.reasons.sale',
  return: 'inventory.reasons.return',
  intake: 'inventory.reasons.intake',
  writeoff: 'inventory.reasons.writeoff',
  inventory: 'inventory.reasons.inventory',
} as const satisfies Record<StockMoveReason, string>;

const ACTIONS: readonly { reason: ManualReason; key: (typeof REASON_LABEL)[ManualReason] }[] = [
  { reason: 'intake', key: 'inventory.reasons.intake' },
  { reason: 'writeoff', key: 'inventory.reasons.writeoff' },
  { reason: 'inventory', key: 'inventory.reasons.inventory' },
];

/** Admin "Ombor": stock per variant, manual moves, and the stock journal. */
export default function AdminInventoryPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('inventory.title'));
  const [tab, setTab] = useState<'stock' | 'journal'>('stock');
  const products = useAdminProducts();

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h2">{t('inventory.title')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('inventory.subtitle')}
        </Typography>
      </Box>
      <Tabs value={tab} onChange={(_, v: 'stock' | 'journal') => setTab(v)}>
        <Tab value="stock" label={t('inventory.stockTab')} />
        <Tab value="journal" label={t('inventory.journalTab')} />
      </Tabs>
      {products.isLoading ? (
        <TableSkeleton rows={6} columns={3} />
      ) : tab === 'stock' ? (
        <StockList products={products.data ?? []} />
      ) : (
        <Journal products={products.data ?? []} />
      )}
    </Stack>
  );
}

function stockColor(stock: number): 'error' | 'warning' | 'success' {
  if (stock === 0) return 'error';
  return stock <= LOW_STOCK_THRESHOLD ? 'warning' : 'success';
}

function StockList({ products }: { products: Product[] }): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<StockMoveTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => localized(p.name).toLowerCase().includes(q)) : products;
  }, [products, search, localized]);

  const open = (product: Product, variant: ProductVariant, reason: ManualReason): void => {
    const name = localized(product.name);
    const label = variantLabel(variant);
    setTarget({ product, variant, reason, label: label ? `${name} — ${label}` : name });
  };

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        placeholder={t('inventory.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ maxWidth: { sm: 360 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      {visible.length === 0 ? (
        <Card>
          <EmptyState title={t('inventory.noProducts')} />
        </Card>
      ) : (
        visible.map((product) => (
          <Card key={product.id} data-testid={`inventory-product-${product.id}`}>
            <Stack spacing={1}>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 0 }} noWrap>
                  {localized(product.name)}
                </Typography>
                <Chip
                  size="small"
                  label={`${t('inventory.stock')}: ${product.stock}`}
                  color={stockColor(product.stock)}
                  variant="outlined"
                />
              </Stack>
              <Divider />
              {productVariants(product).map((variant) => (
                <Stack
                  key={variant.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', py: 0.5 }}
                  data-testid={`inventory-variant-${product.id}-${variant.id}`}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Typography variant="body2" sx={{ minWidth: 0 }} noWrap>
                      {variantLabel(variant) || t('inventory.noVariant')}
                    </Typography>
                    <Chip
                      size="small"
                      color={stockColor(variant.stock)}
                      label={variant.stock}
                      data-testid="variant-stock"
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    {ACTIONS.map(({ reason, key }) => (
                      <Button
                        key={reason}
                        size="small"
                        variant={reason === 'intake' ? 'contained' : 'outlined'}
                        color={reason === 'writeoff' ? 'error' : 'primary'}
                        onClick={() => open(product, variant, reason)}
                      >
                        {t(key)}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Card>
        ))
      )}
      <StockMoveDialog
        target={target}
        onClose={() => setTarget(null)}
        onDone={(delta) => {
          setTarget(null);
          setNotice(
            delta === 0
              ? t('inventory.noChange')
              : t('inventory.done', { delta: delta > 0 ? `+${delta}` : delta }),
          );
        }}
      />
      <Snackbar
        open={notice !== null}
        autoHideDuration={2500}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </Stack>
  );
}

function Journal({ products }: { products: Product[] }): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const language = useAppSelector((s) => s.ui.language);
  const moves = useStockMoves();
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const describe = (m: StockMove): string => {
    const product = byId.get(m.productId);
    if (!product) return m.productId;
    const variant = productVariants(product).find((v) => v.id === m.variantId);
    const label = variant ? variantLabel(variant) : decodeURIComponent(m.variantId);
    return label ? `${localized(product.name)} — ${label}` : localized(product.name);
  };

  if (moves.isLoading) return <TableSkeleton rows={6} columns={4} />;
  const rows = moves.data ?? [];
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState title={t('inventory.noMoves')} />
      </Card>
    );
  }

  return (
    <Card>
      <Stack divider={<Divider />} data-testid="stock-journal">
        {rows.map((m) => (
          <Stack
            key={m.id}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.5, sm: 2 }}
            sx={{ py: 1.25, alignItems: { sm: 'center' } }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ width: { sm: 140 }, flexShrink: 0 }}
            >
              {formatDateTime(m.createdAt, language)}
            </Typography>
            <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>
              {describe(m)}
              {m.orderId ? ` · #${m.orderId.slice(0, 8)}` : ''}
              {m.note ? ` · ${m.note}` : ''}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Chip size="small" variant="outlined" label={t(REASON_LABEL[m.reason])} />
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, width: 56, textAlign: 'right' }}
                color={m.delta > 0 ? 'success.main' : 'error.main'}
              >
                {m.delta > 0 ? `+${m.delta}` : m.delta}
              </Typography>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
