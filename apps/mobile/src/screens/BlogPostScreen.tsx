import { Image, ScrollView, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { blogParagraphs } from '@kidswear/core';
import { useBlogPost } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { useLocalized } from '@/lib/useLocalized';
import type { RootStackParamList } from '@/navigation/types';

export function BlogPostScreen(): React.ReactElement {
  const { params } = useRoute<RouteProp<RootStackParamList, 'BlogPost'>>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const localized = useLocalized();
  const language = useAppSelector((s) => s.ui.language);
  const { data: post, isLoading } = useBlogPost(params.slug);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!post) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text style={{ textAlign: 'center', opacity: 0.7 }}>{t('blog.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
      {post.publishedAt !== undefined ? (
        <Text variant="labelSmall" style={{ opacity: 0.6 }}>
          {formatDate(post.publishedAt, language)}
        </Text>
      ) : null}
      <Text variant="headlineSmall">{localized(post.title)}</Text>
      {post.coverImage ? (
        <Image
          source={{ uri: post.coverImage }}
          style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12 }}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      {/* Plain text only — see BlogPostSchema. */}
      {blogParagraphs(localized(post.body)).map((p, i) => (
        <Text key={i} variant="bodyLarge" style={{ lineHeight: 26 }}>
          {p}
        </Text>
      ))}
    </ScrollView>
  );
}
