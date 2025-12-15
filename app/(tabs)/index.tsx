import { useAuth } from "../../lib/auth-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { Calendar } from "react-native-calendars";
import { account, DATABASE_ID, databases, EVENTS_ID, USER_COLLECTION_ID } from "../../lib/appwrite";
import { Events } from "@/types/database.type";
import { ScrollView, Swipeable } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEventsData } from "@/lib/events-context";
import registerNNPushToken from "native-notify";
import { NATIVE_NOTIFY_APP_ID, NATIVE_NOTIFY_APP_TOKEN } from "@/lib/native-notify";
import { Query } from "react-native-appwrite";

export default function HomeScreen() {
  registerNNPushToken(NATIVE_NOTIFY_APP_ID, NATIVE_NOTIFY_APP_TOKEN);
  const { user, connectedUser, refreshUser } = useAuth();
  const [isCalenderView, setCalenderView] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isRefresh, setIsRefresh] = useState(false);
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  const {
    myEvents,
    partnerEvents,
    isLoading,
    fetchMyEvents,
    fetchPartnerEvents,
    fetchPendingEvents,
  } = useEventsData();

  const handleRefresh = useCallback(async () => {
    setIsRefresh(true);
    try {
      await Promise.all([
        fetchMyEvents(),
        fetchPartnerEvents(),
        fetchPendingEvents(),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      console.error("error during refresh");
    } finally {
      setIsRefresh(false);
    }
  }, [fetchMyEvents, fetchPartnerEvents, fetchPendingEvents]);

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Check if the user is authenticated and we haven't already saved a token this session
    if (user?.$id && user?.prefs?.nativeNotifyToken === undefined) {
      const saveTokenToAppwrite = async () => {
        try {
          const token = (await getPushToken(
            NATIVE_NOTIFY_APP_ID,
            NATIVE_NOTIFY_APP_TOKEN
          )) as string | undefined | null;

          if (!token) return;

          const currentPrefs = await account.getPrefs();
          await account.updatePrefs({
            ...currentPrefs,
            nativeNotifyToken: token,
          });

          const userDocs = await databases.listDocuments(
            DATABASE_ID,
            USER_COLLECTION_ID,
            [Query.equal("userId", user.$id)]
          );

          if (userDocs.documents.length > 0) {
            await databases.updateDocument(
              DATABASE_ID,
              USER_COLLECTION_ID,
              userDocs.documents[0].$id,
              {
                nativeNotifyToken: token,
              }
            );
          }
          await refreshUser();
          console.log("Successfully saved Native Notify token to Appwrite.");
        } catch (error) {
          console.error("Error saving push token to Appwrite:", error);
        }
      };

      saveTokenToAppwrite();
    }
  }, [refreshUser, user?.$id, user?.prefs?.nativeNotifyToken]); 


  const handleDeleteEvent = async (id: string) => {
    try {
      await databases.deleteDocument(DATABASE_ID, EVENTS_ID, id);
      await fetchMyEvents();
    } catch (error) {
      console.error(error);
    }
  };

  const renderEvents = (renderedEvents: Events[]) => {
    if (!user) return null;

    return renderedEvents.map((event) => {
      const isJointEvent = event.jointEvent;

      const cardStyle = isJointEvent ? styles.jointCard : styles.myCard;
      const cardSuffix = isJointEvent
        ? ` (Shared - Status: ${event.status.toUpperCase()})`
        : " (Personal)";

      return (
        <Swipeable
          key={event.$id}
          ref={(ref) => {
            swipeableRefs.current[event.$id] = ref;
          }}
          overshootLeft={false}
          renderLeftActions={renderLeftActions}
          onSwipeableOpen={(direction) => {
            if (direction === "left") {
              requestAnimationFrame(() => {
                if (!isMounted.current) return;
                handleDeleteEvent(event.$id);
              });
            }
          }}
        >
          <View style={cardStyle}>
            <Text style={styles.cardTitle}>
              {String(event.title ?? "")}
              <Text style={{ fontSize: 14, fontWeight: "400", color: "#444" }}>
                {" "}
                {cardSuffix}
              </Text>
            </Text>

            <Text style={styles.cardText}>{String(event.location ?? "")}</Text>

            <Text style={styles.cardText}>{String(event.details ?? "")}</Text>
          </View>
        </Swipeable>
      );
    });
  };

  const renderConnectedEvents = (connectedEvents: Events[]) => {
    if (!connectedUser) return null;
    return connectedEvents.map((event) => {
      const isJointEvent = event.jointEvent;
      const cardStyle = isJointEvent ? styles.jointCard : styles.partnerCard;
      const cardSuffix = isJointEvent
        ? ` (Partner Shared - Status: ${event.status.toUpperCase()})`
        : " (Partner Private)";

      return (
        <View key={event.$id} style={cardStyle}>
          <Text style={styles.cardTitle}>
            {String(event.title ?? "")}
            <Text style={{ fontSize: 14, fontWeight: "400", color: "#444" }}>
              {" "}
              {cardSuffix}
            </Text>
          </Text>

          <Text style={styles.cardText}>{String(event.location ?? "")}</Text>

          <Text style={styles.cardText}>{String(event.details ?? "")}</Text>
        </View>
      );
    });
  };

  const renderLeftActions = (_progress: any, _dragX: any) => (
    <View style={styles.swipeActionLeft}>
      <MaterialCommunityIcons
        name="trash-can-outline"
        size={32}
        color={"#fff"}
      />
    </View>
  );

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

  const safeISODate = (value?: string): string | null => {
    if (typeof value !== "string") return null;

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;

    return d.toISOString().split("T")[0];
  };

  const [weekday, monthDay] = formattedDate.split(", ");

  let rawTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  rawTime = rawTime.replace(/([ap]m)$/i, " $1");
  const [time, ampm] = rawTime.split(" ");
  const formattedTime = `${time}\n${ampm}`;

  const today = new Date();
  const todayString = today.toISOString().split("T")[0];

  const todaysEvents = myEvents?.filter((event) => {
    const eventDateString = safeISODate(event.date);
    if (!eventDateString) return false;
    return eventDateString === todayString;
  });

  const todaysConnectedEvents = partnerEvents?.filter((event) => {
    const eventDateString = safeISODate(event.date);
    if (!eventDateString) return false;
    return eventDateString === todayString;
  });

  const allEventDates: { [key: string]: { dots: { color: string }[] } } = {};

  (myEvents ?? []).forEach((event) => {
    const dateString = safeISODate(event.date);
    if (!dateString) return;

    if (!allEventDates[dateString]) {
      allEventDates[dateString] = { dots: [] };
    }

    const dotColor = event.jointEvent ? "#8873FF" : "#84E2FF";

    if (!allEventDates[dateString].dots.some((dot) => dot.color === dotColor)) {
      allEventDates[dateString].dots.push({ color: dotColor });
    }
  });

  (partnerEvents ?? []).forEach((event) => {
    const dateString = safeISODate(event.date);
    if (!dateString) return;

    if (!allEventDates[dateString]) {
      allEventDates[dateString] = { dots: [] };
    }

    const dotColor = event.jointEvent ? "#8873FF" : "#84E2FF";

    if (!allEventDates[dateString].dots.some((dot) => dot.color === dotColor)) {
      allEventDates[dateString].dots.push({ color: dotColor });
    }
  });

  const selectedDateEvents =
    myEvents?.filter((event) => {
      if (!selectedDate) return false;
      const eventDateString = safeISODate(event.date);
      return eventDateString === selectedDate;
    }) ?? [];

  const selectedConnectedEvents =
    partnerEvents?.filter((event) => {
      if (!selectedDate) return false;
      const eventDateString = safeISODate(event.date);
      return eventDateString === selectedDate;
    }) ?? [];

  const todaysEventCount =
    (todaysEvents?.length ?? 0) + (todaysConnectedEvents?.length ?? 0);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <View style={styles.topButtons}>
        <Button
          style={styles.button}
          onPress={() => setCalenderView(false)}
          buttonColor={isCalenderView ? "#ccc" : "#555555"}
          textColor={isCalenderView ? "#000" : "#fff"}
          mode={!isCalenderView ? "contained" : "outlined"}
        >
          Today
        </Button>
        <Button
          style={styles.button}
          onPress={() => setCalenderView(true)}
          buttonColor={!isCalenderView ? "#ccc" : "#555555"}
          textColor={!isCalenderView ? "#000" : "#fff"}
          mode={isCalenderView ? "contained" : "outlined"}
        >
          Calendar
        </Button>
      </View>

      {!isCalenderView ? (
        <View style={styles.todaysContainer}>
          <View style={styles.dateTime}>
            <Text style={styles.date}>{weekday + ",\n" + monthDay}</Text>
            <View style={styles.seperator} />
            <Text style={styles.time}>{formattedTime}</Text>
          </View>

          <View style={styles.eventsLog}>
            {isLoading ? <ActivityIndicator /> : null}
            <ScrollView
              refreshControl={
                <RefreshControl
                  refreshing={isRefresh}
                  onRefresh={handleRefresh}
                  tintColor="#555555"
                />
              }
            >
              {todaysEvents && todaysConnectedEvents && todaysEventCount > 0 ? (
                <View>
                  <Text style={styles.eventCount}>
                    Today&apos;s Events ({todaysEventCount})
                  </Text>
                  {renderEvents(todaysEvents ?? [])}
                  {renderConnectedEvents(todaysConnectedEvents ?? [])}
                </View>
              ) : (
                <View style={styles.noEventsContainer}>
                  <Text style={styles.noEvent}>
                    You have nothing booked today, Date Night?
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        <View style={styles.calendar}>
          <Calendar
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={{
              ...allEventDates,
              [selectedDate]: {
                selected: true,
                selectedColor: "#555555",
                selectedTextColor: "#fff",
              },
            }}
            markingType="multi-dot"
            theme={{
              todayTextColor: "#555555",
            }}
          />

          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={isRefresh}
                onRefresh={handleRefresh}
                tintColor="#555555"
              />
            }
          >
            <View style={styles.eventsLog}>
              {selectedDateEvents.length > 0 ||
              selectedConnectedEvents.length > 0 ? (
                <>
                  {renderEvents(selectedDateEvents)}
                  {renderConnectedEvents(selectedConnectedEvents)}
                </>
              ) : (
                <Text>No events for this day</Text>
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topButtons: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 10,
  },
  todaysContainer: {
    flex: 1,
  },
  dateTime: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  date: {
    fontSize: 24,
    fontWeight: "semibold",
    color: "#000",
  },
  seperator: {
    width: 2,
    height: 80,
    backgroundColor: "#202020ff",
    marginHorizontal: 20,
  },
  time: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  eventsLog: {
    flex: 1,
    padding: 10,
    backgroundColor: "#E7E7E7",
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#747474",
  },
  eventCount: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: 8,
  },
  myCard: {
    backgroundColor: "#84E2FF",
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#fff",

  },
  jointCard: {
    backgroundColor: "#8873FF",
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  partnerCard: {
    backgroundColor: "#ECFF73",
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#000"
  },
  cardText: {
    fontSize: 14,
    marginRight: 10,
    color: "#000"
  },
  noEventsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noEvent: {
    fontSize: 16,
    color: "#666",
  },
  calendar: {
    flex: 1,
  },
  swipeActionLeft: {
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 20,
    borderRadius: 20,
    flex: 1,
  },
});
function getPushToken(NATIVE_NOTIFY_APP_ID: number, NATIVE_NOTIFY_APP_TOKEN: string) {
  throw new Error("Function not implemented.");
}

