import { useEffect, type ReactElement, type ReactNode } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { useAuth } from '@kidswear/auth';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';

import type { PublicTabsParamList, RootStackParamList } from './types';

import { HomeScreen } from '@/screens/HomeScreen';
import { CatalogScreen } from '@/screens/CatalogScreen';
import { CartScreen } from '@/screens/CartScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { CheckoutSuccessScreen } from '@/screens/CheckoutSuccessScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { OrderDetailScreen } from '@/screens/OrderDetailScreen';
import { PrivacyScreen } from '@/screens/PrivacyScreen';
import { TermsScreen } from '@/screens/TermsScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { AdminHomeScreen } from '@/screens/admin/AdminHomeScreen';
import { AdminProductsScreen } from '@/screens/admin/AdminProductsScreen';
import { AdminCategoriesScreen } from '@/screens/admin/AdminCategoriesScreen';
import { AdminOrdersScreen } from '@/screens/admin/AdminOrdersScreen';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: string; size: number }): ReactElement => (
    <MaterialCommunityIcons name={name} color={color} size={size} />
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<PublicTabsParamList>();

// React Navigation v7 global typing: registering the root navigator here makes
// useNavigation()/navigationRef fully typed app-wide (replaces the v6-era
// RootParamList interface augmentation, which now collides with core's types).
type RootStackNavigatorType = typeof Stack;
declare module '@react-navigation/core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface RootNavigator extends RootStackNavigatorType {}
}

/** Public bottom-tab navigation: Home, Catalog, Cart, Profile. */
function PublicTabsNavigator(): ReactElement {
  const theme = useTheme();
  const { t } = useTranslation();
  const cartCount = useAppSelector((s) =>
    s.cart.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('nav.home'), tabBarIcon: tabIcon('home-variant') }}
      />
      <Tab.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{ title: t('nav.catalog'), tabBarIcon: tabIcon('shopping-search') }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: t('nav.cart'),
          tabBarIcon: tabIcon('cart-outline'),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('nav.profile'), tabBarIcon: tabIcon('account-circle-outline') }}
      />
    </Tab.Navigator>
  );
}

/**
 * Gates the wrapped admin screen on the admin custom claim, mirroring the
 * previous `app/admin/_layout.tsx` Redirect semantics: while auth status is
 * still resolving ("idle") the screen renders as-is; once resolved,
 * unauthenticated users are sent to Login and non-admins to the Tabs root.
 */
function AdminGate({ children }: { children: ReactNode }): ReactElement | null {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { status, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (status === 'idle') return;
    if (!isAuthenticated) {
      navigation.navigate('Login');
    } else if (!isAdmin) {
      navigation.navigate('Tabs');
    }
  }, [status, isAuthenticated, isAdmin, navigation]);

  if (status !== 'idle' && (!isAuthenticated || !isAdmin)) {
    return null;
  }

  return <>{children}</>;
}

/** Root native-stack navigator: tabs + all modal/detail/auth/admin screens. */
export function RootNavigator(): ReactElement {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={PublicTabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: '' }} />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: t('cart.checkout') }}
      />
      <Stack.Screen
        name="CheckoutSuccess"
        component={CheckoutSuccessScreen}
        options={{ title: t('checkout.orderPlaced') }}
      />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: t('orders.myOrders') }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: t('legal.privacyTitle') }} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{ title: t('legal.termsTitle') }} />

      <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('auth.login.title') }} />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: t('auth.register.title') }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: t('auth.forgot.title') }}
      />

      <Stack.Screen name="AdminHome" options={{ title: t('admin.dashboard') }}>
        {() => (
          <AdminGate>
            <AdminHomeScreen />
          </AdminGate>
        )}
      </Stack.Screen>
      <Stack.Screen name="AdminProducts" options={{ title: t('admin.products') }}>
        {() => (
          <AdminGate>
            <AdminProductsScreen />
          </AdminGate>
        )}
      </Stack.Screen>
      <Stack.Screen name="AdminCategories" options={{ title: t('admin.categories') }}>
        {() => (
          <AdminGate>
            <AdminCategoriesScreen />
          </AdminGate>
        )}
      </Stack.Screen>
      <Stack.Screen name="AdminOrders" options={{ title: t('admin.orders') }}>
        {() => (
          <AdminGate>
            <AdminOrdersScreen />
          </AdminGate>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
