import { Chip, useTheme } from 'react-native-paper';
import type { ReceiptStatus } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';

const LABEL = {
  pending: 'receipts.statusPending',
  approved: 'receipts.statusApproved',
  rejected: 'receipts.statusRejected',
} as const;

const ICON: Record<ReceiptStatus, string> = {
  pending: 'clock-outline',
  approved: 'check-circle-outline',
  rejected: 'close-circle-outline',
};

export function ReceiptStatusChip({ status }: { status: ReceiptStatus }): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const tint =
    status === 'approved'
      ? theme.colors.primaryContainer
      : status === 'rejected'
        ? theme.colors.errorContainer
        : theme.colors.secondaryContainer;
  return (
    <Chip compact icon={ICON[status]} style={{ alignSelf: 'flex-start', backgroundColor: tint }}>
      {t(LABEL[status])}
    </Chip>
  );
}
