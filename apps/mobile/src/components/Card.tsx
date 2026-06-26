import { Card as PaperCard } from 'react-native-paper';
import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
}

/** App card — Paper Card with padded content. */
export function Card({ children, className }: CardProps): React.ReactElement {
  return (
    <PaperCard mode="outlined" className={className}>
      <PaperCard.Content>{children}</PaperCard.Content>
    </PaperCard>
  );
}
