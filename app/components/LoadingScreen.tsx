import { View, StyleSheet, Text } from "react-native"
import { ActivityIndicator } from "react-native-paper"


type Props = {
    message?: string
}



export default function LoadingScreen({message = "just a minute..."}: Props) {
    return (
        <View style={styles.container}>
            <ActivityIndicator style={styles.message} />
            <Text>{message}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#7381FF",
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: "#333333",
  },
});