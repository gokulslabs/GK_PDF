declare module "react-native-vector-icons/Feather" {
  import { Component } from "react";
  import { TextProps } from "react-native";

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class Feather extends Component<IconProps> {
    static glyphMap: Record<string, number>;
  }
}
