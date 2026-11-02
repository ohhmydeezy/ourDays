import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native-gesture-handler";
import {
  account,
  DATABASE_ID,
  databases,
  USER_COLLECTION_ID,
} from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import LoadingOverlay from "@/app/components/LoadingOverlay";

export default function AccountDetailsScreen() {
  const { user, connectedUser, refreshUser, unlinkAccount } = useAuth();
  const [firstName, setFirstName] = useState(user?.prefs.firstName);
  const [surname, setSurname] = useState(user?.prefs.surname);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Just a moment..");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const theme = useTheme();

  const generateShareCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const refreshShareCode = async () => {
    if (!user || isLoading) return;

    setLoadingMessage("Generating a new share code...");
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const newCode = generateShareCode();

      const userDocs = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION_ID,
        [Query.equal("userId", user.$id)],
      );

      if (!userDocs.documents.length) {
        throw new Error("User profile document not found.");
      }
      const currentUserDoc = userDocs.documents[0];

      await databases.updateDocument(
        DATABASE_ID,
        USER_COLLECTION_ID,
        currentUserDoc.$id,
        {
          isConnected: false,
          connectedTo: "",
        },
      );

      const currentPrefs = await account.getPrefs();
      const newPrefs = {
        ...currentPrefs,
        shareCode: newCode,
        isConnected: false,
        connectedTo: "",
      };
      await account.updatePrefs(newPrefs);

      await refreshUser();
      setSuccess("Share code updated!");
    } catch (error) {
      console.error("Error refreshing shareCode:", error);
      setError("Problem refreshing shareCode");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || isLoading) return;

    const newFirstName = firstName?.trim();
    const newSurname = surname?.trim();

    if (!newFirstName || !newSurname) {
      setError("First and Last Name cannot be empty");
      return;
    }

    setLoadingMessage("Saving your changes...");
    setIsLoading(true);
    setError("");

    try {
      const userDocs = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION_ID,
        [Query.equal("userId", user.$id)],
      );

      if (!userDocs.documents.length) {
        throw new Error("User profile document not found in the database.");
      }

      const profileDocumentId = userDocs.documents[0].$id;

      await databases.updateDocument(
        DATABASE_ID,
        USER_COLLECTION_ID,
        profileDocumentId,
        {
          firstName: newFirstName,
          surname: newSurname,
        },
      );

      const currentPrefs = await account.getPrefs();
      const newPrefs = {
        ...currentPrefs,
        firstName: newFirstName,
        surname: newSurname,
      };
      await account.updatePrefs(newPrefs);
      setSuccess("Information Updated!");
      await refreshUser();

      setIsLoading(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setError("Failed to save changes. Please try again.");
      setIsLoading(false);
      return;
    }
  };

  const handleUnlink = async () => {
    if (!user || !connectedUser || !unlinkAccount || isLoading) return;

    setLoadingMessage("Unlinking your accounts...");

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await unlinkAccount(connectedUser.userId);

      if (result) {
        setError(result);
      } else {
        setSuccess(
          `Successfully unlinked from ${connectedUser.firstName} ${connectedUser.surname}.`,
        );
        setConfirmUnlink(false);
      }
    } catch (error) {
      console.error("failed to unlink account:", error);
      setError("Failed to unlink account. Please try again");
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
          <Text style={styles.headerText}>Account Details</Text>
        </View>

        <View style={styles.sideContainer} />
      </View>
      <View style={styles.info}>
        <Text style={styles.keyInfo}>Account ID: {user?.$id}</Text>
        <Text style={styles.keyInfo}>Email: {user?.email}</Text>
        <View style={{ flexDirection: "row", margin: 2 }}>
          <Text style={styles.keyInfo}>
            Share Code: {user?.prefs.shareCode}
          </Text>
          <Button
            mode="text"
            style={styles.button}
            compact={true}
            disabled={isLoading}
            onPress={() => void refreshShareCode}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={24}
              color="#1f1f1fff"
            />
          </Button>
        </View>
      </View>
      <View style={styles.inputContainer}>
        <View style={styles.inputGroup}>
          <TextInput
            label="First Name"
            textColor="#000"
            mode="flat"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            style={styles.input}
          />
          <TextInput
            label="Surname"
            mode="flat"
            textColor="#000"
            value={surname}
            onChangeText={setSurname}
            autoCapitalize="words"
            style={styles.input}
          />
        </View>

        {connectedUser && (
          <View style={styles.connectedUserContainer}>
            <Text style={styles.connectedToText}>
              Connected To: {connectedUser.firstName} {connectedUser.surname}
            </Text>

            {!confirmUnlink ? (
              // Show Unlink button
              <Button
                mode="contained"
                onPress={() => setConfirmUnlink(true)}
                disabled={isLoading}
                style={{ backgroundColor: theme.colors.error, marginTop: 8 }}
              >
                <MaterialCommunityIcons
                  name="link-off"
                  size={20}
                  color={"#ffffff"}
                />
                <Text
                  style={{
                    color: "#ffffff",
                    fontWeight: "bold",
                    marginLeft: 8,
                  }}
                >
                  Unlink Account
                </Text>
              </Button>
            ) : (
              // Show confirmation buttons
              <View style={styles.confirmationRow}>
                <Button
                  mode="outlined"
                  onPress={() => setConfirmUnlink(false)}
                  disabled={isLoading}
                  style={styles.confirmationButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleUnlink}
                  disabled={isLoading}
                  style={[
                    styles.confirmationButton,
                    { backgroundColor: theme.colors.error },
                  ]}
                >
                  Confirm Unlink
                </Button>
              </View>
            )}
          </View>
        )}
        <Button
          onPress={() => router.navigate("/(tabs)/profile/change-password")}
          loading={isLoading}
          style={styles.saveButton}
        >
          Change Password
        </Button>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={isLoading}
          disabled={isLoading || !firstName?.trim() || !surname?.trim()}
          style={styles.saveButton}
        >
          Save Changes
        </Button>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success && (
          <Text
            style={{
              color: theme.colors.primary,
              marginTop: 12,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {success}
          </Text>
        )}
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
  sideContainer: {
    width: 56,
    justifyContent: "center",
    alignItems: "flex-start",
    marginRight: 36
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
  pickerContainer: {
    backgroundColor: "white",
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: "center",
  },
  backButton: {
    padding: 12,
  },
  keyInfo: {
    fontWeight: "bold",
    padding: 4,
    color: "#000",
  },
  info: {
    textAlign: "center",
    alignItems: "center",
  },
  inputGroup: {
    padding: 16,
  },
  saveButton: {
    marginTop: 20,
    marginHorizontal: 16,
    paddingVertical: 5,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
  },
  inputContainer: {
    flex: 1,
    justifyContent: "center",
  },
  button: {
    paddingVertical: -5,
    marginVertical: -6,
  },
  connectedUserContainer: {
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: "#7c7c7cff",
    borderRadius: 12,
    marginBottom: 20,
    marginTop: 10,
  },
  connectedToText: {
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    color: "#000",
  },
  confirmationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    width: "100%",
  },
  confirmationButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});
