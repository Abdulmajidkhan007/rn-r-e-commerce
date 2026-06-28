import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { getLegalDoc } from '@kidswear/legal';

export default function PrivacyPage(): React.ReactElement {
  const { t } = useTranslation();
  const language = useAppSelector((s) => s.ui.language);
  const markdown = getLegalDoc('privacy', language);

  useEffect(() => {
    document.title = t('legal.privacyTitle');
  }, [t]);

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          '& h1': { typography: 'h4', fontWeight: 800, mb: 2, mt: 0 },
          '& h2': { typography: 'h5', fontWeight: 700, mb: 1.5, mt: 3 },
          '& h3': { typography: 'h6', fontWeight: 600, mb: 1, mt: 2.5 },
          '& p': { typography: 'body1', mb: 1.5 },
          '& ul': { pl: 3, mb: 1.5 },
          '& li': { typography: 'body1', mb: 0.5 },
          '& a': { color: 'primary.main' },
        }}
      >
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </Box>
    </Container>
  );
}
