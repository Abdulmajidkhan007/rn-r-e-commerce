import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { HelperText, Menu, TextInput } from 'react-native-paper';
import { UZ_REGIONS } from '@kidswear/core';
import { useAppSelector } from '@kidswear/store';
import { pickLocalized } from '@kidswear/utils';
import { regionLabel } from '@/lib/region';

/**
 * Region picker bound to react-hook-form. Stores the region id (UZ_REGIONS);
 * an address saved before the list existed shows its free text until changed.
 */
export function RegionField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  error,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder: string;
  error?: string;
}): React.ReactElement {
  const language = useAppSelector((s) => s.ui.language);
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <>
          <Menu
            visible={open}
            onDismiss={() => setOpen(false)}
            anchor={
              <TextInput
                mode="outlined"
                label={label}
                value={value ? regionLabel(String(value), language) : ''}
                placeholder={placeholder}
                editable={false}
                error={!!error}
                right={<TextInput.Icon icon="menu-down" onPress={() => setOpen(true)} />}
                onPressIn={() => setOpen(true)}
              />
            }
          >
            <ScrollView style={{ maxHeight: 360 }}>
              {UZ_REGIONS.map((r) => (
                <Menu.Item
                  key={r.id}
                  title={pickLocalized(r.name, language)}
                  onPress={() => {
                    onChange(r.id);
                    setOpen(false);
                  }}
                />
              ))}
            </ScrollView>
          </Menu>
          {error ? (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          ) : null}
        </>
      )}
    />
  );
}
