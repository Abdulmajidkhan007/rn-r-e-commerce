import { Link as RouterLink } from 'react-router-dom';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import { usePublishedPosts } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { Skeleton } from '@/components';
import { useLocalized } from '@/lib/useLocalized';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function BlogPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('blog.title'));
  const localized = useLocalized();
  const language = useAppSelector((s) => s.ui.language);
  const { data: posts = [], isLoading } = usePublishedPosts();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
            {t('blog.title')}
          </Typography>
          <Typography color="text.secondary">{t('blog.subtitle')}</Typography>
        </Stack>

        {isLoading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Skeleton variant="rectangular" sx={{ aspectRatio: '16 / 9', borderRadius: 2 }} />
                <Skeleton sx={{ mt: 1 }} width="70%" />
              </Grid>
            ))}
          </Grid>
        ) : posts.length === 0 ? (
          <Typography color="text.secondary">{t('blog.empty')}</Typography>
        ) : (
          <Grid container spacing={2}>
            {posts.map((post) => (
              <Grid key={post.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea
                    component={RouterLink}
                    to={`/blog/${post.slug}`}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                    }}
                  >
                    {post.coverImage ? (
                      <CardMedia
                        component="img"
                        image={post.coverImage}
                        alt=""
                        sx={{ aspectRatio: '16 / 9', objectFit: 'cover', bgcolor: 'action.hover' }}
                      />
                    ) : null}
                    <CardContent>
                      <Stack spacing={1}>
                        {post.publishedAt !== undefined && (
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(post.publishedAt, language)}
                          </Typography>
                        )}
                        <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                          {localized(post.title)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {localized(post.excerpt)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
