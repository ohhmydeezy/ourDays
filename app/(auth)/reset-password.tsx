import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, Text, TextInput, Button } from "react-native-paper";
import { useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { validatePassword } from "@/lib/auth-context";
import { account } from "@/lib/appwrite";
import { ScrollView } from "react-native-gesture-handler";

export default function ResetPassword() {
  const router = useRouter();
  const theme = useTheme();
  const { userId, secret } = useLocalSearchParams<{
    userId: string;
    secret: string;
  }>();
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    setError("");
    if (!userId || !secret) {
      setError(
        "This reset link is invalid or has expired. Please request a new one.",
      );
      return;
    } else if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setLoading(true);
    try {
      await account.updateRecovery({
        userId,
        secret,
        password,
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        return;
      } else {
        setError(
          "This reset link is invalid or has expired. Please request a new one.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#7381FF" }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: "#7381FF" }]}
      >
        <ScrollView>
          <View style={styles.homeLogo}>
            <Text style={styles.appTitle}>OurDays</Text>
            <Image
              source={require("../../assets/images/logo.png")}
              style={{ width: "80%", maxHeight: 280 }}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.title} variant="headlineMedium">
              {" "}
              Reset Password
            </Text>

            {success ? (
              <>
                <Text style={{ marginTop: 12, marginBottom: 24 }}>
                  Your password has been reset. You can now sign in with your
                  new password.
                </Text>
                <Button
                  mode="contained"
                  onPress={() => router.replace("/(auth)/login")}
                >
                  Back to Sign In
                </Button>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  onChangeText={setPassword}
                  label="New Password"
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="New Password"
                  mode="flat"
                  theme={{
                    colors: {
                      primary: "blue",
                      text: "#000",
                      onSurfaceVariant: "#000",
                      placeholder: "#000",
                    },
                  }}
                />
                <TextInput
                  style={styles.input}
                  onChangeText={setConfirmPassword}
                  label="Confirm Password"
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="Confirm Password"
                  mode="flat"
                  theme={{
                    colors: {
                      primary: "blue",
                      text: "#000",
                      onSurfaceVariant: "#000",
                      placeholder: "#000",
                    },
                  }}
                />

                {error && (
                  <Text style={{ color: theme.colors.error }}>{error}</Text>
                )}

                <Button
                  style={{ marginTop: 16 }}
                  mode="contained"
                  onPress={handlePasswordReset}
                  loading={loading}
                  disabled={loading}
                >
                  Reset Password
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appTitle: {
    marginTop: 16,
    fontWeight: "bold",
    fontSize: 32,
    alignItems: "center",
    color: "#000",
  },
  homeLogo: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 24,
    color: "#000",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    color: "#000",
  },
});
