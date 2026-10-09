import { useState } from 'react';
import { FlatList, Linking, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ContactMessage } from '@kidswear/core';
import { useContactMessages, useDeleteMessage, useSetMessageStatus } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

export function AdminMessagesScreen(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const { data: messages = [], isLoading, refetch, isRefetching } = useContactMessages();
  const setStatus = useSetMessageStatus();
  const remove = useDeleteMessage();
  const [deleting, setDeleting] = useState<ContactMessage | undefined>(undefined);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', opacity: 0.7, marginTop: 32 }}>
            {t('adminContent.noMessages')}
          </Text>
        }
        renderItem={({ item: m }) => (
          <Card
            mode="outlined"
            style={m.status === 'new' ? { borderColor: theme.colors.primary } : undefined}
          >
            <Card.Content style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text variant="titleMedium" style={{ flex: 1 }}>
                  {m.name}
                </Text>
                <Text variant="labelSmall" style={{ opacity: 0.6 }}>
                  {formatDate(m.createdAt, language)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Chip
                  icon="phone"
                  compact
                  onPress={() => void Linking.openURL(`tel:${m.phone.replace(/[^\d+]/g, '')}`)}
                >
                  {m.phone}
                </Chip>
                {m.email ? (
                  <Chip
                    icon="email"
                    compact
                    onPress={() => void Linking.openURL(`mailto:${m.email}`)}
                  >
                    {m.email}
                  </Chip>
                ) : null}
              </View>
              <Text variant="bodyMedium">{m.message}</Text>
            </Card.Content>
            <Card.Actions>
              {m.status === 'new' ? (
                <Button onPress={() => setStatus.mutate({ id: m.id, status: 'read' })}>
                  {t('adminContent.markRead')}
                </Button>
              ) : null}
              <Button textColor={theme.colors.error} onPress={() => setDeleting(m)}>
                {t('adminContent.delete')}
              </Button>
            </Card.Actions>
          </Card>
        )}
      />
      <ConfirmDialog
        visible={!!deleting}
        title={t('adminContent.deleteMessage')}
        message={t('admin.confirmDelete')}
        onDismiss={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
          setDeleting(undefined);
        }}
      />
    </>
  );
}
