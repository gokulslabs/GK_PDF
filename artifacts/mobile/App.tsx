import { NavigationContainer, DarkTheme, DefaultTheme, Theme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import palette from "@/constants/colors";
import { LibraryProvider } from "@/context/LibraryContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { RootNavigator } from "@/navigation/RootNavigator";

const queryClient = new QueryClient();

const lightNav: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.light.primary,
    background: palette.light.background,
    card: palette.light.card,
    text: palette.light.foreground,
    border: palette.light.border,
    notification: palette.light.primary,
  },
};

const darkNav: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.dark.primary,
    background: palette.dark.background,
    card: palette.dark.card,
    text: palette.dark.foreground,
    border: palette.dark.border,
    notification: palette.dark.primary,
  },
};

function Navigation() {
  const { isDark } = useTheme();
  return (
    <NavigationContainer theme={isDark ? darkNav : lightNav}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LibraryProvider>
              <GestureHandlerRootView style={styles.root}>
                <Navigation />
              </GestureHandlerRootView>
            </LibraryProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
