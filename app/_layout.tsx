import { AuthProvider, useAuth } from "@/lib/auth-context";
import { EventsDataProvider } from "@/lib/events-context";
import { Slot, useRouter, useSegments } from "expo-router";
import { usePushNotifications } from "@/app/hooks/usePushNotifications";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import * as SplashScreen from "expo-splash-screen";
import AnimatedSplash from "./components/animatedSplash";
import { View } from "react-native";

SplashScreen.preventAutoHideAsync();

if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
Purchases.configure({
  apiKey: process.env.EXPO_PUBLIC_REVENUE_CAT_API_KEY!,
});

export function useRevenueCat() {
  const { user, isLoadingUser } = useAuth();
  const userId = user?.$id;

  useEffect(() => {
    if (isLoadingUser) return;

    const syncIdentity = async () => {
      try {
        if (userId) {
          await Purchases.logIn(userId);
        } else {
          await Purchases.logOut();
        }
      } catch (error) {
        console.log("RevenueCat identity error:", error);
      }
    };
    syncIdentity();
  }, [userId, isLoadingUser]);
}

function AuthGate() {
  const { isLoadingUser, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  usePushNotifications();
  useRevenueCat();

  useEffect(() => {
    if (isLoadingUser) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isResetPasswordScreen = segments[1] === "reset-password";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    }

    if (user && inAuthGroup && !isResetPasswordScreen) {
      router.replace("/(tabs)");
    }
  }, [user, isLoadingUser, segments, router]);

  if (isLoadingUser) {
    return null;
  }

  return <Slot />;
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync()
      .then(() => setNativeSplashHidden(true))
      .catch((error) => {
        console.log("Splash screen error:", error);
        setNativeSplashHidden(true);
      });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <EventsDataProvider>
          <PaperProvider>
            <SafeAreaProvider>
              <View style={{ flex: 1 }}>
                <AuthGate />
                {showSplash && nativeSplashHidden && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      backgroundColor: "#eafd71",
                    }}
                  >
                    <AnimatedSplash onFinish={() => setShowSplash(false)} />
                  </View>
                )}
              </View>
            </SafeAreaProvider>
          </PaperProvider>
        </EventsDataProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
