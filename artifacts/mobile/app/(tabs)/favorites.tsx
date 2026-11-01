import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import FileCard from "@/components/FileCard";
import { useLibrary } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";
import type { RootStackParamList } from "@/navigation/types";
import { PDFFile } from "@/types/pdf";

export default function FavoritesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { files, toggleFavorite } = useLibrary();

  const favorites = files.filter((f) => f.isFavorite);

  function handlePress(file: PDFFile) {
    navigation.navigate("Viewer", { id: file.id });
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const btmPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Favorites
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 4, paddingBottom: btmPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {favorites.length === 0 ? (
          <EmptyState
            icon="bookmark"
            title="No favorites yet"
            subtitle="Bookmark any PDF from the viewer to find it here"
          />
        ) : (
          favorites.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onPress={() => handlePress(file)}
              onLongPress={() => toggleFavorite(file.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
});
