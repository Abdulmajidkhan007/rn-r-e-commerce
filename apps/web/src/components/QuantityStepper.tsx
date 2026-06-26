import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

/** Increment/decrement control for cart quantities. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: QuantityStepperProps): React.ReactElement {
  const dec = (): void => {
    onChange(Math.max(min, value - 1));
  };
  const inc = (): void => {
    onChange(Math.min(max, value + 1));
  };

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <IconButton size="small" onClick={dec} disabled={value <= min} aria-label="decrease">
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center' }}>
        {value}
      </Typography>
      <IconButton size="small" onClick={inc} disabled={value >= max} aria-label="increase">
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
