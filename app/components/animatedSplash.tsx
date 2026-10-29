import { useEffect, useState } from "react";
import { Animated, View, StyleSheet } from "react-native";

type Props = {
  onFinish: () => void;
};

export default function AnimatedSplash({ onFinish }: Props) {
  const [scale] = useState(() => new Animated.Value(0.85));
  const [opacity] = useState(() => new Animated.Value(0))

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1.08,
          friction: 5,
          tension: 45,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,

          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(500),
    ]);
    animation.start(({ finished }) => {
        if(finished) onFinish()
    })
return () => animation.stop()
  }, [scale, opacity, onFinish]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../../assets/images/logo.png")}
        style={[
          styles.logo,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#eafd71",
      justifyContent: "center",
      alignItems: "center",
    },
    logo: {
      width: 300,
      height: 300,
    },
  });