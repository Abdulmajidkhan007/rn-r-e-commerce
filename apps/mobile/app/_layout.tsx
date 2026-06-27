import '../global.css';
import '@/firebase';
import '@/i18n';

import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { useAuth, useAuthBootstrap } from '@kidswear/auth';
import { QueryClientProvider, makeQueryClient } from '@kidswear/data';
import { StoreProvider } from '@/providers/StoreProvider';
import { AppThemeProvider } from '@/theme/ThemeProvider';
import { AppLockProvider } from '@/lib/applock/AppLockProvider';
import { LockGate } from '@/lib/applock/LockGate';
import { configureNotifications, attachNotificationListeners } from '@/lib/push';
import { useNotificationBootstrap } from '@/lib/useNotificationBootstrap';

const queryClient = makeQueryClient();

/** Renders the navigation stack with theme-aware header colors. */
function RootNavigator(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  useAuthBootstrap();
  useNotificationBootstrap();
  const { status } = useAuth();

  useEffect(() => {
    configureNotifications();
    const cleanup = attachNotificationListeners(router);
    return cleanup;
    // router is stable from expo-router; this effect runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'idle') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <ActivityIndicator />
      </View>
    );
  }

  // AuthGate (above) resolves the session; AppLockProvider then gates the UI.
  return (
    <AppLockProvider>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <LockGate>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.onSurface,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(public)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack>
      </LockGate>
    </AppLockProvider>
  );
}

export default function RootLayout(): React.ReactElement {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <QueryClientProvider client={queryClient}>
            <AppThemeProvider>
              <RootNavigator />
            </AppThemeProvider>
          </QueryClientProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
