import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  client,
  DATABASE_ID,
  databases,
  EVENTS_ID,
  USER_COLLECTION_ID,
} from "./appwrite";
import { Query } from "appwrite";
import { useAuth } from "@/lib/auth-context";
import { Events } from "@/types/database.type";
import { Alert } from "react-native";

interface EventsContextType {
  myEvents: Events[];
  partnerEvents: Events[];
  pendingEvents: Events[];
  fetchMyEvents: () => Promise<void>;
  fetchPartnerEvents: () => Promise<void>;
  fetchPendingEvents: () => Promise<void>;
  handleAcceptEvent: (event: Events) => Promise<void>;
  handleDeclineEvent: (event: Events) => Promise<void>;
  notifyEventCreated: (
    recipientId: string,
    eventTitle: string,
  ) => Promise<void>;
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

  //Retrieve events

  const fetchMyEvents = useCallback(async () => {
    if (!user?.$id) return;
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("userId", user.$id),
        Query.notEqual("status", "declined"),
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

  // retrieve connected partner if a connected partner exists

  const fetchPartnerEvents = useCallback(async () => {
    if (!connectedUser?.userId) return;
    try {
      const response = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("userId", connectedUser.userId),
        Query.notEqual("status", "declined"),
      ]);
      if (!isMounted.current) return;
      setPartnerEvents(response.documents as unknown as Events[]);
    } catch (error) {
      console.error("Error fetching partner events:", error);
      logAndAlertError("Error fetching partner events:", error);
      setPartnerEvents([]);
    }
  }, [connectedUser?.userId]);

  // Pending events for notification

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
        "Failed to load events. Check your Appwrite console for index errors.",
      );
      setPendingEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id]);

  const notifyEventStatus = async (
    recipientId: string,
    eventTitle: string,
    status: "confirmed" | "declined",
  ) => {
    if (!recipientId) return;

    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION_ID,
        [Query.equal("userId", recipientId)],
      );

      if (!res.documents.length) return;

      const expoPushToken = res.documents[0].expoPushToken;
      if (!expoPushToken) return;

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: expoPushToken,
          title:
            status === "confirmed" ? "Event Accepted 🎉" : "Event Declined",
          body:
            status === "confirmed"
              ? `Your event "${eventTitle}" was accepted 🎉`
              : `Your event "${eventTitle}" was declined`,
          data: { screen: "/(tabs)" },
        }),
      });
    } catch (err) {
      console.error("Push request failed:", err);
    }
  };

  const notifyEventCreated = async (
    recipientId: string,
    eventTitle: string,
  ) => {
    if (!recipientId) return;

    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION_ID,
        [Query.equal("userId", recipientId)],
      );

      if (!res.documents.length) return;

      const expoPushToken = res.documents[0].expoPushToken;
      if (!expoPushToken) return;

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: expoPushToken,
          title: "New Event 📅",
          body: `You've been invited to "${eventTitle}"`,
          data: { screen: "/(tabs)" },
        }),
      });
    } catch (err) {
      console.error("Push request failed:", err);
    }
  };

  // Handle accept event action on pending events

  const handleAcceptEvent = async (event: Events) => {
    if (!user) return;

    try {
      await databases.updateDocument(DATABASE_ID, EVENTS_ID, event.$id, {
        status: "confirmed",
      });

      // notify the person who created the event
      await notifyEventStatus(event.userId, event.title, "confirmed");

      if (!isMounted.current) return;
      await fetchPendingEvents();
      await fetchMyEvents();
      await fetchPartnerEvents();
    } catch (error) {
      console.error("Error accepting event:", error);
    }
  };

  // Handle decline event action on pending events

  const handleDeclineEvent = async (event: Events) => {
    if (!user) return;

    try {
      await databases.updateDocument(DATABASE_ID, EVENTS_ID, event.$id, {
        status: "declined",
      });

      // notify the person who created the event
      await notifyEventStatus(event.userId, event.title, "declined");

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
        payload?.userId === user.$id || payload?.recipientId === user.$id;

      if (
        isRelevant &&
        response.events.some((e) =>
          [
            "databases.*.collections.*.documents.*.create",
            "databases.*.collections.*.documents.*.update",
            "databases.*.collections.*.documents.*.delete",
          ].some((pattern) => e.includes(pattern.replace("*", ""))),
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
        notifyEventCreated,
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
