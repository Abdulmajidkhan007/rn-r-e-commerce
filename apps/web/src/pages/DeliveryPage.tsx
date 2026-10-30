import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { UZ_REGIONS } from '@kidswear/core';
import { useDeliverySettings, useDeliveryText } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatPrice, pickLocalized } from '@kidswear/utils';
import { Card, Skeleton } from '@/components';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function DeliveryPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('deliveryPage.title'));
  const language = useAppSelector((s) => s.ui.language);
  const { data: settings, isLoading } = useDeliverySettings();
  const text = useDeliveryText(language);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
            {t('deliveryPage.title')}
          </Typography>
          <Typography color="text.secondary">{t('deliveryPage.subtitle')}</Typography>
        </Stack>

        {isLoading ? (
          <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
        ) : !settings ? (
          <Typography color="text.secondary">{t('deliveryPage.notSet')}</Typography>
        ) : (
          <>
            <Card>
              <Stack spacing={0.5} data-testid="delivery-summary">
                <Typography variant="h6">{text.summary}</Typography>
                {text.free && <Typography>{text.free}</Typography>}
                {text.min && <Typography>{text.min}</Typography>}
              </Stack>
            </Card>
            <Card>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('deliveryPage.byRegion')}
              </Typography>
              <Table size="small" data-testid="delivery-regions">
                <TableBody>
                  {UZ_REGIONS.filter((r) => settings.regions[r.id] !== undefined).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{pickLocalized(r.name, language)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatPrice(settings.regions[r.id] ?? 0, language)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>{t('deliveryPage.otherRegions')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {formatPrice(settings.defaultFee, language)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        <Card>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{t('deliveryPage.howTitle')}</Typography>
            <Typography variant="body2">• {t('deliveryPage.how1')}</Typography>
            <Typography variant="body2">• {t('deliveryPage.how2')}</Typography>
            <Typography variant="body2">• {t('deliveryPage.how3')}</Typography>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
