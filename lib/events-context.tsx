import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { client, DATABASE_ID, databases, EVENTS_ID } from "./appwrite";
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

  const fetchMyEvents = useCallback(async () => {
    if (!user?.$id) return;
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("userId", user.$id),
      ]);
      setMyEvents(response.documents as unknown as Events[]);
    } catch (error) {
      console.error("Error fetching my events:", error);
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
      setPartnerEvents(response.documents as unknown as Events[]);
    } catch (error) {
      console.error("Error fetching partner events:", error);
    }
  }, [connectedUser?.userId]);

  const fetchPendingEvents = useCallback(async () => {
    if (!user) return;

    try {
      const result = await databases.listDocuments(DATABASE_ID, EVENTS_ID, [
        Query.equal("status", "pending"),
        Query.equal("recipientId", user.$id),
      ]);
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
  }, [user]);

  const handleAcceptEvent = async (event: Events) => {
    if (!user) return;
    try {
      await databases.updateDocument(DATABASE_ID, EVENTS_ID, event.$id, {
        status: "confirmed",
      });
      await fetchPendingEvents();
      await fetchMyEvents();
      if (connectedUser?.userId) {
        await fetchPartnerEvents();
      }
    } catch (error) {
      console.error("Error accepting event:", error);
    }
  };

  const handleDeclineEvent = async (event: Events) => {
    try {
      await databases.updateDocument(DATABASE_ID, EVENTS_ID, event.$id, {
        status: "declined",
      });

      await fetchPendingEvents();
      await fetchMyEvents();
      if (connectedUser?.userId) {
        await fetchPartnerEvents();
      }
    } catch (error) {
      console.error("Error declining event:", error);
    }
  };

  useEffect(() => {
    fetchMyEvents();
    fetchPartnerEvents();
    fetchPendingEvents();
  }, [fetchMyEvents, fetchPartnerEvents, fetchPendingEvents]);

  useEffect(() => {
    if (!user?.$id) return;

    const eventsChannel = `databases.${DATABASE_ID}.collections.${EVENTS_ID}.documents`;

    const eventsSubscription = client.subscribe(eventsChannel, (response) => {
      const payload = response.payload as any;
      const isRelevant =
        payload?.userId === user.$id ||
        payload?.userId === connectedUser?.userId;

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
        if (connectedUser?.userId) {
          fetchPartnerEvents();
        }
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
