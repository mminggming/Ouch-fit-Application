import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth screens (no tab bar) */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* Main tab layout */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
