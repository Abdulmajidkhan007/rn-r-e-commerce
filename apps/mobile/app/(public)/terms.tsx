import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '@kidswear/store';
import { getLegalDoc } from '@kidswear/legal';
import { MarkdownView } from '@/components/MarkdownView';

export default function TermsScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const markdown = getLegalDoc('terms', language);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <MarkdownView content={markdown} />
    </ScrollView>
  );
}
