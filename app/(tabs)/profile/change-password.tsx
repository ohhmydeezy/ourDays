import { account } from "../../../lib/appwrite";
import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { validatePassword } from "@/lib/auth-context";
import LoadingOverlay from "@/app/components/LoadingOverlay";

export default function ChangePasswordScreen() {
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Just a moment..")
  const theme = useTheme();

  const handlePasswordChange = async () => {
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return setError("All fields are required");
    }
    
    const passwordError = validatePassword(newPassword)
    if(passwordError){
      return passwordError
    }

    if (newPassword !== confirmPassword) {
      return setError("New password and confirmation do not match");
    }
    if (newPassword === currentPassword) {
      return setError("New password cannot be the same as current passwword");
    }

    setLoadingMessage("Changing Password")
    setIsLoading(true);

    try {
      await account.updatePassword(newPassword, currentPassword);
      setSuccess("Password Changed!");
      setConfirmPassword("");
      setNewPassword("");
      setCurrentPassword("");
      setTimeout(() => router.back(), 1500);
    } catch (error) {
      console.error("Password update failed:", error);
      setError("Failed To Change Password, Please check your current password");
    } finally {
      setIsLoading(false);
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
          <Text style={styles.headerText}>Change Password</Text>
        </View>

        <View style={styles.sideContainer} />
      </View>
      <View style={styles.passwordContainer}>
        <TextInput
          label="Current Password"
          mode="flat"
          textColor="#000"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          label="New Password (min 8 chars)"
          mode="flat"
          textColor="#000"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          label="Confirm New Password"
          mode="flat"
          textColor="#000"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        {error && (
          <Text style={[styles.message, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}
        {success && (
          <Text style={[styles.message, { color: theme.colors.primary }]}>
            {success}
          </Text>
        )}

        <Button
          mode="contained"
          onPress={handlePasswordChange}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Update Password
        </Button>
      </View>
            <LoadingOverlay visible={isLoading} message={loadingMessage} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "white",
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    position: "relative",
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
  backButton: {
    padding: 12,
  },
  sideContainer: {
    width: 56,
    justifyContent: "center",
    alignItems: "flex-start",
    marginRight: 36,
  },
  button: {
    marginTop: 20,
    paddingVertical: 5,
  },
  message: {
    textAlign: "center",
    marginTop: 15,
    fontWeight: "bold",
  },
  passwordContainer: {
    flex: 1,
    justifyContent: "center",
  },
});
