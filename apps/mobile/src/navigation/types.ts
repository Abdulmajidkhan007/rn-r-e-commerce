import type { NavigatorScreenParams } from '@react-navigation/native';

/** Bottom-tab param list: Home, Catalog, Cart, Profile. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- React Navigation param lists must be type aliases (implicit index signature)
export type PublicTabsParamList = {
  Home: undefined;
  Catalog: undefined;
  Cart: undefined;
  Profile: undefined;
};

/** Root stack param list — everything reachable from the app's single native stack. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- React Navigation param lists must be type aliases (implicit index signature)
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<PublicTabsParamList> | undefined;
  ProductDetail: { id: string };
  Checkout: undefined;
  CheckoutSuccess: { orderId: string } | undefined;
  Orders: undefined;
  OrderDetail: { id: string };
  Privacy: undefined;
  Terms: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  AdminHome: undefined;
  AdminProducts: undefined;
  AdminCategories: undefined;
  AdminOrders: undefined;
};


