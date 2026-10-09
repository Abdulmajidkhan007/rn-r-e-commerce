import { Link as RouterLink, useParams } from 'react-router-dom';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { blogParagraphs } from '@kidswear/core';
import { useBlogPost } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { Skeleton } from '@/components';
import { useLocalized } from '@/lib/useLocalized';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function BlogPostPage(): React.ReactElement {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const localized = useLocalized();
  const language = useAppSelector((s) => s.ui.language);
  const { data: post, isLoading } = useBlogPost(slug);
  useDocumentTitle(post ? localized(post.title) : t('blog.title'));

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={3}>
        <Button
          component={RouterLink}
          to="/blog"
          startIcon={<ArrowBackIcon />}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('blog.back')}
        </Button>

        {isLoading ? (
          <Stack spacing={2}>
            <Skeleton width="80%" height={48} />
            <Skeleton variant="rectangular" sx={{ aspectRatio: '16 / 9', borderRadius: 2 }} />
          </Stack>
        ) : !post ? (
          <Typography color="text.secondary">{t('blog.notFound')}</Typography>
        ) : (
          <Stack component="article" spacing={2}>
            {post.publishedAt !== undefined && (
              <Typography variant="caption" color="text.secondary">
                {formatDate(post.publishedAt, language)}
              </Typography>
            )}
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.6rem' } }}
            >
              {localized(post.title)}
            </Typography>
            {post.coverImage && (
              <Box
                component="img"
                src={post.coverImage}
                alt=""
                sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 3 }}
              />
            )}
            {/* Plain text only: paragraphs, no HTML — see BlogPostSchema. */}
            {blogParagraphs(localized(post.body)).map((p, i) => (
              <Typography key={i} sx={{ whiteSpace: 'pre-line', lineHeight: 1.75 }}>
                {p}
              </Typography>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
