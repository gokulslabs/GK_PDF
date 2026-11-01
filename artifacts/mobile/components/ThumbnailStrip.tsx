import React, { useEffect, useRef } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

const THUMB_W = 54;
const THUMB_H = 72;
const ITEM_W = THUMB_W + 16;
const STRIP_HEIGHT = 108;

interface Props {
  thumbnails: Record<number, string>;
  totalPages: number;
  currentPage: number;
  visible: boolean;
  onPageSelect: (page: number) => void;
}

export default function ThumbnailStrip({
  thumbnails,
  totalPages,
  currentPage,
  visible,
  onPageSelect,
}: Props) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const translateY = useSharedValue(STRIP_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : STRIP_HEIGHT, { duration: 260 });
  }, [visible]);

  useEffect(() => {
    if (!visible || totalPages === 0) return;
    const offset = Math.max(0, (currentPage - 1) * ITEM_W - 80);
    scrollRef.current?.scrollTo({ x: offset, animated: true });
  }, [currentPage, visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.primary + "30",
          borderTopWidth: 1,
        },
        animStyle,
      ]}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        decelerationRate="fast"
      >
        {pages.map((page) => {
          const isActive = page === currentPage;
          const thumb = thumbnails[page];
          return (
            <TouchableOpacity
              key={page}
              onPress={() => onPageSelect(page)}
              style={styles.item}
              activeOpacity={0.72}
            >
              <View
                style={[
                  styles.thumbWrap,
                  {
                    borderColor: isActive ? colors.primary : colors.border,
                    borderWidth: isActive ? 2 : StyleSheet.hairlineWidth,
                    backgroundColor: colors.muted,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isActive ? 0.6 : 0,
                    shadowRadius: isActive ? 8 : 0,
                    elevation: isActive ? 4 : 0,
                  },
                ]}
              >
                {thumb ? (
                  <Image
                    source={{ uri: thumb }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholder}>
                    <Text
                      style={[
                        styles.placeholderText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {page}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.pageNum,
                  {
                    color: isActive ? colors.primary : colors.mutedForeground,
                    fontWeight: isActive ? "600" : "400",
                  },
                ]}
              >
                {page}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: STRIP_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  scroll: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 6,
    alignItems: "center",
  },
  item: {
    width: ITEM_W,
    alignItems: "center",
    gap: 5,
  },
  thumbWrap: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 4,
    overflow: "hidden",
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 11,
  },
  pageNum: {
    fontSize: 11,
  },
});
