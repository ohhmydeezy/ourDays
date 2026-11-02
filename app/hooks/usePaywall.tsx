import { useCallback, useState } from "react";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

export function usePaywall() {
  const [isProcessing, setIsProcessing] = useState(false);

  const openPaywall = useCallback(async () => {
    if (isProcessing) return false;
    try {
      const result = await RevenueCatUI.presentPaywall();

      if (
        result !== PAYWALL_RESULT.PURCHASED &&
        result !== PAYWALL_RESULT.RESTORED
      ) {
        return false;
      }
      setIsProcessing(true);
      const customerInfo = await Purchases.getCustomerInfo();

      return customerInfo.entitlements.active["ourdays_pro"] !== undefined;
    } catch (error) {
      console.error("Paywall error:", error);
    }
  }, [isProcessing]);

  return { openPaywall, isProcessing };
}
