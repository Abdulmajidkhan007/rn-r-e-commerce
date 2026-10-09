import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import { BlogPostSchema, type BlogPost, type LocalizedText } from '@kidswear/core';
import { useSaveBlogPost } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { slugify } from '@kidswear/utils';

type Lang = 'uz' | 'en' | 'ru';
const LANGS: Lang[] = ['uz', 'en', 'ru'];
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
  open,
  post,
  onClose,
}: {
  open: boolean;
  post?: BlogPost;
  onClose: () => void;
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
    const finalSlug = slug || slugify(title.uz);
    const input = {
      slug: finalSlug,
      title: clean(title),
      excerpt: clean(excerpt),
      body: clean(body),
      published,
      ...(coverImage.trim() ? { coverImage: coverImage.trim() } : {}),
      ...(post?.publishedAt !== undefined ? { publishedAt: post.publishedAt } : {}),
    };
    // Validate with the domain schema before writing (dummy managed fields).
    const check = BlogPostSchema.safeParse({ ...input, id: 'x', createdAt: 0, updatedAt: 0 });
    if (!check.success || !input.title.uz || !input.body.uz) {
      setError(t('adminContent.blogInvalid'));
      return;
    }
    try {
      await save.mutateAsync({ id: post?.id ?? null, input });
      onClose();
    } catch {
      setError(t('adminContent.saveFailed'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{post ? t('adminContent.editPost') : t('adminContent.newPost')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Tabs value={lang} onChange={(_, v: Lang) => setLang(v)}>
            {LANGS.map((l) => (
              <Tab key={l} value={l} label={l.toUpperCase() + (l === 'uz' ? ' *' : '')} />
            ))}
          </Tabs>
          <TextField
            label={t('adminContent.postTitle')}
            value={title[lang] ?? ''}
            onChange={(e) => {
              setLocalized(setTitle)(e.target.value);
              if (lang === 'uz' && !slugTouched) setSlug(slugify(e.target.value));
            }}
          />
          <TextField
            label={t('adminContent.excerpt')}
            multiline
            minRows={2}
            value={excerpt[lang] ?? ''}
            onChange={(e) => setLocalized(setExcerpt)(e.target.value)}
          />
          <TextField
            label={t('adminContent.body')}
            helperText={t('adminContent.bodyHint')}
            multiline
            minRows={8}
            value={body[lang] ?? ''}
            onChange={(e) => setLocalized(setBody)(e.target.value)}
          />
          <TextField
            label={t('admin.slug')}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
          />
          <TextField
            label={t('adminContent.coverImage')}
            placeholder="https://"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
          />
          <FormControlLabel
            control={
              <Switch checked={published} onChange={(e) => setPublished(e.target.checked)} />
            }
            label={t('adminContent.published')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.cancel')}</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={save.isPending}>
          {t('admin.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
