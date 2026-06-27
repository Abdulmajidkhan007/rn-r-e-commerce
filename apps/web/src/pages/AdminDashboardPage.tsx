import { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
import { formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { Card } from '@/components';

const STATUS_LABEL = {
  pending: 'orderStatus.pending',
  deposit_paid: 'orderStatus.deposit_paid',
  processing: 'orderStatus.processing',
  shipped: 'orderStatus.shipped',
  delivered: 'orderStatus.delivered',
  cancelled: 'orderStatus.cancelled',
} as const;

function StatCard({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Card>
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
      </Stack>
    </Card>
  );
}

export default function AdminDashboardPage(): React.ReactElement {
  const { t } = useTranslation();
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

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {t('admin.dashboard')}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        }}
      >
        <StatCard label={t('dashboardStats.totalProducts')} value={String(stats.totalProducts)} />
        <StatCard label={t('dashboardStats.lowStock')} value={String(stats.lowStock)} />
        <StatCard label={t('dashboardStats.totalOrders')} value={String(stats.totalOrders)} />
        <StatCard
          label={t('dashboardStats.depositsCollected')}
          value={formatPrice(stats.depositsCollected, language)}
        />
      </Box>

      <Card>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('dashboardStats.byStatus')}
        </Typography>
        <Box sx={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" fontSize={12} interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card>
    </Stack>
  );
}
