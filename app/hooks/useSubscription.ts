import { useEffect, useState } from "react";
import Purchases, { CustomerInfo } from "react-native-purchases";

export function useSubscription() {
  const [isSubscribed, setisSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const update = (info: CustomerInfo) =>
      setisSubscribed(info.entitlements.active["ourdays_pro"] !== undefined);

    Purchases.getCustomerInfo()
      .then(update)
      .catch((e) => console.log("Customer info error:", e))
      .finally(() => setLoading(false));

    Purchases.addCustomerInfoUpdateListener(update);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(update);
    };
  }, []);

  return { isSubscribed, loading };
}
