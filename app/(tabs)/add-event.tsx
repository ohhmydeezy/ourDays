import { useAuth } from "@/lib/auth-context";
import { View } from "react-native";
import { Text } from "react-native-paper";

export default function AddEventScreen() {
      const { user } = useAuth();

      return (
        <View>
          <Text>Hello</Text>
        </View>
      );

}