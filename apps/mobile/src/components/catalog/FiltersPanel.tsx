import { ScrollView, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { AGE_BANDS, GENDERS, type CatalogFilters } from '@kidswear/core';
import { useSizeOptions } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';

export interface FiltersPanelProps {
  categoryId: string | undefined;
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
}

const GENDER_LABEL = {
  boys: 'catalog.boys',
  girls: 'catalog.girls',
  unisex: 'catalog.unisex',
} as const;

function parsePrice(raw: string): number | undefined {
  const n = Number(raw.replace(/\s/g, ''));
  return raw.trim() === '' || !Number.isFinite(n) || n < 0 ? undefined : Math.round(n);
}

/** Size / gender / age / price filters, shared state with the web catalog via `CatalogFilters`. */
export function FiltersPanel({
  categoryId,
  filters,
  onChange,
}: FiltersPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const sizes = useSizeOptions(categoryId).data ?? [];
  const set = (patch: Partial<CatalogFilters>): void => onChange({ ...filters, ...patch });
  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  const row = (label: string, children: React.ReactNode): React.ReactElement => (
    <View style={{ gap: 6 }}>
      <Text variant="labelLarge">{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {children}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ gap: 12 }} testID="filters-panel">
      {sizes.length > 0
        ? row(
            t('catalog.size'),
            sizes.map((size) => (
              <Chip
                key={size}
                selected={filters.size === size}
                onPress={() => set({ size: filters.size === size ? undefined : size })}
              >
                {size}
              </Chip>
            )),
          )
        : null}
      {row(
        t('catalog.gender'),
        GENDERS.map((g) => (
          <Chip
            key={g}
            selected={filters.gender === g}
            onPress={() => set({ gender: filters.gender === g ? undefined : g })}
          >
            {t(GENDER_LABEL[g])}
          </Chip>
        )),
      )}
      {row(
        t('catalog.age'),
        AGE_BANDS.map((band) => (
          <Chip
            key={band.key}
            selected={filters.ageBand === band.key}
            onPress={() => set({ ageBand: filters.ageBand === band.key ? undefined : band.key })}
          >
            {t('catalog.ageYears', { band: band.key })}
          </Chip>
        )),
      )}
      <View style={{ gap: 6 }}>
        <Text variant="labelLarge">{t('catalog.price')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            dense
            mode="outlined"
            style={{ flex: 1 }}
            label={t('catalog.priceMin')}
            keyboardType="numeric"
            value={filters.priceMin !== undefined ? String(filters.priceMin) : ''}
            onChangeText={(v) => set({ priceMin: parsePrice(v) })}
          />
          <TextInput
            dense
            mode="outlined"
            style={{ flex: 1 }}
            label={t('catalog.priceMax')}
            keyboardType="numeric"
            value={filters.priceMax !== undefined ? String(filters.priceMax) : ''}
            onChangeText={(v) => set({ priceMax: parsePrice(v) })}
          />
        </View>
      </View>
      {hasFilters ? (
        <Button compact onPress={() => onChange({})} style={{ alignSelf: 'flex-start' }}>
          {t('catalog.clearFilters')}
        </Button>
      ) : null}
    </View>
  );
}
