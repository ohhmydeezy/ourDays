import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { useSubsciption } from "../hooks/useSubscription";

interface AdBannerProps {
  style?: StyleProp<ViewStyle>;
}

export default function AdBanner({ style }: AdBannerProps) {
  const { isSubscribed, loading } = useSubsciption();

  if (loading || isSubscribed) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={
          __DEV__ ? TestIds.BANNER : "ca-app-pub-9563072327560542/3513559895"
        }
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
