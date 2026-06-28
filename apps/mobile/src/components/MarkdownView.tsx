import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export interface MarkdownViewProps {
  content: string;
}

/** Lightweight markdown renderer for legal content. No extra dependencies. */
export function MarkdownView({ content }: MarkdownViewProps): React.ReactElement {
  const lines = content.split('\n');

  return (
    <View>
      {lines.map((line, index) => {
        // h1
        if (line.startsWith('# ')) {
          return (
            <Text key={index} variant="headlineSmall" style={styles.h1}>
              {line.slice(2)}
            </Text>
          );
        }

        // h2
        if (line.startsWith('## ')) {
          return (
            <Text key={index} variant="titleMedium" style={styles.h2}>
              {line.slice(3)}
            </Text>
          );
        }

        // h3
        if (line.startsWith('### ')) {
          return (
            <Text key={index} variant="titleSmall" style={styles.h3}>
              {line.slice(4)}
            </Text>
          );
        }

        // Empty line — spacer
        if (line.trim() === '') {
          return <View key={index} style={styles.spacer} />;
        }

        // Bullet point (- or *)
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const bulletText = line.slice(2);
          return (
            <View key={index} style={styles.bulletRow}>
              <Text variant="bodyMedium" style={styles.bulletSymbol}>
                {'•'}
              </Text>
              <Text variant="bodyMedium" style={styles.bulletText}>
                {stripInlineMarkdown(bulletText)}
              </Text>
            </View>
          );
        }

        // Markdown link line starting with [ — render as plain text
        if (line.startsWith('[')) {
          return (
            <Text key={index} variant="bodyMedium" style={styles.paragraph}>
              {stripInlineMarkdown(line)}
            </Text>
          );
        }

        // Regular paragraph
        return (
          <Text key={index} variant="bodyMedium" style={styles.paragraph}>
            {stripInlineMarkdown(line)}
          </Text>
        );
      })}
    </View>
  );
}

/** Strip `[text](url)` → `text`, `**text**` → `text`, `*text*` → `text`. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

const styles = StyleSheet.create({
  h1: {
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 4,
  },
  h2: {
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 16,
  },
  h3: {
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 12,
  },
  paragraph: {
    marginBottom: 4,
  },
  spacer: {
    height: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  bulletSymbol: {
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
  },
});
