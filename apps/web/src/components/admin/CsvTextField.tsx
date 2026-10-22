import { useState } from 'react';
import TextField from '@mui/material/TextField';

export interface CsvTextFieldProps {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  helperText?: string;
}

function toCsv(values: readonly string[]): string {
  return values.join(', ');
}

function fromCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Comma-separated list input. Keeps its own text so a trailing comma or space
 * survives while typing — re-deriving the text from the parsed list on every
 * keystroke used to swallow the comma, making a second value impossible to type.
 */
export function CsvTextField({
  label,
  value,
  onChange,
  helperText,
}: CsvTextFieldProps): React.ReactElement {
  const [text, setText] = useState(() => toCsv(value));

  // Follow outside changes (form reset) without clobbering what is being
  // typed: adjust state during render rather than in an effect.
  if (!sameList(fromCsv(text), value)) setText(toCsv(value));

  return (
    <TextField
      label={label}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const next = fromCsv(e.target.value);
        if (!sameList(next, value)) onChange(next);
      }}
      helperText={helperText}
    />
  );
}
