import { useCallback, useEffect, useState } from "react";
import Purchases, { CustomerInfo } from "react-native-purchases";

export function useSubscription() {
  const [isSubscribed, setisSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const updateSubscription = useCallback((info: CustomerInfo) => {
    const hasPro = info.entitlements.active["ourdays_pro"] !== undefined

  setisSubscribed(hasPro)
  }, [])

  const refreshSubscription = useCallback(async () => {
    setLoading(true)

    try {
      const info = await Purchases.getCustomerInfo()
      updateSubscription(info)
      return info
    } catch(error) {
      console.log("Customer info error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [updateSubscription])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSubscription().catch(() => {})

    Purchases.addCustomerInfoUpdateListener(updateSubscription);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(updateSubscription);
    };
  }, [refreshSubscription, updateSubscription]);

  return { isSubscribed, loading, refreshSubscription };
}
