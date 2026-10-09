import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Card, Chip, FAB, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BlogPost } from '@kidswear/core';
import { useAdminPosts, useDeleteBlogPost } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { BlogPostDialog } from '@/components/admin/BlogPostDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

export function AdminBlogScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: posts = [], isLoading } = useAdminPosts();
  const remove = useDeleteBlogPost();
  const [editing, setEditing] = useState<BlogPost | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<BlogPost | undefined>(undefined);

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
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 96 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', opacity: 0.7, marginTop: 32 }}>
            {t('adminContent.noPosts')}
          </Text>
        }
        renderItem={({ item: p }) => (
          <Card mode="outlined">
            <Card.Title
              title={p.title.uz}
              subtitle={`/blog/${p.slug}`}
              right={() => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Chip compact>
                    {p.published ? t('adminContent.published') : t('adminContent.draft')}
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
        )}
      />
      <FAB
        icon="plus"
        label={t('adminContent.newPost')}
        style={{ position: 'absolute', right: 16, bottom: insets.bottom + 16 }}
        onPress={() => {
          setEditing(undefined);
          setFormOpen(true);
        }}
      />
      {formOpen ? (
        <BlogPostDialog visible={formOpen} post={editing} onDismiss={() => setFormOpen(false)} />
      ) : null}
      <ConfirmDialog
        visible={!!deleting}
        title={t('adminContent.deletePost')}
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
