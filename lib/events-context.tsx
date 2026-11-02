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
import { Query } from "react-native-appwrite";
import { useAuth } from "@/lib/auth-context";
import { Events } from "@/types/database.type";
import { Alert } from "react-native";

interface EventsContextType {
  myEvents: Events[];
  partnerEvents: Events[];
  pendingEvents: Events[];
  isUpdatingEvent: boolean;
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
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);

  const isMounted = useRef(true);
  const updatingEventRef = useRef(false);
  const userId = user?.$id;
  const partnerId = connectedUser?.userId;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  //Retrieve events

  const fetchMyEvents = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("userId", userId),
        Query.notEqual("status", "declined"),
      ]);
      if (!isMounted.current) return;
      setMyEvents(response.documents as unknown as Events[]);
    } catch (error) {
      console.error("Error fetching my events:", error);
      if (isMounted.current) {
        setMyEvents([]);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  // retrieve connected partner if a connected partner exists

  const fetchPartnerEvents = useCallback(async () => {
    if (!partnerId) {
      setPartnerEvents([]);
      return;
    }
    try {
      const response = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("userId", partnerId),
        Query.notEqual("status", "declined"),
      ]);
      if (!isMounted.current) return;
      setPartnerEvents(response.documents as unknown as Events[]);
    } catch (error) {
      console.error("Error fetching partner events:", error);

      if (isMounted.current) {
        setPartnerEvents([]);
      }
    }
  }, [partnerId]);

  // Pending events for notification

  const fetchPendingEvents = useCallback(async () => {
    if (!userId) return;

    try {
      const result = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("status", "pending"),
        Query.equal("recipientId", userId),
      ]);
      if (!isMounted.current) return;
      setPendingEvents(result.documents as unknown as Events[]);
    } catch (error) {
      console.error("Error fetching pending events:", error);
      if (isMounted.current) {
        setPendingEvents([]);
      }
    }
  }, [userId]);

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
    if (!userId || updatingEventRef.current) return;

    updatingEventRef.current = true;
    setIsUpdatingEvent(true);

    try {
      await databases.updateDocument(DATABASE_ID, EVENTS_ID, event.$id, {
        status: "confirmed",
      });

      await Promise.all([
        fetchPendingEvents(),
        fetchMyEvents(),
        fetchPartnerEvents(),
      ]);

      void notifyEventStatus(event.userId, event.title, "confirmed");
    } catch (error) {
      console.error("Error accepting event:", error);
      Alert.alert(
        "Error",
        "We couldn't accept this invitation. Please try again.",
      );
      throw error;
    } finally {
      updatingEventRef.current = false;
      if (isMounted.current) {
        setIsUpdatingEvent(false);
      }
    }
  };

  // Handle decline event action on pending events

  const handleDeclineEvent = async (event: Events) => {
    if (!userId || updatingEventRef.current) return;

    updatingEventRef.current = true;
    setIsUpdatingEvent(true);

    try {
      await databases.updateDocument(DATABASE_ID, EVENTS_ID, event.$id, {
        status: "declined",
      });

      await Promise.all([
        fetchPendingEvents(),
        fetchMyEvents(),
        fetchPartnerEvents(),
      ]);

      void notifyEventStatus(event.userId, event.title, "declined");
    } catch (error) {
      console.error("Error declining event:", error);
      Alert.alert(
        "Error",
        "We couldn't decline this invitation. Please try again.",
      );
      throw error;
    } finally {
      updatingEventRef.current = false;
      if (isMounted.current) {
        setIsUpdatingEvent(false);
      }
    }
  };

  // Initial fetch of events
  useEffect(() => {
    if (!userId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMyEvents();
    fetchPartnerEvents();
    fetchPendingEvents();
  }, [userId, fetchMyEvents, fetchPartnerEvents, fetchPendingEvents]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const eventsChannel = `databases.${DATABASE_ID}.collections.${EVENTS_ID}.documents`;

    const unsubscribe = client.subscribe(eventsChannel, (response) => {
      if (!isMounted.current) return;

      const payload = response.payload as Partial<Events>;

      if (!payload) return;

      const isRelevant =
        payload?.userId === userId ||
        payload?.recipientId === userId ||
        (partnerId != null && payload.userId === partnerId);

      const hasChanged = response.events.some((event) => {
        const action = event.split(".").pop();

        return (
          action === "create" || action === "update" || action === "delete"
        );
      });

      if (isRelevant && hasChanged) {
        void Promise.all([
          fetchMyEvents(),
          fetchPendingEvents(),
          fetchPartnerEvents(),
        ]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
    userId,
    partnerId,
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
        isUpdatingEvent,
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
