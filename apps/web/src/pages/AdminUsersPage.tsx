import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  filterCustomers,
  pageOf,
  summarizeCustomers,
  useAllOrders,
  useAllUsers,
  type CustomerSort,
} from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatPrice } from '@kidswear/utils';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

const PAGE_SIZES = [25, 50, 100];

/** 'DD.MM.YYYY' in Tashkent (UTC+5), matching the reports. */
function formatDay(ms: number): string {
  const d = new Date(ms + 5 * 60 * 60 * 1000).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
}

/**
 * Admin "Foydalanuvchilar": every profile joined with its orders on the client
 * (Spark has no server aggregates), searched, sorted and paged in memory.
 */
export default function AdminUsersPage(): React.ReactElement {
  const { t } = useTranslation();
  const language = useAppSelector((s) => s.ui.language);
  const users = useAllUsers();
  const { orders, loading } = useAllOrders();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CustomerSort>('spent');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0] ?? 25);

  const rows = useMemo(() => summarizeCustomers(users.data ?? [], orders), [users.data, orders]);
  const filtered = useMemo(() => filterCustomers(rows, search, sort), [rows, search, sort]);
  // Clamp instead of resetting in an effect when the list shrinks.
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const shownPage = Math.min(page, lastPage);
  const visible = pageOf(filtered, shownPage, pageSize);

  return (
    <Stack spacing={2}>
      <Typography variant="h2">{t('customers.title')}</Typography>

      <Card
        variant="outlined"
        sx={{ p: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}
      >
        <TextField
          label={t('customers.search')}
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <TextField
          select
          label={t('customers.sort')}
          size="small"
          value={sort}
          onChange={(e) => setSort(e.target.value as CustomerSort)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="spent">{t('customers.sortSpent')}</MenuItem>
          <MenuItem value="orders">{t('customers.sortOrders')}</MenuItem>
          <MenuItem value="lastOrder">{t('customers.sortLastOrder')}</MenuItem>
          <MenuItem value="newest">{t('customers.sortNewest')}</MenuItem>
        </TextField>
        <Typography variant="body2" color="text.secondary">
          {t('customers.count', { count: filtered.length })}
        </Typography>
      </Card>

      {users.isError && <Alert severity="error">{t('customers.loadFailed')}</Alert>}

      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        {users.isLoading || loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : filtered.length === 0 ? (
          <EmptyState title={t('customers.empty')} />
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t('customers.name')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('customers.contact')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t('customers.orders')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t('customers.totalSpent')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('customers.lastOrder')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('customers.registered')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow key={r.uid} hover>
                      <TableCell>
                        {r.displayName || '—'}
                        {r.isAdmin && (
                          <Chip size="small" label={t('customers.admin')} sx={{ ml: 1 }} />
                        )}
                        {!r.email && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={t('customers.noProfile')}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{r.email || '—'}</Typography>
                        {r.phone && (
                          <Typography variant="caption" color="text.secondary">
                            {r.phone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{r.orders}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {formatPrice(r.totalSpent, language)}
                      </TableCell>
                      <TableCell>
                        {r.lastOrderAt === null ? '—' : formatDay(r.lastOrderAt)}
                      </TableCell>
                      <TableCell>
                        {r.createdAt === undefined ? '—' : formatDay(r.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filtered.length}
              page={shownPage}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize}
              rowsPerPageOptions={PAGE_SIZES}
              onRowsPerPageChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              labelRowsPerPage={t('customers.rowsPerPage')}
            />
          </>
        )}
      </Card>
      <Typography variant="caption" color="text.secondary">
        {t('customers.note')}
      </Typography>
    </Stack>
  );
}
