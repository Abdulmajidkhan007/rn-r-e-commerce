import { View } from 'react-native';
import { Button, HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { totalVariantStock, type ProductVariant } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';

export interface VariantsEditorProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  /** Removes one combination (the form adds it to `variantsExcluded`). */
  onRemove: (id: string) => void;
  excludedCount: number;
  onRestore: () => void;
  /** Per-row error messages, already translated. */
  rowError?: (index: number) => string | undefined;
}

/**
 * Size × colour rows of the product form. A phone has no room for a table, so
 * each variant is a small block: its label, then stock / price / code inputs.
 */
export function VariantsEditor({
  variants,
  onChange,
  onRemove,
  excludedCount,
  onRestore,
  rowError,
}: VariantsEditorProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();

  const replace = (index: number, next: ProductVariant): void => {
    onChange(variants.map((v, i) => (i === index ? next : v)));
  };

  return (
    <View style={{ gap: tokens.spacing.sm, marginTop: tokens.spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Text variant="labelLarge">{t('admin.variants')}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('admin.variantsTotalStock', { count: totalVariantStock(variants) })}
        </Text>
      </View>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {t('admin.variantsHint')}
      </Text>

      {variants.length === 0 ? (
        <HelperText type="error" visible>
          {t('admin.variantsEmpty')}
        </HelperText>
      ) : null}

      {variants.map((v, index) => {
        const label = [v.size, v.color].filter(Boolean).join(' / ') || t('admin.variantAny');
        const error = rowError?.(index);
        return (
          <View
            key={v.id}
            style={{
              gap: tokens.spacing.xs,
              padding: tokens.spacing.sm,
              borderRadius: tokens.radii.md,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="titleSmall" style={{ flex: 1 }}>
                {label}
              </Text>
              <IconButton
                icon="delete-outline"
                size={tokens.spacing.lg + tokens.spacing.xs}
                accessibilityLabel={`${t('admin.variantRemove')} ${label}`}
                onPress={() => onRemove(v.id)}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
              <TextInput
                mode="outlined"
                dense
                style={{ flex: 1 }}
                label={t('admin.variantStock')}
                keyboardType="number-pad"
                value={String(v.stock)}
                onChangeText={(text) => replace(index, { ...v, stock: Number(text) || 0 })}
                error={!!error}
              />
              <TextInput
                mode="outlined"
                dense
                style={{ flex: 1 }}
                label={t('admin.variantPrice')}
                keyboardType="number-pad"
                value={v.price === undefined ? '' : String(v.price)}
                onChangeText={(text) => {
                  const { price: _drop, ...rest } = v;
                  const price = Number(text);
                  replace(index, text === '' || !price ? rest : { ...rest, price });
                }}
              />
            </View>
            <TextInput
              mode="outlined"
              dense
              label={t('admin.variantSku')}
              value={v.sku ?? ''}
              onChangeText={(text) => replace(index, { ...v, sku: text })}
            />
            {error ? (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            ) : null}
          </View>
        );
      })}

      {excludedCount > 0 ? (
        <Button mode="text" onPress={onRestore} style={{ alignSelf: 'flex-start' }}>
          {t('admin.variantsRestore', { count: excludedCount })}
        </Button>
      ) : null}
    </View>
  );
}
