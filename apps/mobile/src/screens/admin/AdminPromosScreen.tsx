import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Card, Chip, FAB, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PromoCode } from '@kidswear/core';
import { useDeletePromoCode, usePromoCodes } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate, formatPrice } from '@kidswear/utils';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { PromoCodeDialog } from '@/components/admin/PromoCodeDialog';
import { useNow } from '@/lib/useNow';

export function AdminPromosScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const { data: promos = [], isLoading } = usePromoCodes();
  const remove = useDeletePromoCode();
  const now = useNow();
  const [editing, setEditing] = useState<PromoCode | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<PromoCode | undefined>(undefined);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={promos}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 96 }}
        ListHeaderComponent={
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {t('adminContent.promoNote')}
          </Text>
        }
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', opacity: 0.7, marginTop: 32 }}>
            {t('adminContent.noPromos')}
          </Text>
        }
        renderItem={({ item: p }) => {
          const expired = p.expiresAt !== undefined && p.expiresAt <= now;
          return (
            <Card mode="outlined">
              <Card.Title
                title={p.id}
                titleStyle={{ fontFamily: 'monospace', fontWeight: '700' }}
                subtitle={`${p.type === 'percent' ? `${p.value}%` : formatPrice(p.value, language)}${
                  p.minSubtotal > 0
                    ? ` · ${t('adminContent.from', { amount: formatPrice(p.minSubtotal, language) })}`
                    : ''
                }${p.expiresAt !== undefined && !expired ? ` · ${t('adminContent.until', { date: formatDate(p.expiresAt, language) })}` : ''}`}
                right={() => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Chip compact>
                      {expired
                        ? t('promo.errors.expired')
                        : p.active
                          ? t('admin.active')
                          : t('admin.inactive')}
                    </Chip>
                    <IconButton
                      icon="pencil"
                      accessibilityLabel={t('adminContent.edit')}
                      onPress={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                    />
                    <IconButton
                      icon="delete"
                      accessibilityLabel={t('adminContent.delete')}
                      onPress={() => setDeleting(p)}
                    />
                  </View>
                )}
              />
            </Card>
          );
        }}
      />
      <FAB
        icon="plus"
        label={t('adminContent.newPromo')}
        style={{ position: 'absolute', right: 16, bottom: insets.bottom + 16 }}
        onPress={() => {
          setEditing(undefined);
          setFormOpen(true);
        }}
      />
      {formOpen ? (
        <PromoCodeDialog visible={formOpen} promo={editing} onDismiss={() => setFormOpen(false)} />
      ) : null}
      <ConfirmDialog
        visible={!!deleting}
        title={t('adminContent.deletePromo')}
        message={t('admin.confirmDelete')}
        onDismiss={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
          setDeleting(undefined);
        }}
      />
    </View>
  );
}
