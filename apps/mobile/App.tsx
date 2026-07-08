import './global.css';
import '@/firebase';
import '@/i18n';

import { useEffect, type ReactElement } from 'react';
import { StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { ActivityIndicator, useTheme, type MD3Theme } from 'react-native-paper';
import { useAuth, useAuthBootstrap } from '@kidswear/auth';
import { QueryClientProvider, makeQueryClient } from '@kidswear/data';
import { StoreProvider } from '@/providers/StoreProvider';
import { AppThemeProvider } from '@/theme/ThemeProvider';
import { AppLockProvider } from '@/lib/applock/AppLockProvider';
import { LockGate } from '@/lib/applock/LockGate';
import { configureNotifications, attachNotificationListeners } from '@/lib/push';
import { useNotificationBootstrap } from '@/lib/useNotificationBootstrap';
import { navigationRef } from '@/navigation/navigationRef';
import { RootNavigator } from '@/navigation/RootNavigator';

const queryClient = makeQueryClient();

/** Maps the active Paper (MD3) theme onto a React Navigation theme. */
function toNavigationTheme(theme: MD3Theme): NavigationTheme {
  return {
    ...DefaultTheme,
    dark: theme.dark,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outline,
      notification: theme.colors.error,
    },
  };
}

/** Renders the navigation container with theme-aware header colors. */
function AppNavigator(): ReactElement {
  const theme = useTheme();
  useAuthBootstrap();
  useNotificationBootstrap();
  const { status } = useAuth();

  useEffect(() => {
    configureNotifications();
    const cleanup = attachNotificationListeners((orderId) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('OrderDetail', { id: orderId });
      }
    });
    return cleanup;
    // This effect runs once on mount; navigationRef is a stable module-level ref.
     
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
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator />
      </View>
    );
  }

  // AuthGate (above) resolves the session; AppLockProvider then gates the UI.
  return (
    <AppLockProvider>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <LockGate>
        <NavigationContainer ref={navigationRef} theme={toNavigationTheme(theme)}>
          <RootNavigator />
        </NavigationContainer>
      </LockGate>
    </AppLockProvider>
  );
}

export default function App(): ReactElement {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <QueryClientProvider client={queryClient}>
            <AppThemeProvider>
              <AppNavigator />
            </AppThemeProvider>
          </QueryClientProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
