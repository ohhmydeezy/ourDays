import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ShareSettingsScreen() {
  const [shareCode, setShareCode] = useState("");
  const [error, setError] = useState("");
  const { linkAccount } = useAuth();
  const theme = useTheme();

  const handleSubmit = async () => {
    if (!shareCode) return;
    try {
      const result = await linkAccount(shareCode);
      if (result) {
        setError(result);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setError("Failed to submit Share Code");
    }
    setError("");
    alert("Account linked successfully!");
    router.back();
  };

  return (
    <SafeAreaView edges={[ "bottom"]} style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={32}
            color="#1f1f1fff"
          />
        </TouchableOpacity>
        <View style={styles.header}>
          <Text style={[styles.headerText, { color: "white", padding: 8, fontWeight: "bold" }]}>
            Calender Sync
          </Text>
        </View>
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
        <Button mode="contained" textColor="#000" onPress={handleSubmit} disabled={!shareCode}>
          Sync Calender
        </Button>

        {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}
      </View>
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
    alignItems: "center",
    flexDirection: "row"
  },
  header: {
    backgroundColor: "#555555",
    paddingHorizontal: 24,
    borderRadius: 50,
  },
  headerText: {
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
    padding: 15,
    marginRight: 28,
    alignItems: "flex-start",
    color: "#000",
  },
});
