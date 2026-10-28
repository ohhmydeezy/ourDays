import { client } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { useCallback, useEffect, useState } from "react";
import { Functions, ExecutionMethod } from "react-native-appwrite";

export const FREE_MESSAGE_LIMIT = 5;
const functions = new Functions(client);
const FUNCTION_ID = process.env.EXPO_PUBLIC_CONCIERGE_FUNCTION_ID!;

type QuotaStatus = {
  isPro: boolean;
  remaining: number;
  error?: string;
};

export function useChatQuota(_isSubscribed: boolean) {
  const { user } = useAuth();

  const [remaining, setRemaining] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshQuota = useCallback(async () => {
    if (!user?.$id) {
      setRemaining(0);
      setIsPro(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({ action: "status" }),
        false,
        "/",
        ExecutionMethod.POST,
      );

      if (execution.status !== "completed") {
        throw new Error("Quota function execution failed");
      }

      if (execution.status !== "completed") {
        throw new Error("Dory Function execution failed");
      }

      let data: QuotaStatus;

      try {
        data = JSON.parse(execution.responseBody || "{}");
      } catch {
        throw new Error("Dory returned invalid JSON");
      }

      if (data.error || typeof data.remaining !== "number") {
        throw new Error(data.error || "Invalid quota response");
      }
      setRemaining(data.remaining);
      setIsPro(data.isPro === true);
    } catch (error) {
      console.error("Quota fetch error:", error);
      setRemaining(0);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshQuota();
  }, [refreshQuota]);

  const updateQuota = useCallback((newRemaining: number, newIsPro: boolean) => {
    setRemaining(newRemaining);
    setIsPro(newIsPro);
  }, []);
  const canSend = !loading && (isPro || remaining > 0);

  return {
    remaining,
    canSend,
    loading,
    isPro,
    refreshQuota,
    updateQuota,
  };
}
