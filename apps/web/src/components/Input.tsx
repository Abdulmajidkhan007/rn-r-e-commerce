import TextField, { type TextFieldProps } from '@mui/material/TextField';

/** App text input — MUI TextField with outlined defaults. */
export function Input(props: TextFieldProps): React.ReactElement {
  return <TextField variant="outlined" fullWidth size="small" {...props} />;
}
