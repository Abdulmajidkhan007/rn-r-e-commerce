import { View } from 'react-native';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { HelperText, TextInput } from 'react-native-paper';
import type { KeyboardTypeOptions } from 'react-native';

export interface FormTextInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** Translated error message, if any. */
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: 'email' | 'name' | 'password' | 'new-password' | 'off';
}

/** Paper TextInput bound to react-hook-form via Controller, with error text. */
export function FormTextInput<T extends FieldValues>({
  control,
  name,
  label,
  error,
  secureTextEntry,
  keyboardType,
  autoComplete,
}: FormTextInputProps<T>): React.ReactElement {
  return (
    <View>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            mode="outlined"
            label={label}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={!!error}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
            autoComplete={autoComplete}
          />
        )}
      />
      <HelperText type="error" visible={!!error}>
        {error ?? ' '}
      </HelperText>
    </View>
  );
}
