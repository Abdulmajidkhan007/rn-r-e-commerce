import Chip from '@mui/material/Chip';
import type { ReceiptStatus } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';

const COLOR: Record<ReceiptStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const LABEL = {
  pending: 'receipts.statusPending',
  approved: 'receipts.statusApproved',
  rejected: 'receipts.statusRejected',
} as const;

export function ReceiptStatusChip({ status }: { status: ReceiptStatus }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      color={COLOR[status]}
      label={t(LABEL[status])}
      data-status={status}
      sx={{ alignSelf: 'flex-start' }}
    />
  );
}
