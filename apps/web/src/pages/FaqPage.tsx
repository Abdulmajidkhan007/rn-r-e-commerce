import { Link as RouterLink } from 'react-router-dom';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { blogParagraphs } from '@kidswear/core';
import { useFaqs } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Skeleton } from '@/components';
import { useLocalized } from '@/lib/useLocalized';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function FaqPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('faq.title'));
  const localized = useLocalized();
  const { data: faqs = [], isLoading } = useFaqs();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
            {t('faq.title')}
          </Typography>
          <Typography color="text.secondary">{t('faq.subtitle')}</Typography>
        </Stack>

        {isLoading ? (
          <Stack spacing={1}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : faqs.length === 0 ? (
          <Typography color="text.secondary">{t('faq.empty')}</Typography>
        ) : (
          <div data-testid="faq-list">
            {faqs.map((f) => (
              <Accordion key={f.id} disableGutters variant="outlined">
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>{localized(f.question)}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    {blogParagraphs(localized(f.answer)).map((p, i) => (
                      <Typography key={i} variant="body2" color="text.secondary">
                        {p}
                      </Typography>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </div>
        )}

        <Typography variant="body2" color="text.secondary">
          {t('faq.contactCta')}{' '}
          <Typography component={RouterLink} to="/contact" variant="body2" color="primary">
            {t('faq.contactLink')}
          </Typography>
        </Typography>
      </Stack>
    </Container>
  );
}
