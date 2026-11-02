import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Text } from "react-native-paper";

type LoadingOverlayProps = {
  visible: boolean;
  message: string;
};

export default function LoadingOverlay({
  visible,
  message = "Just a moment...",
}: LoadingOverlayProps) {
  const [heartScale] = useState(() => new Animated.Value(1));
  const [dot1] = useState(() => new Animated.Value(0.3));
  const [dot2] = useState(() => new Animated.Value(0.3));
  const [dot3] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    if (!visible) return;

    const heartAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.18,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const animatedDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay(450),
        ]),
      );

    const dotsAnimation = Animated.parallel([
      animatedDot(dot1, 0),
      animatedDot(dot2, 150),
      animatedDot(dot3, 300),
    ]);

    heartAnimation.start();
    dotsAnimation.start();

    return () => {
      heartAnimation.stop();
      dotsAnimation.stop();
    };
  }, [visible, heartScale, dot1, dot2, dot3]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <MaterialCommunityIcons
              name="heart"
              size={70}
              color={"rgba(255, 228, 233, 0.92)"}
            />
          </Animated.View>
          <View style={styles.dotsContainer}>
            {[dot1, dot2, dot3].map((dot, index) => (
              <Animated.View
                key={index}
                style={[styles.dot, { opacity: dot }]}
              />
            ))}
          </View>
          <ActivityIndicator size="large" color="#8873FF" />
          <Text style={styles.message}> {message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 10,
    backgroundColor: "#7381FF",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: "#7381FF",
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: "center",
    minWidth: 240,
    maxWidth: "85%",
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#dbdbdb",
    textAlign: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "rgba(255, 228, 233, 0.92)",
  },
});
