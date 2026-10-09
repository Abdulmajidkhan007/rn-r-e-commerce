import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { BlogPostSchema, type BlogPost, type LocalizedText } from '@kidswear/core';
import { useSaveBlogPost } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { slugify } from '@kidswear/utils';

type Lang = 'uz' | 'en' | 'ru';
const empty = (): LocalizedText => ({ uz: '', en: '', ru: '' });
/** Drops empty optional locales so they fall back to uz on the site. */
function clean(text: LocalizedText): LocalizedText {
  return {
    uz: text.uz.trim(),
    ...(text.en?.trim() ? { en: text.en.trim() } : {}),
    ...(text.ru?.trim() ? { ru: text.ru.trim() } : {}),
  };
}

export function BlogPostDialog({
  visible,
  post,
  onDismiss,
}: {
  visible: boolean;
  post?: BlogPost;
  onDismiss: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const save = useSaveBlogPost();
  const [lang, setLang] = useState<Lang>('uz');
  const [title, setTitle] = useState<LocalizedText>(post?.title ?? empty());
  const [excerpt, setExcerpt] = useState<LocalizedText>(post?.excerpt ?? empty());
  const [body, setBody] = useState<LocalizedText>(post?.body ?? empty());
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '');
  const [published, setPublished] = useState(post?.published ?? false);
  const [error, setError] = useState<string | null>(null);

  const setLocalized =
    (setter: React.Dispatch<React.SetStateAction<LocalizedText>>) => (value: string) =>
      setter((prev) => ({ ...prev, [lang]: value }));

  const submit = async (): Promise<void> => {
    setError(null);
    const input = {
      slug: slug || slugify(title.uz),
      title: clean(title),
      excerpt: clean(excerpt),
      body: clean(body),
      published,
      ...(coverImage.trim() ? { coverImage: coverImage.trim() } : {}),
      ...(post?.publishedAt !== undefined ? { publishedAt: post.publishedAt } : {}),
    };
    const check = BlogPostSchema.safeParse({ ...input, id: 'x', createdAt: 0, updatedAt: 0 });
    if (!check.success || !input.title.uz || !input.body.uz) {
      setError(t('adminContent.blogInvalid'));
      return;
    }
    try {
      await save.mutateAsync({ id: post?.id ?? null, input });
      onDismiss();
    } catch {
      setError(t('adminContent.saveFailed'));
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: '90%' }}>
        <Dialog.Title>{post ? t('adminContent.editPost') : t('adminContent.newPost')}</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView
            contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {error ? (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            ) : null}
            <SegmentedButtons
              value={lang}
              onValueChange={(v) => setLang(v as Lang)}
              buttons={[
                { value: 'uz', label: 'UZ *' },
                { value: 'en', label: 'EN' },
                { value: 'ru', label: 'RU' },
              ]}
            />
            <TextInput
              mode="outlined"
              label={t('adminContent.postTitle')}
              value={title[lang] ?? ''}
              onChangeText={(v) => {
                setLocalized(setTitle)(v);
                if (lang === 'uz' && !slugTouched) setSlug(slugify(v));
              }}
            />
            <TextInput
              mode="outlined"
              label={t('adminContent.excerpt')}
              multiline
              value={excerpt[lang] ?? ''}
              onChangeText={setLocalized(setExcerpt)}
            />
            <TextInput
              mode="outlined"
              label={t('adminContent.body')}
              multiline
              numberOfLines={8}
              value={body[lang] ?? ''}
              onChangeText={setLocalized(setBody)}
            />
            <HelperText type="info" visible>
              {t('adminContent.bodyHint')}
            </HelperText>
            <TextInput
              mode="outlined"
              label={t('admin.slug')}
              autoCapitalize="none"
              value={slug}
              onChangeText={(v) => {
                setSlugTouched(true);
                setSlug(v.toLowerCase());
              }}
            />
            <TextInput
              mode="outlined"
              label={t('adminContent.coverImage')}
              autoCapitalize="none"
              keyboardType="url"
              value={coverImage}
              onChangeText={setCoverImage}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text>{t('adminContent.published')}</Text>
              <Switch value={published} onValueChange={setPublished} />
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('admin.cancel')}</Button>
          <Button loading={save.isPending} disabled={save.isPending} onPress={() => void submit()}>
            {t('admin.save')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
