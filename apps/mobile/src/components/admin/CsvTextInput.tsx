import { useState } from 'react';
import { TextInput } from 'react-native-paper';

export interface CsvTextInputProps {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
}

const toCsv = (v: readonly string[]): string => v.join(', ');
const fromCsv = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Comma-separated list input that keeps its own text, so a trailing comma
 * survives typing (deriving the text from the parsed list swallowed it).
 */
export function CsvTextInput({ label, value, onChange }: CsvTextInputProps): React.ReactElement {
  const [text, setText] = useState(() => toCsv(value));

  // Follow outside changes (form reset) without clobbering what is being
  // typed: adjust state during render rather than in an effect.
  if (!sameList(fromCsv(text), value)) setText(toCsv(value));

  return (
    <TextInput
      mode="outlined"
      label={label}
      value={text}
      onChangeText={(next) => {
        setText(next);
        const parsed = fromCsv(next);
        if (!sameList(parsed, value)) onChange(parsed);
      }}
    />
  );
}
