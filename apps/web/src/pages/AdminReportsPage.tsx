import { useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { summarizeSales, useAllOrders, type SalesBucket } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatPrice, type AppLocale } from '@kidswear/utils';
import { Card } from '@/components';
import { StatCard } from '@/components/admin/StatCard';
import { TableSkeleton } from '@/components/admin/TableSkeleton';
import { useNow } from '@/lib/useNow';

/** Plain CSS bar chart — no chart library for one admin view. */
function Bars({
  buckets,
  language,
  label,
}: {
  buckets: SalesBucket[];
  language: AppLocale;
  label: (key: string) => string;
}): React.ReactElement {
  const max = Math.max(1, ...buckets.map((b) => b.revenue));
  return (
    <Box
      role="img"
      aria-label={buckets
        .map((b) => `${label(b.key)}: ${formatPrice(b.revenue, language)}`)
        .join('; ')}
      sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 160, pt: 1 }}
    >
      {buckets.map((b) => (
        <Tooltip
          key={b.key}
          title={`${label(b.key)} — ${formatPrice(b.revenue, language)} (${b.orders})`}
          arrow
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              height: `${Math.max(2, (b.revenue / max) * 100)}%`,
              bgcolor: b.revenue > 0 ? 'primary.main' : 'action.hover',
              borderRadius: '4px 4px 0 0',
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}

export default function AdminReportsPage(): React.ReactElement {
  const { t } = useTranslation();
  const language = useAppSelector((s) => s.ui.language);
  const { orders, loading } = useAllOrders();
  const now = useNow();
  const [range, setRange] = useState<'daily' | 'monthly'>('daily');
  const report = useMemo(() => summarizeSales(orders, now), [orders, now]);

  if (loading) return <TableSkeleton rows={6} columns={3} />;

  const buckets = range === 'daily' ? report.daily : report.monthly;
  const label = (key: string): string => (range === 'daily' ? key.slice(5).replace('-', '.') : key);

  return (
    <Stack spacing={3}>
      <Typography variant="h2">{t('adminContent.reports')}</Typography>

      {/* Money values get a full row on phones — a half-width card clips them. */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('adminContent.revenue')}
            value={formatPrice(report.revenue, language)}
            accent="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('adminContent.averageOrder')}
            value={formatPrice(report.averageOrder, language)}
            accent="secondary"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label={t('adminContent.paidOrders')}
            value={String(report.orders)}
            accent="success"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label={t('adminContent.cancelledOrders')}
            value={String(report.cancelled)}
            accent="error"
          />
        </Grid>
      </Grid>
      <Typography variant="body2" color="text.secondary">
        {t('adminContent.discountsGiven', { amount: formatPrice(report.discounts, language) })}
      </Typography>

      <Card>
        <Stack spacing={1}>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('adminContent.salesChart')}
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={range}
              onChange={(_, v: 'daily' | 'monthly' | null) => v && setRange(v)}
            >
              <ToggleButton value="daily">{t('adminContent.last30Days')}</ToggleButton>
              <ToggleButton value="monthly">{t('adminContent.last12Months')}</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Bars buckets={buckets} language={language} label={label} />
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              {label(buckets[0]?.key ?? '')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {label(buckets.at(-1)?.key ?? '')}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {t('adminContent.reportNote')}
          </Typography>
        </Stack>
      </Card>

      <Card>
        <Stack spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('adminContent.topProducts')}
          </Typography>
          {report.topProducts.length === 0 ? (
            <Typography color="text.secondary">{t('adminContent.noSales')}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('admin.name')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {t('adminContent.sold')}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {t('adminContent.revenue')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.topProducts.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell align="right">{p.quantity}</TableCell>
                    <TableCell align="right">{formatPrice(p.revenue, language)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
