import { useLocalSearchParams } from 'expo-router';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

export default function ProductScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ScreenPlaceholder title="Product" subtitle={`Product detail #${id ?? ''} — later.`} />;
}
