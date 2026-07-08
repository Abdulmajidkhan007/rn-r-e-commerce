// react-native-vector-icons ships Flow types, not TypeScript. This ambient
// module declaration covers the subset of icon sets used in this app.
declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import type { Component } from 'react';
  import type { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class MaterialCommunityIcon extends Component<IconProps> {}
}
