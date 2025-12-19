import { AuthProvider, useAuth } from "@/lib/auth-context";
import { EventsDataProvider } from "@/lib/events-context";
import { Slot, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  function AuthGate() {
    const { isLoadingUser, user } = useAuth();
    const segments = useSegments();
    const router = useRouter()

      useEffect(() => {
        if (isLoadingUser) return;

        const inAuthGroup = segments[0] === "(auth)";

        if (!user && !inAuthGroup) {
          router.replace("/(auth)/login");
        }

        if (user && inAuthGroup) {
          router.replace("/(tabs)");
        }

      }, [user, isLoadingUser, segments, router]);

    if (isLoadingUser) {
      return null; 
    }

    return <Slot />;
  }
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <EventsDataProvider>
          <PaperProvider>
            <SafeAreaProvider>
              <AuthGate />
            </SafeAreaProvider>
          </PaperProvider>
        </EventsDataProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
