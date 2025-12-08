import { useEventsData } from "@/lib/events-context";
import { Events } from "@/types/database.type";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const {  isLoading, pendingEvents, handleAcceptEvent, handleDeclineEvent } = useEventsData();


  const renderPendingEvent = ({ item: event }: { item: Events }) => (
    <Swipeable
      key={event.$id}
      overshootLeft={false}
      renderLeftActions={() => (
        <View style={styles.acceptAction}>
          <MaterialCommunityIcons name="check" size={32} color="#fff" />
        </View>
      )}
      renderRightActions={() => (
        <View style={styles.declineAction}>
          <MaterialCommunityIcons name="close" size={32} color="#fff" />
        </View>
      )}
      onSwipeableLeftOpen={() => handleAcceptEvent(event)}
      onSwipeableRightOpen={() => handleDeclineEvent(event)}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{event.title}</Text>
        <Text>{event.details}</Text>
        <Text>{new Date(event.date).toLocaleDateString()}</Text>
        <Text>{event.time}</Text>
      </View>
    </Swipeable>
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Notifications</Text>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#555555" />
        ) : pendingEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bell-off" size={48} color="#999" />
            <Text style={styles.emptyText}>
              You&apos;re all caught up! No pending events.
            </Text>
          </View>
        ) : (
          <FlatList
            data={pendingEvents}
            keyExtractor={(item) => item.$id}
            renderItem={renderPendingEvent}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "white",
  },
  header: {
    backgroundColor: "#555555",
    alignItems: "center",
    borderRadius: 25,
    padding: 12,
    marginBottom: 16,
  },
  headerText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: "#84E2FF",
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  acceptAction: {
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 12,
    marginVertical: 8,
  },
  declineAction: {
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 12,
    marginVertical: 8,
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});
