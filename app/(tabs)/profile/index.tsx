import { account } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, connectedUser,signOut, refreshUser } = useAuth();
  const [shareCode, setShareCode] = useState<string | null>(null);


  const generateShareCode = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await account.updatePrefs({ shareCode: code });
    await refreshUser();
    setShareCode(code);
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={{ justifyContent: "center" }}>
        <View style={styles.header}>
          <Text style={{ color: "white", padding: 12, fontWeight: "bold" }}>
            Profile
          </Text>
        </View>
      </View>
      <View style={styles.profileContainer}>
        <View>
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 40,
                backgroundColor: "#7381FF",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12,
                borderWidth: 3,
              }}
            >
              <Text
                style={{ color: "white", fontSize: 24, fontWeight: "bold" }}
              >
                {user?.prefs.firstName?.[0]?.toUpperCase() || "U"}
              </Text>
            </View>
            <Text
              style={{
                textAlign: "center",
                padding: 12,
                fontWeight: "bold",
                color: "#000",
              }}
            >
              {user?.prefs.firstName} {user?.prefs.surname}
            </Text>
          </View>
          <View style={styles.shareContainer}>
            {!connectedUser && (
              <View style={{ alignItems: "center", marginVertical: 12 }}>
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "400",
                  }}
                >
                  Share Code:
                </Text>

                {!(shareCode || user?.prefs?.shareCode) ? (
                  <Button onPress={generateShareCode}>
                    Generate Share Code
                  </Button>
                ) : (
                  <Text
                    style={[
                      styles.shareCode,
                      {
                        color: "white",
                        textAlign: "center",
                        fontWeight: "bold",
                        margin: 6,
                        fontSize: 24,
                      },
                    ]}
                  >
                    {shareCode || user?.prefs?.shareCode}
                  </Text>
                )}
              </View>
            )}
            {connectedUser && (
              <View>
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "400",
                  }}
                >
                  Connected To:
                </Text>
                <Text
                  style={[
                    styles.shareCode,
                    {
                      color: "white",
                      textAlign: "center",
                      fontWeight: "bold",
                      margin: 6,
                      fontSize: 24,
                    },
                  ]}
                >
                  {connectedUser.firstName} {connectedUser.surname}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Button
          mode="text"
          textColor="#000"
          onPress={() => router.push("/profile/account-details")}
          icon={({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" color="#000" size={size} />
          )}
        >
          Account Details
        </Button>
        <Button
          mode="text"
          textColor="#000"
          onPress={() => router.push("/profile/change-password")}
          icon={({ color, size }) => (
            <MaterialCommunityIcons name="lock" color="#000" size={size} />
          )}
        >
          Change Password
        </Button>
        <Button
          mode="text"
          textColor="#000"
          onPress={() => router.push("/profile/share-settings")}
          icon={({ color, size }) => (
            <MaterialCommunityIcons name="share" color="#000" size={size} />
          )}
        >
          Share Settings
        </Button>
        <Button
          mode="text"
          textColor="#000"
          onPress={signOut}
          icon={({ color, size }) => (
            <MaterialCommunityIcons name="logout" color="#000" size={size} />
          )}
        >
          Sign Out
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    justifyContent: "center",
  },
  profileContainer: {
    marginTop: 24,
    backgroundColor: "white",
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#555555",
  },
  header: {
    backgroundColor: "#555555",
    alignItems: "center",
    borderRadius: 25,
  },
  shareContainer: {
    backgroundColor: "#7381FF",
    padding: 18,
    color: "#FFFFFF",
    borderRadius: 28,
    alignSelf: "center",
    width: 250,
  },
  shareCode: {
    fontWeight: "bold",
  },
});
