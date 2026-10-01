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
import { Button, Text, TextInput } from "react-native-paper";
import { ScrollView } from "react-native-gesture-handler";

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");
  const [error, setError] = useState<string | null>("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!email || !password) {
        setError("Please fill in all fields");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long");
        return;
      }

      if (isSignUp) {
        const error = await signUp(
          email,
          password,
          passwordConfirm,
          firstName,
          surname,
        );
        if (error) {
          setError(error);
          return;
        }
      } else {
        const error = await signIn(email, password);
        if (error) {
          setError(error);
          return;
        }
      }

      router.replace("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchMode = () => {
    setIsSignUp((prev) => !prev);
  };

  const inputTheme = {
    colors: {
      primary: "blue",
      text: "#000",
      onSurfaceVariant: "#000",
      placeholder: "#000",
    },
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
              style={{ width: "80%", maxHeight: 280 }}
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
              textColor="#000"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="example@gmail.com"
              mode="flat"
              theme={{
                colors: {
                  primary: "blue",
                  text: "#000",
                  onSurfaceVariant: "#000",
                  placeholder: "#000",
                },
              }}
            ></TextInput>

            <TextInput
              style={styles.input}
              onChangeText={setPassword}
              label="Password"
              textColor="#000"
              autoCapitalize="none"
              secureTextEntry
              placeholder="Password"
              mode="flat"
              theme={inputTheme}
            ></TextInput>

            {isSignUp && (
              <>
                <TextInput
                  style={styles.input}
                  onChangeText={setPasswordConfirm}
                  label="Confirm Password"
                  textColor="#000"
                  autoCapitalize="none"
                  secureTextEntry
                  textContentType="oneTimeCode"
                  placeholder="Confirm Password"
                  mode="flat"
                  theme={inputTheme}
                />
                <TextInput
                  style={styles.input}
                  onChangeText={setFirstName}
                  label="First Name"
                  textColor="#000"
                  autoCapitalize="none"
                  placeholder="First Name"
                  mode="flat"
                  theme={inputTheme}
                />
                <TextInput
                  style={styles.input}
                  onChangeText={setSurname}
                  label="Surname"
                  textColor="#000"
                  autoCapitalize="none"
                  placeholder="Surname"
                  mode="flat"
                  theme={inputTheme}
                />
              </>
            )}

            {error && <Text style={{ color: "red", textAlign: "center" }}>{error}</Text>}

            <Button
              textColor="#cdcdcd"
              style={styles.button}
              onPress={handleAuth}
              mode="contained"
            >
              {isSignUp ? "Sign Up" : "Sign In"}
            </Button>

            {!isSignUp && (
              <Button
                textColor="#cdcdcd"
                style={styles.button}
                onPress={() => router.push("/forgot-password")}
              >
                Forgot password?
              </Button>
            )}

            <Button
              textColor="#000"
              style={styles.switchButton}
              onPress={handleSwitchMode}
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Register"}
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
    fontWeight: "bold",
    fontSize: 32,
    alignItems: "center",
    color: "#000",
  },
  homeLogo: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 0.5,
    padding: 24,
  },
  title: {
    textAlign: "center",
    marginBottom: 6,
    color: "#000",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    color: "#000",
  },
  button: {
    marginTop: 8,
    backgroundColor: "black",
  },
  forgotButton: {
    marginTop: 8,
    backgroundColor: "black",
  },
  switchButton: {
    marginTop: 8,
    color: "#000",
  },
});
