import { useState, type ReactElement, type ReactNode } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Banner, Button, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { evaluateAppUpdate, parseVersionCode } from '@kidswear/core';
import { useAppSettings } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';

/** versionCode baked in by CI (apk-release.yml); 0 = unknown (dev build) → never nag. */
const INSTALLED_VERSION_CODE = parseVersionCode(process.env.RN_PUBLIC_APP_VERSION_CODE);

/**
 * Tells old Android installs about a newer APK. A banner for an optional
 * update (dismissible until the next release); a blocking screen when the
 * admin raised `minVersionCode` above this install. Silent on any failure to
 * read the settings — an update check must never lock customers out.
 */
export function UpdateGate({ children }: { children: ReactNode }): ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data } = useAppSettings();
  const [dismissed, setDismissed] = useState<number | undefined>(undefined);
  const state =
    Platform.OS === 'android' ? evaluateAppUpdate(INSTALLED_VERSION_CODE, data, dismissed) : null;

  if (state === null || state.kind === 'none') return <>{children}</>;

  const open = (): void => {
    void Linking.openURL(state.apkUrl);
  };
  const version = state.latestVersionName ?? '';

  if (state.kind === 'forced') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          backgroundColor: theme.colors.background,
        }}
      >
        <MaterialCommunityIcons name="update" size={64} color={theme.colors.primary} />
        <Text variant="headlineSmall" style={{ fontWeight: '800', textAlign: 'center' }}>
          {t('appUpdate.forcedTitle')}
        </Text>
        <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
          {t('appUpdate.forcedBody')}
        </Text>
        <Button mode="contained" icon="download" onPress={open}>
          {t('appUpdate.download')}
        </Button>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Banner
        visible
        icon="update"
        actions={[
          { label: t('appUpdate.later'), onPress: () => setDismissed(data?.latestVersionCode) },
          { label: t('appUpdate.download'), onPress: open },
        ]}
      >
        {`${t('appUpdate.bannerTitle')}. ${t('appUpdate.bannerBody', { version })}`}
      </Banner>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
