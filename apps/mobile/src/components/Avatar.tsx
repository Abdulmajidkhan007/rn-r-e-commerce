import { Avatar as PaperAvatar } from 'react-native-paper';

export interface AvatarProps {
  /** Two-letter label shown when no image is provided. */
  label: string;
  size?: number;
}

/** App avatar — Paper Avatar.Text. */
export function Avatar({ label, size = 40 }: AvatarProps): React.ReactElement {
  return <PaperAvatar.Text label={label} size={size} />;
}
