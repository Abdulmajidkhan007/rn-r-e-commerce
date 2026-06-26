import MuiRating, { type RatingProps } from '@mui/material/Rating';

/** App rating — MUI Rating, read-only by default. */
export function Rating(props: RatingProps): React.ReactElement {
  return <MuiRating precision={0.5} readOnly {...props} />;
}
