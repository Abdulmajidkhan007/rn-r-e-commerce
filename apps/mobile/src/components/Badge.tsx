import { Badge as PaperBadge } from 'react-native-paper';
import type { ComponentProps } from 'react';

type PaperBadgeProps = ComponentProps<typeof PaperBadge>;

/** App badge — Paper Badge (e.g. cart item count). */
export function Badge(props: PaperBadgeProps): React.ReactElement {
  return <PaperBadge {...props} />;
}
