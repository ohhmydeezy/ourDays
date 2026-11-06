import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform, AppState } from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Query } from "react-native-appwrite";
import { DATABASE_ID, databases, USER_COLLECTION_ID } from "@/lib/appwrite";

interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
  notification?: Notifications.Notification;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<
  Notifications.ExpoPushToken | undefined
> {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existingStatus !== "granted"
      ? (await Notifications.requestPermissionsAsync()).status
      : existingStatus;

  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  try {
    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.warn("Expo project ID is missing ");
      return;
    }

    return await Notifications.getExpoPushTokenAsync({ projectId });
  } catch (error) {
    console.error("Error getting push token:", error);
  }
}

export const usePushNotifications = (): PushNotificationState => {
  const [expoPushToken, setExpoPushToken] =
    useState<Notifications.ExpoPushToken>();
  const [notification, setNotification] =
    useState<Notifications.Notification>();
  const { user } = useAuth();
  const userId = user?.$id;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const notificationListener = useRef<
    Notifications.EventSubscription | undefined
  >(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(
    undefined,
  );
  const isNavigatingRef = useRef(false);

  const router = useRouter();

  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      if (isNavigatingRef.current) return;

      await Notifications.setBadgeCountAsync(0);

      const data = response.notification.request.content.data;
      if (!data?.screen) return;

      isNavigatingRef.current = true;

      try {
        router.push({
          pathname: data.screen,
          params: data.params as Record<string, string>,
        } as any);
      } catch (error) {
        console.error("Error handling notification tap:", error);
      } finally {
        setTimeout(() => (isNavigatingRef.current = false), 1000);
      }
    },
    [router],
  );

  useEffect(() => {
    registerForPushNotificationsAsync().then(setExpoPushToken);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        Notifications.setBadgeCountAsync(0);
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener(setNotification);

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse,
      );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      sub.remove();
    };
  }, [handleNotificationResponse]);
  useEffect(() => {
    if (!userId || !expoPushToken?.data) return;

    let cancelled = false;

    const saveNotificationSettings = async () => {
      try {
        const result = await databases.listDocuments(
          DATABASE_ID,
          USER_COLLECTION_ID,
          [Query.equal("userId", userId)],
        );

        if (cancelled) return;

        if (result.documents.length === 0) {
          console.warn("User document not found.");
          return;
        }

        const userDoc = result.documents[0];
        const token = expoPushToken.data;

        const updates: {
          expoPushToken?: string,
          timezone?: string
        } = {}

        if(userDoc.expoPushToken !== token) {
          updates.expoPushToken = token
        }

        if(userDoc.timezone !== timezone) {
          updates.timezone = timezone
        }

        if(Object.keys(updates).length === 0) return

        if(cancelled) return


        await databases.updateDocument(
          DATABASE_ID,
          USER_COLLECTION_ID,
          userDoc.$id,
          updates,
        );

        console.log("Notification settings saved successfully");
      } catch (error) {
        console.error("Failed to save notification settings:", error);
      }
    };

    void saveNotificationSettings();

    return () => {
      cancelled = true;
    };
  }, [userId, expoPushToken?.data, timezone]);

  return { expoPushToken, notification };
};
