import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";
import { C } from "@/lib/colors";

// React Native text defaults to black, which disappears on the dark palette.
// These start from the palette colours; a style passed in still wins.

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[{ color: C.text }, style]} />;
}

export function TextInput({ style, placeholderTextColor, ...props }: TextInputProps) {
  return (
    <RNTextInput
      {...props}
      placeholderTextColor={placeholderTextColor ?? C.placeholder}
      selectionColor={props.selectionColor ?? C.accent}
      style={[{ color: C.text }, style]}
    />
  );
}
