import { Platform, Vibration } from "react-native";

export const ImpactFeedbackStyle = {
  Light: "light",
  Medium: "medium",
  Heavy: "heavy",
} as const;

export const NotificationFeedbackType = {
  Success: "success",
  Warning: "warning",
  Error: "error",
} as const;

export function impactAsync(style: string = ImpactFeedbackStyle.Light): void {
  if (Platform.OS === "web") return;
  const duration = style === "heavy" ? 30 : style === "medium" ? 18 : 10;
  try {
    Vibration.vibrate(duration);
  } catch {
    // A missing vibrator must not close the screen that just finished work.
  }
}

export function notificationAsync(
  type: string = NotificationFeedbackType.Success
): void {
  if (Platform.OS === "web") return;
  try {
    if (type === NotificationFeedbackType.Warning || type === NotificationFeedbackType.Error) {
      Vibration.vibrate([0, 20, 50, 20]);
      return;
    }
    Vibration.vibrate(15);
  } catch {
    // A missing vibrator must not close the screen that just finished work.
  }
}
