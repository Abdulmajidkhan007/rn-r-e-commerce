import { FlatList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePublishedPosts } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { useLocalized } from '@/lib/useLocalized';

export function BlogScreen(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const localized = useLocalized();
  const language = useAppSelector((s) => s.ui.language);
  const { data: posts = [], isLoading, refetch, isRefetching } = usePublishedPosts();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
      ListHeaderComponent={
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
          {t('blog.subtitle')}
        </Text>
      }
      ListEmptyComponent={
        <Text variant="bodyMedium" style={{ opacity: 0.7, textAlign: 'center', marginTop: 32 }}>
          {t('blog.empty')}
        </Text>
      }
      renderItem={({ item }) => (
        <Card mode="outlined" onPress={() => navigation.navigate('BlogPost', { slug: item.slug })}>
          {item.coverImage ? <Card.Cover source={{ uri: item.coverImage }} /> : null}
          <Card.Content style={{ gap: 6, paddingTop: 12 }}>
            {item.publishedAt !== undefined ? (
              <Text variant="labelSmall" style={{ opacity: 0.6 }}>
                {formatDate(item.publishedAt, language)}
              </Text>
            ) : null}
            <Text variant="titleMedium">{localized(item.title)}</Text>
            <Text variant="bodySmall" style={{ opacity: 0.75 }}>
              {localized(item.excerpt)}
            </Text>
          </Card.Content>
        </Card>
      )}
    />
  );
}
