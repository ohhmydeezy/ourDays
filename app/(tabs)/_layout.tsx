import { Redirect, Tabs, useSegments } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { View } from "react-native";
import { useEventsData } from "@/lib/events-context";

export default function TabsLayout() {
  const { user, isLoadingUser } = useAuth();
  const segments = useSegments();


    if (isLoadingUser) return;

    const inAuthGroup = segments[0] === "(auth)";

  if (!user && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user && inAuthGroup) {
    return <Redirect href="/" />;
  }

  
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "white" },
        headerShadowVisible: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 20,
          right: 20,
          height: 50,
          borderRadius: 20,
          backgroundColor: "#ffffff",
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 2,
          borderTopWidth: 2,
          borderStartWidth: 2,
          borderEndWidth: 2,
          borderColor: "#000",
          paddingBottom: 60,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#222222ff",
        tabBarInactiveTintColor: "#666666",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{ alignItems: "center" }}>
              <MaterialCommunityIcons
                name="calendar-today"
                size={size}
                color={color}
              />
              {focused && (
                <View
                  style={{
                    marginTop: 4,
                    height: 3,
                    width: 20,
                    backgroundColor: "#000",
                    borderRadius: 2,
                  }}
                />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{ alignItems: "center" }}>
              <MaterialCommunityIcons
                name="account-outline"
                size={size}
                color={color}
              />
              {focused && (
                <View
                  style={{
                    marginTop: 4,
                    height: 3,
                    width: 20,
                    backgroundColor: "#000",
                    borderRadius: 2,
                  }}
                />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="add-event"
        options={{
          title: "Add Event",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{ alignItems: "center" }}>
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={size}
                color={color}
              />
              {focused && (
                <View
                  style={{
                    marginTop: 4,
                    height: 3,
                    width: 20,
                    backgroundColor: "#000",
                    borderRadius: 2,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ focused, color, size }) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const { pendingEvents } = useEventsData();
            const hasNotifications = pendingEvents.length > 0;

            return (
              <View style={{ alignItems: "center" }}>
                <MaterialCommunityIcons name="bell" size={size} color={color} />

                {/* small red dot */}
                {hasNotifications && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      right: -6, // adjust to position dot
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "red",
                    }}
                  />
                )}

                {/* underline when focused */}
                {focused && (
                  <View
                    style={{
                      marginTop: 4,
                      height: 3,
                      width: 20,
                      backgroundColor: "#000",
                      borderRadius: 2,
                    }}
                  />
                )}
              </View>
            );
          },
        }}
      />

      <Tabs.Screen
        name="concierge"
        options={{
          title: "AI Assistant",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{ alignItems: "center" }}>
              <MaterialCommunityIcons name="robot" size={size} color={color} />
              {focused && (
                <View
                  style={{
                    marginTop: 4,
                    height: 3,
                    width: 20,
                    backgroundColor: "#000",
                    borderRadius: 2,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
