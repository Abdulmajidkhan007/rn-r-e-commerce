import { Button as PaperButton } from 'react-native-paper';
import type { ComponentProps } from 'react';

type PaperButtonProps = ComponentProps<typeof PaperButton>;

/** App button — Paper Button, contained by default. */
export function Button(props: PaperButtonProps): React.ReactElement {
  return <PaperButton mode="contained" {...props} />;
}
