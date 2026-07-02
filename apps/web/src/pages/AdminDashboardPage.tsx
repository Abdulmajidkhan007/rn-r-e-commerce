import { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OrderStatus } from '@kidswear/core';
import { summarizeDashboard, useAdminProducts, useAllOrders } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatDate, formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { tokens } from '@kidswear/theme';
import { StatCard } from '@/components/admin/StatCard';

const STATUS_LABEL = {
  pending: 'orderStatus.pending',
  deposit_paid: 'orderStatus.deposit_paid',
  processing: 'orderStatus.processing',
  shipped: 'orderStatus.shipped',
  delivered: 'orderStatus.delivered',
  cancelled: 'orderStatus.cancelled',
} as const;

export default function AdminDashboardPage(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = useAppSelector((s) => s.ui.language);
  const { orders } = useAllOrders();
  const { data: products = [] } = useAdminProducts();

  const stats = useMemo(() => summarizeDashboard(orders, products), [orders, products]);

  const chartData = useMemo(
    () =>
      (Object.keys(stats.byStatus) as OrderStatus[]).map((status) => ({
        status: t(STATUS_LABEL[status]),
        count: stats.byStatus[status],
      })),
    [stats.byStatus, t],
  );

  const today = useMemo(() => formatDate(new Date(), language), [language]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h2">{t('admin.dashboard')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {today}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        }}
      >
        <StatCard
          label={t('dashboardStats.totalProducts')}
          value={String(stats.totalProducts)}
          accent="primary"
        />
        <StatCard
          label={t('dashboardStats.lowStock')}
          value={String(stats.lowStock)}
          accent="warning"
        />
        <StatCard
          label={t('dashboardStats.totalOrders')}
          value={String(stats.totalOrders)}
          accent="secondary"
        />
        <StatCard
          label={t('dashboardStats.depositsCollected')}
          value={formatPrice(stats.depositsCollected, language)}
          accent="success"
        />
      </Box>

      <Card variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {t('dashboardStats.byStatus')}
        </Typography>
        <Box sx={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis
                dataKey="status"
                fontSize={12}
                interval={0}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: tokens.radii.md,
                }}
              />
              <Bar dataKey="count" fill={theme.palette.primary.main} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card>
    </Stack>
  );
}
