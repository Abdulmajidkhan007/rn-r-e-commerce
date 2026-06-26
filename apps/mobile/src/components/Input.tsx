import { TextInput } from 'react-native-paper';
import type { ComponentProps } from 'react';

type TextInputProps = ComponentProps<typeof TextInput>;

/** App text input — Paper TextInput, outlined. */
export function Input(props: TextInputProps): React.ReactElement {
  return <TextInput mode="outlined" dense {...props} />;
}
