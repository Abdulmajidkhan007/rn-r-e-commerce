import MuiBadge, { type BadgeProps } from '@mui/material/Badge';

/** App badge — MUI Badge (e.g. cart item count). */
export function Badge(props: BadgeProps): React.ReactElement {
  return <MuiBadge color="primary" {...props} />;
}
