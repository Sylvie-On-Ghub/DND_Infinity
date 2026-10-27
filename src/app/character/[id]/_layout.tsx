import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { CharacterHeader } from "@/components/CharacterHeader";
import { PageDropdown } from "@/components/PageDropdown";
import { C } from "@/lib/colors";
import { pageAnimation, usePageNav } from "@/lib/usePageNav";

// How far, or how fast, a swipe has to go to change page.
const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 600;

export default function CharacterLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = usePageNav(id);
  // The gesture callback can outlive a render, so read the latest page from a ref.
  const navRef = useRef(nav);
  useEffect(() => {
    navRef.current = nav;
  });

  // Only clearly horizontal drags count, so vertical scrolling is unaffected.
  const swipe = usePanGesture({
    activeOffsetX: [-20, 20],
    failOffsetY: [-15, 15],
    runOnJS: true,
    onDeactivate: (e) => {
      if (e.canceled) return;
      const { index, goTo } = navRef.current;
      if (e.translationX < -SWIPE_DISTANCE || e.velocityX < -SWIPE_VELOCITY) goTo(index + 1);
      else if (e.translationX > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY) goTo(index - 1);
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <CharacterHeader id={id} />
      <PageDropdown id={id} />
      <GestureDetector gesture={swipe}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={() => ({
              headerShown: false,
              animation: pageAnimation(),
              contentStyle: { backgroundColor: C.bg },
            })}
          />
        </View>
      </GestureDetector>
    </View>
  );
}
