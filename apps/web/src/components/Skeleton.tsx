import MuiSkeleton, { type SkeletonProps } from '@mui/material/Skeleton';

/** App skeleton loader — MUI Skeleton. */
export function Skeleton(props: SkeletonProps): React.ReactElement {
  return <MuiSkeleton animation="wave" {...props} />;
}
