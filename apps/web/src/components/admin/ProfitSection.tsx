import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Order } from '@kidswear/core';
import {
  ordersMissingCost,
  periodFromDays,
  profitPresetRange,
  summarizeProfit,
  type ProfitPreset,
  useBackfillOrderCosts,
  useOrderCosts,
} from '@kidswear/data';
import { useAuth } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatPrice } from '@kidswear/utils';
import { Card } from '@/components';
import { ConfirmDialog } from './ConfirmDialog';
import { StatCard } from './StatCard';
import { TableSkeleton } from './TableSkeleton';

type Preset = ProfitPreset | 'custom';

/** Revenue, cost and profit for a period, from `orderCosts` snapshots (admin-only). */
export function ProfitSection({
  orders,
  now,
}: {
  orders: readonly Order[];
  now: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();
  const language = useAppSelector((s) => s.ui.language);
  const costs = useOrderCosts();
  const backfill = useBackfillOrderCosts();
  const [preset, setPreset] = useState<Preset>('thisMonth');
  const [range, setRange] = useState(() => profitPresetRange('thisMonth', now));
  const [confirmBackfill, setConfirmBackfill] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const period = useMemo(() => periodFromDays(range), [range]);
  const costMap = costs.data;
  const report = useMemo(
    () => (costMap && period ? summarizeProfit(orders, costMap, period) : null),
    [orders, costMap, period],
  );
  const missing = useMemo(
    () => (costMap ? ordersMissingCost(orders, costMap) : []),
    [orders, costMap],
  );

  const money = (n: number): string => formatPrice(n, language);
  const choosePreset = (next: Preset): void => {
    setPreset(next);
    if (next !== 'custom') setRange(profitPresetRange(next, now));
  };

  return (
    <Card>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ justifyContent: 'space-between', gap: 1.5 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('profit.title')}
          </Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            <TextField
              select
              size="small"
              label={t('profit.period')}
              value={preset}
              onChange={(e) => choosePreset(e.target.value as Preset)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="thisMonth">{t('profit.thisMonth')}</MenuItem>
              <MenuItem value="last30">{t('profit.last30')}</MenuItem>
              <MenuItem value="last12m">{t('profit.last12m')}</MenuItem>
              <MenuItem value="all">{t('profit.all')}</MenuItem>
              <MenuItem value="custom">—</MenuItem>
            </TextField>
            <TextField
              type="date"
              size="small"
              label={t('profit.from')}
              value={range.from}
              onChange={(e) => {
                setPreset('custom');
                setRange((r) => ({ ...r, from: e.target.value }));
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              size="small"
              label={t('profit.to')}
              value={range.to}
              onChange={(e) => {
                setPreset('custom');
                setRange((r) => ({ ...r, to: e.target.value }));
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </Stack>

        {notice && (
          <Alert severity="success" onClose={() => setNotice(null)}>
            {notice}
          </Alert>
        )}

        {backfill.isError && <Alert severity="error">{t('adminContent.saveFailed')}</Alert>}

        {costs.isLoading ? (
          <TableSkeleton rows={3} columns={4} />
        ) : costs.isError ? (
          <Alert severity="error">{t('profit.loadFailed')}</Alert>
        ) : !report ? (
          <Alert severity="warning">{t('profit.invalidPeriod')}</Alert>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                <StatCard
                  label={t('profit.revenue')}
                  value={money(report.revenue)}
                  hint={t('profit.revenueHint', { count: report.confirmedOrders })}
                  accent="primary"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                <StatCard
                  label={t('profit.cost')}
                  value={money(report.cost)}
                  hint={t('profit.costedHint', { count: report.costedOrders })}
                  accent="warning"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                <StatCard
                  label={t('profit.profit')}
                  value={money(report.profit)}
                  hint={`${t('profit.goodsRevenue')}: ${money(report.costedRevenue)}`}
                  accent={report.profit < 0 ? 'error' : 'success'}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                <StatCard
                  label={t('profit.margin')}
                  value={report.margin === null ? '—' : `${(report.margin * 100).toFixed(1)}%`}
                  hint={`${t('profit.deliveryFees')}: ${money(report.deliveryFees)}`}
                  accent="secondary"
                />
              </Grid>
            </Grid>

            {report.uncostedOrders > 0 && (
              <Alert severity="warning">
                {t('profit.uncosted', { count: report.uncostedOrders })}
              </Alert>
            )}
            {missing.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                disabled={backfill.isPending || !user}
                onClick={() => setConfirmBackfill(true)}
                sx={{ alignSelf: 'flex-start' }}
              >
                {t('profit.backfill', { count: missing.length })}
              </Button>
            )}

            {report.monthly.length === 0 ? (
              <Typography color="text.secondary">{t('profit.noData')}</Typography>
            ) : (
              <Table size="small" aria-label={t('profit.monthly')}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t('profit.month')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t('profit.orders')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t('profit.goodsRevenue')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t('profit.cost')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t('profit.profit')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.monthly.map((m) => (
                    <TableRow key={m.key}>
                      <TableCell>{m.key}</TableCell>
                      <TableCell align="right">{m.orders}</TableCell>
                      <TableCell align="right">{money(m.revenue)}</TableCell>
                      <TableCell align="right">{money(m.cost)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: m.profit < 0 ? 'error.main' : undefined, fontWeight: 600 }}
                      >
                        {money(m.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Typography variant="caption" color="text.secondary">
              {t('profit.note')}
            </Typography>
          </>
        )}
      </Stack>

      <ConfirmDialog
        open={confirmBackfill}
        title={t('profit.backfill', { count: missing.length })}
        message={t('profit.backfillMsg', { count: missing.length })}
        onCancel={() => setConfirmBackfill(false)}
        onConfirm={() => {
          setConfirmBackfill(false);
          if (!user) return;
          backfill.mutate(
            { orderIds: missing.map((o) => o.id), by: user.uid },
            {
              onSuccess: (count) => setNotice(t('profit.backfillDone', { count })),
            },
          );
        }}
      />
    </Card>
  );
}
