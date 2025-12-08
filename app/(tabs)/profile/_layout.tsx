import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="account-details"
        options={{ title: "Account Details" }}
      />
      <Stack.Screen
        name="change-password"
        options={{ title: "Change Password" }}
      />
      <Stack.Screen
        name="share-settings"
        options={{ title: "Share Settings" }}
      />
    </Stack>
  );
}
