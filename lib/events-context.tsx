import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { client, DATABASE_ID, databases, EVENTS_ID } from "./appwrite";
import { Query } from "appwrite";
import { useAuth } from "@/lib/auth-context";
import { Events } from "@/types/database.type";
import { Alert } from "react-native";
import { NATIVE_NOTIFY_APP_ID, NATIVE_NOTIFY_APP_TOKEN } from "./native-notify";

interface EventsContextType {
  myEvents: Events[];
  partnerEvents: Events[];
  pendingEvents: Events[];
  fetchMyEvents: () => Promise<void>;
  fetchPartnerEvents: () => Promise<void>;
  fetchPendingEvents: () => Promise<void>;
  handleAcceptEvent: (event: Events) => Promise<void>;
  handleDeclineEvent: (event: Events) => Promise<void>;
  isLoading: boolean;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsDataProvider: React.FC<React.PropsWithChildren<object>> = ({
  children,
}) => {
  const { user, connectedUser } = useAuth();
  const [myEvents, setMyEvents] = useState<Events[]>([]);
  const [partnerEvents, setPartnerEvents] = useState<Events[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Events[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isMounted = useRef(true);

  // Proper single isMounted setup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const logAndAlertError = (message: string, error: unknown) => {
    console.error(message, error);
    console.log(`[APPWRITE ERROR] ${message}: Failed to load data.`);
  };

  const fetchMyEvents = useCallback(async () => {
    if (!user?.$id) return;
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("userId", user.$id),
      ]);
      if (!isMounted.current) return;
      setMyEvents(response.documents as unknown as Events[]);
    } catch (error) {
      console.error("Error fetching my events:", error);
      logAndAlertError("Error fetching my events:", error);
      setMyEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id]);

  const fetchPartnerEvents = useCallback(async () => {
    if (!connectedUser?.userId) return;
    try {
      const response = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("userId", connectedUser.userId),
      ]);
      if (!isMounted.current) return;
      setPartnerEvents(response.documents as unknown as Events[]);
    } catch (error) {
      console.error("Error fetching partner events:", error);
      logAndAlertError("Error fetching partner events:", error);
      setPartnerEvents([]);
    }
  }, [connectedUser?.userId]);

  const fetchPendingEvents = useCallback(async () => {
    if (!user?.$id) return;

    try {
      const result = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("status", "pending"),
        Query.equal("recipientId", user.$id),
      ]);
      if (!isMounted.current) return;
      setPendingEvents(result.documents as unknown as Events[]);
    } catch (error) {
      console.error("Error fetching pending events:", error);
      Alert.alert(
        "Error",
        "Failed to load events. Check your Appwrite console for index errors."
      );
      setPendingEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id]);

  // Centralized notification function
  const notifyEventStatus = async (
    recipientUserId: string,
    eventTitle: string,
    status: "confirmed" | "declined"
  ) => {
    if (!recipientUserId) return;

    try {
      const res = await fetch("https://app.nativenotify.com/api/indie/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: NATIVE_NOTIFY_APP_ID,
          appToken: NATIVE_NOTIFY_APP_TOKEN,
          subID: recipientUserId,
          title:
            status === "confirmed" ? "Event Accepted 🎉" : "Event Declined",
          message:
            status === "confirmed"
              ? `Your event "${eventTitle}" was accepted 🎉`
              : `Your event "${eventTitle}" was declined`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Native Notify error:", data);
      }
    } catch (err) {
      console.error("Push request failed:", err);
    }
  };

  const handleAcceptEvent = async (event: Events) => {
    if (!user) return;

    try {
      await databases.updateDocument(DATABASE_ID, EVENTS_ID, event.$id, {
        status: "confirmed",
      });

      if (event.userId !== user.$id) {
        await notifyEventStatus(event.userId, event.title, "confirmed");
      }

      if (!isMounted.current) return;
      await fetchPendingEvents();
      await fetchMyEvents();
      await fetchPartnerEvents();
    } catch (error) {
      console.error("Error accepting event:", error);
    }
  };

  const handleDeclineEvent = async (event: Events) => {
    if (!user) return;

    try {
      await databases.updateDocument(DATABASE_ID, EVENTS_ID, event.$id, {
        status: "declined",
      });

      if (event.userId !== user.$id) {
        await notifyEventStatus(event.userId, event.title, "declined");
      }

      if (!isMounted.current) return;
      await fetchPendingEvents();
      await fetchMyEvents();
      await fetchPartnerEvents();
    } catch (error) {
      console.error("Error declining event:", error);
    }
  };

  // Initial fetch of events
  useEffect(() => {
    if (!user?.$id) return;

    fetchMyEvents();
    fetchPartnerEvents();
    fetchPendingEvents();
  }, [user?.$id, fetchMyEvents, fetchPartnerEvents, fetchPendingEvents]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.$id) return;

    const eventsChannel = `databases.${DATABASE_ID}.collections.${EVENTS_ID}.documents`;

    const eventsSubscription = client.subscribe(eventsChannel, (response) => {
      if (!isMounted.current) return;

      const payload = response.payload as any;
      if (!payload) return;

    const isRelevant =
      payload?.userId === user.$id ||
      payload?.recipientId === user.$id ||
      payload?.userId === connectedUser?.userId ||
      payload?.recipientId === connectedUser?.userId;

      if (
        isRelevant &&
        response.events.some((e) =>
          [
            "databases.*.collections.*.documents.*.create",
            "databases.*.collections.*.documents.*.update",
            "databases.*.collections.*.documents.*.delete",
          ].some((pattern) => e.includes(pattern.replace("*", "")))
        )
      ) {
        fetchMyEvents();
        fetchPendingEvents();
        if (connectedUser?.userId) fetchPartnerEvents();
      }
    });

    return () => {
      eventsSubscription();
    };
  }, [
    user?.$id,
    connectedUser?.userId,
    fetchMyEvents,
    fetchPartnerEvents,
    fetchPendingEvents,
  ]);

  return (
    <EventsContext.Provider
      value={{
        myEvents,
        partnerEvents,
        pendingEvents,
        fetchMyEvents,
        fetchPartnerEvents,
        fetchPendingEvents,
        handleAcceptEvent,
        handleDeclineEvent,
        isLoading,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
};

export const useEventsData = () => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error("useEventsData must be used within an EventsDataProvider");
  }
  return context;
};
