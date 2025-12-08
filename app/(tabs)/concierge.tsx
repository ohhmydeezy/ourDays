import { useAuth } from "@/lib/auth-context";
import {
  client,
  DATABASE_ID,
  databases,
  EVENTS_ID,
} from "@/lib/appwrite";
import { useEffect, useMemo, useRef, useState } from "react"
import { View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Events } from "@/types/database.type";
import {  Query } from "react-native-appwrite";
import { Text, ActivityIndicator } from "react-native-paper";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";


const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const model_name = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model_name}:generateContent?key=${GEMINI_API_KEY}`;

interface Message {
  role: "user" | "concierge";
  text: string;
}

export default function ConciergeScreen() {
  const { user, connectedUser } = useAuth();
  const [isTyping, setisTyping] = useState(false);
  const [allEvents, setAllEvents] = useState<Events[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "concierge",
      text: "Hello! I'm Dory, your relationship concierge. Ask me for date suggestions or planning tips!",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const chatScrollViewRef = useRef<ScrollView>(null);

  const fetchAllEvents = async () => {
    if (!user?.$id) return;
    try {
      const response = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("userId", user.$id),
      ]);
      const myEvents = response.documents as unknown as Events[];

      let partnerEvents: Events[] = []
      if(connectedUser?.userId) {
        const partnerResponse = await databases.listDocuments(
        DATABASE_ID,
        EVENTS_ID,
        [Query.equal("userId", connectedUser.userId)]
      );
      partnerEvents = partnerResponse.documents as unknown as Events[];
      }
      setAllEvents([...myEvents, ...partnerEvents]);
    } catch (error) {
      console.error("Error fetching events for concierge context:", error);
    }
  };

  useEffect(() => {
    if (!user?.$id || !connectedUser?.userId) return;

    fetchAllEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.$id, connectedUser?.userId]); 

  useEffect(() => {
    if (!user?.$id) return;

    const eventsChannel = `databases.${DATABASE_ID}.collections.${EVENTS_ID}.documents`;

    const eventsSubscription = client.subscribe(eventsChannel, (response) => {
      const payload = response.payload as any;
      const isRelevant =
        payload?.userId === user.$id ||
        payload?.userId === connectedUser.userId;

      if (
        isRelevant &&
        response.events.some((e) =>
          ["create", "update", "delete"].includes(e.split(".").pop() ?? "")
        )
      ) {
        fetchAllEvents();
      }
    });

    return () => {
      eventsSubscription();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.$id, connectedUser?.userId]);

  const timeSinceLastJointEvent = useMemo(() => {
    const jointEvents = allEvents.filter((e) => e.jointEvent);
    if (jointEvents.length === 0) return 30;
    const sortedJointEvents = jointEvents.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const lastJointEventDate = new Date(sortedJointEvents[0].date);
    const today = new Date();

    const diffTime = Math.abs(today.getTime() - lastJointEventDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }, [allEvents]);

  const upcomingSchedule = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const futureEvents = allEvents.filter(
      (e) =>
        new Date(e.date).getTime() >= today.getTime() &&
        new Date(e.date).getTime() <= thirtyDaysFromNow.getTime()
    );
    if (futureEvents.length === 0) {
      return "No upcoming events found in the next 30 days for either partner";
    }

    const scheduleString = futureEvents
      .map((e) => {
        const date = new Date(e.date).toLocaleDateString();
        const time = new Date(e.time).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        const type = e.jointEvent
          ? "Joint"
          : e.userId === user?.$id
          ? "My Event"
          : "Partner Private";
        return `Date: ${date}, Time: ${time}, Type: ${type}, Title: ${e.title}`;
      })
      .join("\n");
    return scheduleString;
  }, [allEvents, user?.$id]);

  const getConciergeResponse = async (query: string) => {
    setisTyping(true);

    const scheduleContext = upcomingSchedule;

    const systemPrompt =
      'You are a friendly, insightful, and proactive relationship concierge service named "Dory". Your goal is to help a couple plan quality time together. Your responses should be warm, encouraging, and actionable.';

    const userQuery = `My last joint event was ${timeSinceLastJointEvent} days ago
    upcoming Schedule (next 30 days): 
    ---
    ${scheduleContext}
    ---
    User Message: ${query}`;

const payload = {
  contents: [
    {
      role: "user",
      parts: [{ text: userQuery }],
    },
  ],
  system_instruction: {
    role: "system",
    parts: [{ text: systemPrompt }],
  },
};


    let resultText =
      "Sorry, I couldn't connect with the service right now. Please try again.";

    const MAX_RETRIES = 5;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const result = await response.json();
          resultText =
            result.candidates?.[0].content?.parts?.[0].text || resultText;
          break;
        }
      } catch (error) {
        if (i < MAX_RETRIES - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error("Gemini API call failed after max retries:", error);
        }
      }
    }

    setMessages((prev) => [...prev, { role: "concierge", text: resultText }]);
    setisTyping(false);
  };

  const handleSendMessage = () => {
    if (!userInput.trim() || isTyping) return;

    const newMessage: Message[] = [
      ...messages,
      { role: "user", text: userInput },
    ];
    setMessages(newMessage);
    const query = userInput;
    setUserInput("");

    setTimeout(
      () => chatScrollViewRef.current?.scrollToEnd({ animated: true }),
      100
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
      <Text style={conciergeStyles.header}>Dory&apos;s Concierge Service</Text>

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
              <ActivityIndicator animating={true} color="#444" size="small" />
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
          onSubmitEditing={handleSendMessage} // Allows sending via keyboard enter
        />
        <TouchableOpacity
          style={conciergeStyles.sendButton}
          onPress={handleSendMessage}
          disabled={!userInput.trim() || isTyping}
        >
          <MaterialCommunityIcons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={conciergeStyles.statusText}>
        Last joint event was {timeSinceLastJointEvent} days ago.
      </Text>
    </SafeAreaView>
  );
}

const conciergeStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
        paddingBottom: 70
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#555555',
    },
    chatWindow: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 10,
        overflow: 'hidden',
    },
    chatMessages: {
        paddingHorizontal: 10,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 15,
        marginBottom: 10,
        maxWidth: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#84E2FF',
        borderBottomRightRadius: 5,
    },
    conciergeBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#f0f0f0', 
        borderBottomLeftRadius: 5,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    userText: {
        color: '#000',
    },
    conciergeText: {
        color: '#333',
    },
    chatInputContainer: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 0,
        backgroundColor: '#f5f5f5',
    },
    chatInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 8,
        backgroundColor: 'white',
        fontSize: 15,
    },
    sendButton: {
        backgroundColor: '#555555',
        width: 45,
        height: 45,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusText: {
        textAlign: 'center',
        marginTop: 5,
        fontSize: 12,
        color: '#888',
    }
})