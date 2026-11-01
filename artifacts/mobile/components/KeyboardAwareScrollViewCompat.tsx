import React from "react";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

export function KeyboardAwareScrollViewCompat({
  children,
  ...props
}: ScrollViewProps) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      {...props}
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
    >
      {children}
    </ScrollView>
  );
}
