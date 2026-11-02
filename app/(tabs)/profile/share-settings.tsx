import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LoadingOverlay from "@/app/components/LoadingOverlay";

export default function ShareSettingsScreen() {
  const [shareCode, setShareCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Just a moment...");
  const { linkAccount } = useAuth();
  const theme = useTheme();

  const handleSubmit = async () => {
    if (!shareCode) return;

    setLoadingMessage("Linking you to your Partner...");
    setIsLoading(true);

    try {
      const result = await linkAccount(shareCode);
      if (result) {
        setError(result);
        return;
      }

    } catch (error) {
      console.error("Error connecting accounts: ", error)
      setError("Failed to submit Share Code");
      setIsLoading(false);
    } finally {
      setError("");
      alert("Account linked successfully!");
      setIsLoading(false);
      router.back();
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.sideContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={32}
              color="#1f1f1f"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.headerText}>Share Settings</Text>
        </View>

        <View style={styles.sideContainer} />
      </View>

      <View style={styles.shareContainer}>
        <Text
          style={{
            justifyContent: "center",
            fontWeight: "semibold",
            color: "#000",
            textAlign: "center",
          }}
        >
          To link calender&apos;s enter Share Code
        </Text>
        <TextInput
          label="Share Code"
          mode="flat"
          textColor="#000"
          value={shareCode}
          onChangeText={setShareCode}
          style={styles.input}
        />
        <Button
          mode="contained"
          textColor="#000"
          onPress={handleSubmit}
          disabled={!shareCode}
        >
          Sync Calender
        </Button>

        {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}
      </View>
      <LoadingOverlay visible={isLoading} message={loadingMessage} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    position: "relative",
  },
  sideContainer: {
    width: 56,
    justifyContent: "center",
    alignItems: "flex-start",
    marginRight: 36,
  },
  header: {
    backgroundColor: "#555555",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 50,
  },
  headerText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
  },
  shareContainer: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  backButton: {
    padding: 12,
  },
});
