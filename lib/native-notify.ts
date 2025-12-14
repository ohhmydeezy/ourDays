import Constants from "expo-constants";

// The variables are injected into Constants.expoConfig.extra during the Expo build process
const extra = Constants.expoConfig?.extra;

const DEFAULT_ID = 32911;
const DEFAULT_TOKEN = "cDiPfJDgsxD1ZdqMIdQJE3";

// 1. Retrieve the App ID from Expo Constants, looking for the EXPO_PUBLIC_ prefix first.
const appIdFromEnv = extra?.EXPO_PUBLIC_NATIVE_NOTIFY_APP_ID;
export const NATIVE_NOTIFY_APP_ID: number =
  (typeof appIdFromEnv === "string"
    ? parseInt(appIdFromEnv, 10)
    : appIdFromEnv) ?? DEFAULT_ID;

// 2. Safely retrieve the App Token from Expo Constants.
export const NATIVE_NOTIFY_APP_TOKEN: string =
  extra?.EXPO_PUBLIC_NATIVE_NOTIFY_APP_TOKEN ?? DEFAULT_TOKEN;

if (
  NATIVE_NOTIFY_APP_ID === DEFAULT_ID ||
  NATIVE_NOTIFY_APP_TOKEN === DEFAULT_TOKEN
) {
  console.warn(
    "Native Notify credentials are missing from Expo Config 'extra'. Using default values."
  );
}
