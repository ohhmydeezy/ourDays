import { account } from "@/lib/appwrite";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTheme, Text, TextInput, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPassword() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    setError("");
    if (!email) {
      setError("Please enter your Email");
      return;
    }

    setLoading(true);
    try {
      await account.createRecovery({
        email,
        url: "ourdays://reset-password",
      });
      setSuccess(true);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View>
        <Text variant="headlineMedium">Check your Email</Text>
        <Text style={{ marginTop: 12 }}>
          If an account exists for {email}, we&apos;ve sent a password reset
          link.
        </Text>
        <Button
          style={{ marginTop: 24 }}
          mode="contained"
          onPress={() => router.replace("/(auth)/login")}
        >
          Back to Sign In
        </Button>
      </View>
    );
  }

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
              style={{ width: "80%", maxHeight: 200 }}
              resizeMode="contain"
            />
          </View>
          <View style={styles.content}>
            <Text style={styles.title} variant="headlineMedium">
              Forgot Password
            </Text>
            <Text style={{ marginTop: 8, marginBottom: 16 }}>
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </Text>
            <TextInput
              style={styles.input}
              onChangeText={setEmail}
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="example@gmail.com"
              mode="flat"
            />

            {error && (
              <Text style={{ color: theme.colors.error }}>{error}</Text>
            )}

            <Button
              style={{ marginTop: 16 }}
              mode="contained"
              onPress={handleRequestReset}
              loading={loading}
              disabled={loading}
            >
              Send Reset Link
            </Button>

            <Button style={{ marginTop: 8 }} onPress={() => router.back()}>
              Back to Sign In
            </Button>
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
