
export const NATIVE_NOTIFY_APP_ID = Number(
  process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_ID!
);

export const NATIVE_NOTIFY_APP_TOKEN =
  process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_TOKEN!;

if (!NATIVE_NOTIFY_APP_ID || !NATIVE_NOTIFY_APP_TOKEN) {
  throw new Error(
    "❌ Native Notify credentials missing. " +
      "Ensure EXPO_PUBLIC_NATIVE_NOTIFY_APP_ID and " +
      "EXPO_PUBLIC_NATIVE_NOTIFY_APP_TOKEN are set in EAS."
  );
}
