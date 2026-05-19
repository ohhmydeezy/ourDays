import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";


interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
  notification?: Notifications.Notification;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
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
    return await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
  } catch (error) {
    console.error("Error getting push token:", error);
  }
}


export const usePushNotifications = (): PushNotificationState => {
  const [expoPushToken, setExpoPushToken] =
    useState<Notifications.ExpoPushToken>();
  const [notification, setNotification] =
    useState<Notifications.Notification>();

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

    notificationListener.current =
      Notifications.addNotificationReceivedListener(setNotification);

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse,
      );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [handleNotificationResponse]);

  return { expoPushToken, notification };
};
