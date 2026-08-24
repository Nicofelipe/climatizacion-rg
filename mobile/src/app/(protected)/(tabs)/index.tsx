import { Text } from "react-native";

import AppContainer from "@/components/layout/AppContainer";

export default function Dashboard() {
  return (
    <AppContainer>
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
        }}
      >
        Climatización RG
      </Text>

      <Text
        style={{
          marginTop: 10,
        }}
      >
        Bienvenido 👋
      </Text>
    </AppContainer>
  );
}