import { DATABASE_ID, databases, EVENTS_ID } from "../../lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Modal,
  TouchableOpacity,
} from "react-native";
import {
  Button,
  Text,
  TextInput,
  useTheme,
  Checkbox,
} from "react-native-paper";
import { ID } from "react-native-appwrite";
import { router } from "expo-router";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEventsData } from "@/lib/events-context";
import { NATIVE_NOTIFY_APP_ID, NATIVE_NOTIFY_APP_TOKEN } from "@/lib/native-notify";

export default function AddEventScreen() {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState("");
  const [jointEvent, setJointEvent] = useState<boolean>(false);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState("");
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
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
    recipientToken: string | undefined,
    eventTitle: string,
    senderName: string
  ) => {
    // We expect the recipientToken to be stored in connectedUser.nativeNotifyToken
    if (!recipientToken) {
      console.warn("Recipient push token is missing. Notification skipped.");
      return;
    }

    try {
      const notificationData = {
        appId: NATIVE_NOTIFY_APP_ID,
        appToken: NATIVE_NOTIFY_APP_TOKEN,
        // Target only the recipient's push token
        pushToken: recipientToken,
        title: "You Have An Invite!",
        body: `${senderName} invited you to: ${eventTitle}. Status: Pending.`,
        data: {
          eventTitle,
          sender: senderName,
          type: "joint_event_invite",
        },
      };

      const response = await fetch(
        "https://app.nativenotify.com/api/indie/push",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(notificationData),
        }
      );

      const responseData = await response.json();
      if (response.ok) {
        console.log(
          "Native Notify push notification dispatched successfully:",
          responseData
        );
      } else {
        console.error("Native Notify push error:", responseData);
      }
    } catch (e) {
      console.error("Network or API error sending push notification:", e);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("Unauthenticated User");
      return;
    }

    if (isSubmitted) return;

    setError("");
    setSuccess("");
    setIsSubmitted(true);

    const documentData: any = {
      userId: user.$id,
      title,
      details,
      location,
      date: date.toISOString(),
      time,
      jointEvent: jointEvent,
      status: jointEvent ? "pending" : "confirmed",
    };

    if (jointEvent) {
      if (!isPartnerAvailable || !connectedUser.userId) {
        setError(
          "Cannot create a joint event: You must be connected to a partner."
        );
        setIsSubmitted(false); 
        return;
      }
      documentData.recipientId = connectedUser.userId;
    }

    try {
      await databases.createDocument(
        DATABASE_ID,
        EVENTS_ID,
        ID.unique(),
        documentData
      );
      await fetchMyEvents();
      if (connectedUser?.userId) {
        await fetchPartnerEvents();
      }

      if (jointEvent) {
        await sendPushNotification(
          connectedUser.nativeNotifyToken as string,
          title,
          user.prefs.firstName || user.email 
        );
      }

      setTitle("");
      setDetails("");
      setLocation("");
      setDate(new Date());
      setTime("");
      setSuccess("Event successfully created!");
      setTimeout(() => router.back(), 1000);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        return;
      }
      setError("Error creating Event");
    } finally {
      setIsSubmitted(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={{ color: "white", padding: 12 }}>New Event</Text>
      </View>
      <View style={styles.formContainer}>
        <Button textColor="#000" onPress={() => setShowDatePicker(true)}>
          Select Date
        </Button>
        <Text style={styles.text}>{date.toDateString()}</Text>
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.pickerContainer}>
            <RNDateTimePicker
              mode="date"
              value={tempDate}
              themeVariant="light"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedDate) => {
                if (selectedDate) setTempDate(selectedDate);
              }}
            />
            <Button
              textColor="#000"
              onPress={() => {
                setDate(tempDate);
                setShowDatePicker(false);
              }}
            >
              Confirm
            </Button>
            <Button textColor="#000" onPress={() => setShowDatePicker(false)}>
              Cancel
            </Button>
          </View>
        </Modal>

        <Button textColor="#000" onPress={() => setShowTimePicker(true)}>
          Select Time
        </Button>
        <Text style={styles.text}>{time}</Text>
        <Modal visible={showTimePicker} transparent animationType="slide">
          <View style={styles.pickerContainer}>
            <RNDateTimePicker
              mode="time"
              value={tempTime}
              themeVariant="light"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedDate) => {
                if (selectedDate) setTempTime(selectedDate);
              }}
            />
            <Button
              textColor="#000"
              onPress={() => {
                setTime(
                  tempTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                );
                setShowTimePicker(false);
              }}
            >
              Confirm
            </Button>
            <Button textColor="#000" onPress={() => setShowTimePicker(false)}>
              Cancel
            </Button>
          </View>
        </Modal>

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

        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!title || !date || !time}
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
    fontWeight: "bold"
  }
});
