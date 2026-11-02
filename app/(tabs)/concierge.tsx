import { useAuth } from "@/lib/auth-context";
import { client, DATABASE_ID, databases, EVENTS_ID } from "@/lib/appwrite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { Events } from "@/types/database.type";
import { Query, Functions, ExecutionMethod } from "react-native-appwrite";
import { Text, ActivityIndicator } from "react-native-paper";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AdBanner from "../components/AdBanner";
import { usePaywall } from "../hooks/usePaywall";
import { useSubscription } from "../hooks/useSubscription";
import { useChatQuota } from "../hooks/useChatQuota";
import { useFocusEffect } from "expo-router";

interface Message {
  role: "user" | "concierge";
  text: string;
}

const functions = new Functions(client);
const CONCIERGE_FUNCTION_ID = process.env.EXPO_PUBLIC_CONCIERGE_FUNCTION_ID!;

export default function ConciergeScreen() {
  const { user, connectedUser } = useAuth();
  const { openPaywall } = usePaywall();
  const { isSubscribed, loading: subLoading } = useSubscription();
  const {
    remaining,
    canSend,
    loading: quotaLoading,
    isPro,
    refreshQuota,
    updateQuota,
  } = useChatQuota(isSubscribed);
  const [isTyping, setisTyping] = useState(false);
  const [allEvents, setAllEvents] = useState<Events[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "concierge",
      text: "Hello! I'm Dory, your relationship concierge. Ask me for date suggestions or planning tips!",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const chatScrollViewRef = useRef<ScrollView>(null);
  const isFirstMessage = useRef(true);
  const userId = user?.$id;
  const partnerId = connectedUser?.userId;

  const fetchAllEvents = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("userId", userId),
      ]);
      const myEvents = response.documents as unknown as Events[];

      let partnerEvents: Events[] = [];
      if (partnerId) {
        const partnerResponse = await databases.listDocuments(
          DATABASE_ID,
          EVENTS_ID,
          [Query.equal("userId", partnerId)],
        );
        partnerEvents = partnerResponse.documents as unknown as Events[];
      }
      setAllEvents([...myEvents, ...partnerEvents]);
    } catch (error) {
      console.error("Error fetching events for concierge context:", error);
    }
  }, [userId, partnerId]);

  useEffect(() => {
    if (!userId) return;

    const loadEvents = async () => {
      await fetchAllEvents();
    };
    void loadEvents();
  }, [userId, fetchAllEvents]);

  useEffect(() => {
    if (!userId) return;

    const eventsChannel = `databases.${DATABASE_ID}.collections.${EVENTS_ID}.documents`;

    const eventsSubscription = client.subscribe(eventsChannel, (response) => {
      const payload = response.payload as any;
      const isRelevant =
        payload?.userId === userId ||
        (partnerId != null && payload.userId === partnerId);

      if (
        isRelevant &&
        response.events.some((e) =>
          ["create", "update", "delete"].includes(e.split(".").pop() ?? ""),
        )
      ) {
        fetchAllEvents();
      }
    });

    return () => {
      eventsSubscription();
    };
  }, [userId, partnerId, fetchAllEvents]);

  useFocusEffect(
    useCallback(() => {
      setCurrentTime(Date.now);
    }, []),
  );

  const timeSinceLastJointEvent = useMemo(() => {
    if (currentTime === null) return null;

    const pastJointEvents = allEvents
      .filter((event) => {
        const eventTime = new Date(event.date).getTime();

        return (
          event.jointEvent === true &&
          event.status === "confirmed" &&
          Number.isFinite(eventTime) &&
          eventTime <= currentTime
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (pastJointEvents.length === 0) return null;

    const lastEventTime = new Date(pastJointEvents[0].date).getTime();

    return Math.floor((currentTime - lastEventTime) / (1000 * 60 * 60 * 24));
  }, [allEvents, currentTime]);

  const upcomingSchedule = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const futureEvents = allEvents.filter(
      (e) => {
        const eventTime = new Date(e.date).getTime()

        return (
          e.status === "confirmed" &&
          Number.isFinite(eventTime) &&
          eventTime >= today.getTime() &&
          eventTime <= thirtyDaysFromNow.getTime()
        )
      }


    );
    if (futureEvents.length === 0) {
      return "No upcoming events found in the next 30 days for either partner";
    }

    const scheduleString = futureEvents
      .map((e) => {
        const date = new Date(e.date).toLocaleDateString();
        const time = new Date(e.time).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        const type = e.jointEvent
          ? "Joint"
          : e.userId === userId
            ? "My Event"
            : "Partner Private";
        return `Date: ${date}, Time: ${time}, Type: ${type}, Title: ${e.title}`;
      })
      .join("\n");
    return scheduleString;
  }, [allEvents, userId]);

  const getConciergeResponse = async (query: string) => {
    setisTyping(true);

    const context = isFirstMessage.current
      ? `${
          timeSinceLastJointEvent === null
            ? "We have no previous joint events recorded."
            : `Our last joint event was ${timeSinceLastJointEvent} days ago.`
        }

Upcoming Schedule (next 30 days):
---
${upcomingSchedule}
---`
      : "";

    try {
      const execution = await functions.createExecution(
        CONCIERGE_FUNCTION_ID,
        JSON.stringify({
          action: "chat",
          query,
          context,
        }),
        false,
        "/",
        ExecutionMethod.POST,
      );

      if (execution.status !== "completed") {
        throw new Error("Concierge  Function execution failed");
      }

      const data = JSON.parse(execution.responseBody || "{}");

      if (data.error === "limit_reached") {
        const activated = await openPaywall();

        if (activated) {
          await refreshQuota();
        }

        return;
      }

      if (data.error) {
        console.error("Dory Function error:", data.error);
        setMessages((prev) => [
          ...prev,
          {
            role: "concierge",
            text: "Something went wrong, Please try again",
          },
        ]);
        return;
      }

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "concierge", text: data.reply },
        ]);
        isFirstMessage.current = false;
        updateQuota(data.remaining, data.isPro);
      }
    } catch (err) {
      console.error("Dory execution failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "concierge",
          text: "Sorry, i couldn't connect with Dory right now. Please try again",
        },
      ]);
    } finally {
      setisTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isTyping || subLoading || quotaLoading) return;

    if (!canSend) {
      const activated = await openPaywall();
      if (activated) {
        await refreshQuota();
      }

      return;
    }

    const newMessage: Message[] = [
      ...messages,
      { role: "user", text: userInput },
    ];
    setMessages(newMessage);
    const query = userInput;
    setUserInput("");

    setTimeout(
      () => chatScrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );
    getConciergeResponse(query);
  };

  useEffect(() => {
    if (messages.length > 0 && chatScrollViewRef.current) {
      chatScrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <SafeAreaView edges={["bottom"]} style={conciergeStyles.container}>
      <AdBanner style={conciergeStyles.adBanner} />
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
            <Text style={conciergeStyles.header}>
              Dory&apos;s Concierge Service
            </Text>

            <View style={conciergeStyles.chatWindow}>
              <ScrollView
                ref={chatScrollViewRef}
                style={conciergeStyles.chatMessages}
                contentContainerStyle={{ paddingVertical: 10 }}
              >
                {messages.map((msg, index) => (
                  <View
                    key={index}
                    style={[
                      conciergeStyles.messageBubble,
                      msg.role === "user"
                        ? conciergeStyles.userBubble
                        : conciergeStyles.conciergeBubble,
                    ]}
                  >
                    <Text
                      style={[
                        conciergeStyles.messageText,
                        msg.role === "user"
                          ? conciergeStyles.userText
                          : conciergeStyles.conciergeText,
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                ))}
                {isTyping && (
                  <View style={conciergeStyles.conciergeBubble}>
                    <ActivityIndicator
                      animating={true}
                      color="#444"
                      size="small"
                    />
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={conciergeStyles.chatInputContainer}>
              <TextInput
                style={conciergeStyles.chatInput}
                value={userInput}
                onChangeText={setUserInput}
                placeholder="Ask Dory for a date idea or when you're free..."
                placeholderTextColor="#666"
                editable={!isTyping}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={conciergeStyles.sendButton}
                onPress={handleSendMessage}
                disabled={
                  !userInput.trim() || isTyping || subLoading || quotaLoading
                }
              >
                <MaterialCommunityIcons name="send" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={conciergeStyles.statusText}>
              {isPro
                ? "Pro: unlimited messages"
                : `${remaining} free message${remaining === 1 ? "" : "s"} left`}
            </Text>
            <Text style={conciergeStyles.statusText}>
              {timeSinceLastJointEvent === null
                ? "No previous joint events recorded."
                : `Last joint event was ${timeSinceLastJointEvent} days ago.`}
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const conciergeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
    paddingBottom: 70,
  },
  adBanner: {
    marginVertical: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    margin: 16,
    color: "#555555",
  },
  chatWindow: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    overflow: "hidden",
  },
  chatMessages: {
    paddingHorizontal: 10,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#84E2FF",
    borderBottomRightRadius: 5,
  },
  conciergeBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#000",
  },
  conciergeText: {
    color: "#333",
  },
  chatInputContainer: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 0,
    backgroundColor: "#f5f5f5",
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: "white",
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: "#555555",
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    textAlign: "center",
    marginTop: 5,
    fontSize: 12,
    color: "#888",
  },
});
