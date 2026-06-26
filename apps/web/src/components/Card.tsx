import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  /** When false, renders the raw Card without the padded CardContent wrapper. */
  padded?: boolean;
  className?: string;
}

/** App card — MUI Card with optional padded content. */
export function Card({ children, padded = true, className }: CardProps): React.ReactElement {
  return (
    <MuiCard variant="outlined" className={className}>
      {padded ? <CardContent>{children}</CardContent> : children}
    </MuiCard>
  );
}
