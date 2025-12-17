import {
  DATABASE_ID,
  databases,
  EVENTS_ID,
  USER_COLLECTION_ID,
} from "../../lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import {
  Button,
  Text,
  TextInput,
  useTheme,
  Checkbox,
} from "react-native-paper";
import { ID, Query } from "react-native-appwrite";
import { router } from "expo-router";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEventsData } from "@/lib/events-context";
import {
  NATIVE_NOTIFY_APP_ID,
  NATIVE_NOTIFY_APP_TOKEN,
} from "@/lib/native-notify";
import { ScrollView } from "react-native-gesture-handler";

export default function AddEventScreen() {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState("");
  const [jointEvent, setJointEvent] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { user, connectedUser } = useAuth();
  const { fetchMyEvents, fetchPartnerEvents } = useEventsData();
  const theme = useTheme();

  const isPartnerAvailable = useMemo(
    () => !!connectedUser?.userId,
    [connectedUser?.userId]
  );

const sendPushNotification = async (
  recipientSubId: string,
  eventTitle: string,
  senderName: string
) => {
  try {
    const response = await fetch(
      "https://app.nativenotify.com/api/indie/notification",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: NATIVE_NOTIFY_APP_ID,
          appToken: NATIVE_NOTIFY_APP_TOKEN,
          subID: recipientSubId,
          title: "You Have An Invite!",
          message: `${senderName} invited you to: ${eventTitle}. Status: Pending.`,
        }),
      }
    );

    const text = await response.text();
    console.log("Native Notify response (text):", text);

    if (!response.ok) {
      console.error("Native Notify error:", response.status, text);
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    console.log("Push sent:", data);
  } catch (err) {
    console.error("Push request failed:", err);
  }
};



  const handleSubmit = async () => {
    if (!user) return setError("Unauthenticated User");
    if (isSubmitted) return;

    setError("");
    setSuccess("");
    setIsSubmitted(true);

    const documentData: any = {
      userId: user.$id,
      title,
      details,
      location,
      date: dateTime.toISOString(),
      time: dateTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      jointEvent,
      status: jointEvent ? "pending" : "confirmed",
    };

    try {
      // If joint event, attach recipientId and send push
      if (jointEvent && connectedUser?.userId) {
        documentData.recipientId = connectedUser.userId;

        const res = await databases.listDocuments(
          DATABASE_ID,
          USER_COLLECTION_ID,
          [Query.equal("userId", connectedUser.userId)]
        );

        if (res.documents.length) {
          const recipientDoc = res.documents[0];
          const subID = recipientDoc.nativeNotifyToken;
          if (subID) {
            await sendPushNotification(
              subID,
              title,
              user.prefs?.firstName || user.email
            );
          }
        }
      }

      await databases.createDocument(
        DATABASE_ID,
        EVENTS_ID,
        ID.unique(),
        documentData
      );

      await fetchMyEvents();
      if (connectedUser?.userId) await fetchPartnerEvents();

      setTitle("");
      setDetails("");
      setLocation("");
      setDateTime(new Date());
      setSuccess("Event successfully created!");
      setTimeout(() => router.back(), 1000);
    } catch (err) {
      console.error("Error creating event:", err);
      setError(err instanceof Error ? err.message : "Error creating Event");
    } finally {
      setIsSubmitted(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={{ color: "white", padding: 12 }}>New Event</Text>
            </View>

            <View style={styles.formContainer}>
              {/* Date Picker */}
              <Button textColor="#000" onPress={() => setShowDatePicker(true)}>
                Select Date
              </Button>
              <Text style={styles.text}>{dateTime.toDateString()}</Text>
              <Modal visible={showDatePicker} transparent animationType="slide">
                <View style={styles.pickerContainer}>
                  <RNDateTimePicker
                    mode="date"
                    value={dateTime}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    themeVariant="light"
                    onChange={(e, selectedDate) =>
                      selectedDate &&
                      setDateTime(
                        (prev) =>
                          new Date(
                            selectedDate.getFullYear(),
                            selectedDate.getMonth(),
                            selectedDate.getDate(),
                            prev.getHours(),
                            prev.getMinutes()
                          )
                      )
                    }
                  />
                  <Button
                    textColor="#000"
                    onPress={() => setShowDatePicker(false)}
                  >
                    Confirm
                  </Button>
                  <Button
                    textColor="#000"
                    onPress={() => setShowDatePicker(false)}
                  >
                    Cancel
                  </Button>
                </View>
              </Modal>

              {/* Time Picker */}
              <Button textColor="#000" onPress={() => setShowTimePicker(true)}>
                Select Time
              </Button>
              <Text style={styles.text}>
                {dateTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
              <Modal visible={showTimePicker} transparent animationType="slide">
                <View style={styles.pickerContainer}>
                  <RNDateTimePicker
                    mode="time"
                    value={dateTime}
                    themeVariant="light"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(e, selectedDate) =>
                      selectedDate &&
                      setDateTime(
                        (prev) =>
                          new Date(
                            prev.getFullYear(),
                            prev.getMonth(),
                            prev.getDate(),
                            selectedDate.getHours(),
                            selectedDate.getMinutes()
                          )
                      )
                    }
                  />
                  <Button
                    textColor="#000"
                    onPress={() => setShowTimePicker(false)}
                  >
                    Confirm
                  </Button>
                  <Button
                    textColor="#000"
                    onPress={() => setShowTimePicker(false)}
                  >
                    Cancel
                  </Button>
                </View>
              </Modal>

              {/* Inputs */}
              <TextInput
                label="Title"
                textColor="#000"
                mode="flat"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
              />
              <TextInput
                label="Location"
                textColor="#000"
                mode="flat"
                value={location}
                onChangeText={setLocation}
                style={styles.input}
              />
              <TextInput
                label="Details"
                textColor="#000"
                mode="flat"
                value={details}
                onChangeText={setDetails}
                style={styles.input}
              />

              {/* Joint Event Checkbox */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ margin: 24, fontWeight: "bold", color: "#000" }}>
                  Is this time with your partner?
                </Text>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setJointEvent(!jointEvent)}
                  disabled={!isPartnerAvailable}
                >
                  <Checkbox
                    status={jointEvent ? "checked" : "unchecked"}
                    onPress={() => setJointEvent(!jointEvent)}
                    color="#6200ee"
                    uncheckedColor="#999"
                    disabled={!isPartnerAvailable}
                  />
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={!title}
                style={{ marginTop: 24 }}
              >
                Create
              </Button>

              {error && (
                <Text
                  style={{
                    color: theme.colors.error,
                    fontWeight: "bold",
                    marginTop: 12,
                  }}
                >
                  {error}
                </Text>
              )}
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
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#EEEEEE",
    justifyContent: "center",
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 20,
    padding: 20,
    width: "100%",
    borderStartStartRadius: 25,
    borderStartEndRadius: 25,
    borderWidth: 2,
    borderColor: "#AEAEAE",
  },
  header: {
    backgroundColor: "#555555",
    alignItems: "center",
    borderRadius: 25,
    marginBottom: 20,
    marginTop: 10,
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
  checkbox: {
    borderWidth: 2,
    borderRadius: 50,
    backgroundColor: "#FFD700",
    padding: 8,
    color: "#999",
  },
  text: { 
    color: "#000", 
    fontWeight: "bold" },
});
