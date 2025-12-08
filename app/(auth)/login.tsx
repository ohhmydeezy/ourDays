import { useAuth } from "../../lib/auth-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { ScrollView } from "react-native-gesture-handler";

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");
  const [error, setError] = useState<string | null>("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [isLoading, setIsLoading] = useState(false)

  const theme = useTheme();
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if(isLoading) return

    setIsLoading(true)
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setError(null);
    if (isSignUp) {
      const error = await signUp(
        email,
        password,
        passwordConfirm,
        firstName,
        surname
      );
      if (error) {
        setError(error);
        return;
      }
      router.replace("/");
      return;
    } else {
      const error = await signIn(email, password);
      if (error) {
        setError(error);
        return;
      }
      router.replace("/");
      setIsLoading(false)
    }
  };

  const handleSwitchMode = () => {
    setIsSignUp((prev) => !prev);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: !isSignUp ? "#ECFF73" : "#84E2FF" }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          styles.container,
          { backgroundColor: !isSignUp ? "#ECFF73" : "#84E2FF" },
        ]}
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
              {isSignUp ? "Register" : "Sign In"}
            </Text>

            <TextInput
              style={styles.input}
              onChangeText={setEmail}
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="example@gmail.com"
              mode="flat"
              theme={{
                colors: {
                  primary: "blue",
                },
              }}
            ></TextInput>

            <TextInput
              style={styles.input}
              onChangeText={setPassword}
              label="Password"
              autoCapitalize="none"
              secureTextEntry
              textContentType="oneTimeCode"
              placeholder="Password"
              mode="flat"
              theme={{
                colors: {
                  primary: "blue",
                },
              }}
            ></TextInput>
            {isSignUp && (
              <>
                <TextInput
                  style={styles.input}
                  onChangeText={setPasswordConfirm}
                  label="Confirm Password"
                  autoCapitalize="none"
                  secureTextEntry
                  textContentType="oneTimeCode"
                  placeholder="Confirm Password"
                  mode="flat"
                  theme={{
                    colors: {
                      primary: "blue",
                      background: "transparent",
                    },
                  }}
                />
                <TextInput
                  style={styles.input}
                  onChangeText={setFirstName}
                  label="First Name"
                  autoCapitalize="none"
                  placeholder="First Name"
                  mode="flat"
                  theme={{
                    colors: {
                      primary: "blue",
                      background: "transparent",
                    },
                  }}
                />
                <TextInput
                  style={styles.input}
                  onChangeText={setSurname}
                  label="Surname"
                  autoCapitalize="none"
                  placeholder="Surname"
                  mode="flat"
                  theme={{
                    colors: {
                      primary: "blue",
                      background: "transparent",
                    },
                  }}
                />
              </>
            )}

            {error && (
              <Text style={{ color: theme.colors.error }}>{error}</Text>
            )}

            <Button style={styles.button} onPress={handleAuth} mode="contained">
              {isSignUp ? "Sign Up" : "Sign In"}
            </Button>
            <Button style={styles.switchButton} onPress={handleSwitchMode}>
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't Have an account? Register"}
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
  },
  homeLogo: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  content: {
    flex: 0.5,
    padding: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
  },
  button: {
    marginTop: 8,
    backgroundColor: "black",
  },
  switchButton: {
    marginTop: 16,
  },
});
