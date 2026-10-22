import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  HelperText,
  Portal,
  Searchbar,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  manualStockDelta,
  productVariants,
  variantLabel,
  type Product,
  type ProductVariant,
  type StockMove,
  type StockMoveReason,
} from '@kidswear/core';
import {
  LOW_STOCK_THRESHOLD,
  stockErrorMessage,
  useAdjustStock,
  useAdminProducts,
  useStockMoves,
} from '@kidswear/data';
import { useAuth } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDateTime, pickLocalized } from '@kidswear/utils';
import { tokens } from '@kidswear/theme';

type ManualReason = 'intake' | 'writeoff' | 'inventory';

const REASON_LABEL = {
  sale: 'inventory.reasons.sale',
  return: 'inventory.reasons.return',
  intake: 'inventory.reasons.intake',
  writeoff: 'inventory.reasons.writeoff',
  inventory: 'inventory.reasons.inventory',
} as const satisfies Record<StockMoveReason, string>;

const ACTIONS: readonly ManualReason[] = ['intake', 'writeoff', 'inventory'];

interface Target {
  product: Product;
  variant: ProductVariant;
  label: string;
  reason: ManualReason;
}

/** Admin "Ombor": stock per variant, manual moves, and the stock journal. */
export function AdminInventoryScreen(): React.ReactElement {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'stock' | 'journal'>('stock');
  const { data: products = [], isLoading } = useAdminProducts();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: tokens.spacing.lg, paddingBottom: tokens.spacing.sm }}>
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v === 'journal' ? 'journal' : 'stock')}
          buttons={[
            { value: 'stock', label: t('inventory.stockTab'), icon: 'warehouse' },
            { value: 'journal', label: t('inventory.journalTab'), icon: 'history' },
          ]}
        />
      </View>
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : tab === 'stock' ? (
        <StockList products={products} />
      ) : (
        <Journal products={products} />
      )}
    </View>
  );
}

function StockChip({ stock }: { stock: number }): React.ReactElement {
  const theme = useTheme();
  const color =
    stock === 0
      ? theme.colors.error
      : stock <= LOW_STOCK_THRESHOLD
        ? theme.colors.secondary
        : theme.colors.primary;
  return (
    <Chip
      compact
      textStyle={{ color, fontWeight: '700' }}
      style={{ borderColor: color }}
      mode="outlined"
    >
      {String(stock)}
    </Chip>
  );
}

function StockList({ products }: { products: Product[] }): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? products.filter((p) => pickLocalized(p.name, language).toLowerCase().includes(q))
      : products;
  }, [products, search, language]);

  const open = (product: Product, variant: ProductVariant, reason: ManualReason): void => {
    const name = pickLocalized(product.name, language);
    const label = variantLabel(variant);
    setTarget({ product, variant, reason, label: label ? `${name} — ${label}` : name });
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Searchbar
            placeholder={t('inventory.search')}
            value={search}
            onChangeText={setSearch}
            style={{ marginBottom: tokens.spacing.md }}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: tokens.spacing.lg,
          gap: tokens.spacing.md,
          paddingBottom: insets.bottom + tokens.spacing.xl,
        }}
        ListEmptyComponent={
          <Text style={{ opacity: 0.7, textAlign: 'center', marginTop: tokens.spacing.xl }}>
            {t('inventory.noProducts')}
          </Text>
        }
        renderItem={({ item: product }) => (
          <Card mode="outlined">
            <Card.Content style={{ gap: tokens.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                <Text variant="titleSmall" numberOfLines={1} style={{ flex: 1, fontWeight: '700' }}>
                  {pickLocalized(product.name, language)}
                </Text>
                <StockChip stock={product.stock} />
              </View>
              <Divider />
              {productVariants(product).map((variant) => (
                <View key={variant.id} style={{ gap: tokens.spacing.xs }}>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}
                  >
                    <Text variant="bodyMedium" style={{ flex: 1 }}>
                      {variantLabel(variant) || t('inventory.noVariant')}
                    </Text>
                    <StockChip stock={variant.stock} />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs }}>
                    {ACTIONS.map((reason) => (
                      <Button
                        key={reason}
                        compact
                        mode={reason === 'intake' ? 'contained-tonal' : 'outlined'}
                        onPress={() => open(product, variant, reason)}
                      >
                        {t(REASON_LABEL[reason])}
                      </Button>
                    ))}
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      />
      <Portal>
        <Dialog visible={target !== null} onDismiss={() => setTarget(null)}>
          {target ? (
            <MoveForm
              key={`${target.variant.id}-${target.reason}`}
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
          ) : null}
        </Dialog>
      </Portal>
      <Snackbar visible={notice !== null} onDismiss={() => setNotice(null)} duration={2500}>
        {notice ?? ''}
      </Snackbar>
    </View>
  );
}

function MoveForm({
  target,
  onClose,
  onDone,
}: {
  target: Target;
  onClose: () => void;
  onDone: (delta: number) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();
  const adjust = useAdjustStock();
  const { product, variant, reason, label } = target;
  const [quantity, setQuantity] = useState(reason === 'inventory' ? String(variant.stock) : '');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const qty = Number(quantity);
  const valid = quantity !== '' && Number.isInteger(qty) && (reason === 'inventory' || qty > 0);
  const delta = valid ? manualStockDelta(product, variant.id, reason, qty) : null;

  const submit = async (): Promise<void> => {
    if (!user || !valid) return;
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
      <Dialog.Title>{t(REASON_LABEL[reason])}</Dialog.Title>
      <Dialog.Content style={{ gap: tokens.spacing.sm }}>
        <Text variant="titleSmall">{label}</Text>
        <Text variant="bodySmall" style={{ opacity: 0.7 }}>
          {t('inventory.current', { count: variant.stock })}
        </Text>
        <TextInput
          mode="outlined"
          label={reason === 'inventory' ? t('inventory.countedQuantity') : t('inventory.quantity')}
          keyboardType="number-pad"
          value={quantity}
          onChangeText={(v) => setQuantity(v.replace(/\D/g, ''))}
        />
        <HelperText type="info" visible={delta !== null}>
          {delta !== null
            ? t('inventory.difference', { delta: delta > 0 ? `+${delta}` : delta })
            : ''}
        </HelperText>
        <TextInput
          mode="outlined"
          label={t('inventory.note')}
          value={note}
          maxLength={500}
          onChangeText={setNote}
        />
        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onClose}>{t('actions.cancel')}</Button>
        <Button
          mode="contained"
          disabled={adjust.isPending || !valid}
          loading={adjust.isPending}
          onPress={() => void submit()}
        >
          {t('inventory.apply')}
        </Button>
      </Dialog.Actions>
    </>
  );
}

function Journal({ products }: { products: Product[] }): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const { data: moves = [], isLoading } = useStockMoves();
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const describe = (m: StockMove): string => {
    const product = byId.get(m.productId);
    if (!product) return m.productId;
    const variant = productVariants(product).find((v) => v.id === m.variantId);
    const label = variant ? variantLabel(variant) : decodeURIComponent(m.variantId);
    const name = pickLocalized(product.name, language);
    return label ? `${name} — ${label}` : name;
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={moves}
      keyExtractor={(m) => m.id}
      ItemSeparatorComponent={Divider}
      contentContainerStyle={{
        paddingHorizontal: tokens.spacing.lg,
        paddingBottom: insets.bottom + tokens.spacing.xl,
      }}
      ListEmptyComponent={
        <Text style={{ opacity: 0.7, textAlign: 'center', marginTop: tokens.spacing.xl }}>
          {t('inventory.noMoves')}
        </Text>
      }
      renderItem={({ item: m }) => (
        <View style={{ paddingVertical: tokens.spacing.sm, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              {describe(m)}
            </Text>
            <Text
              variant="titleSmall"
              style={{ color: m.delta > 0 ? theme.colors.primary : theme.colors.error }}
            >
              {m.delta > 0 ? `+${m.delta}` : String(m.delta)}
            </Text>
          </View>
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {formatDateTime(m.createdAt, language)} · {t(REASON_LABEL[m.reason])}
            {m.orderId ? ` · #${m.orderId.slice(0, 8)}` : ''}
            {m.note ? ` · ${m.note}` : ''}
          </Text>
        </View>
      )}
    />
  );
}
