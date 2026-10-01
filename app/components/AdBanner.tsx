import { View, StyleSheet } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";

export default function AdBanner() {
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
