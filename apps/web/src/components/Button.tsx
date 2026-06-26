import MuiButton, { type ButtonProps } from '@mui/material/Button';

/** App button — MUI Button with our defaults (rounded, no caps via theme). */
export function Button(props: ButtonProps): React.ReactElement {
  return <MuiButton variant="contained" {...props} />;
}
