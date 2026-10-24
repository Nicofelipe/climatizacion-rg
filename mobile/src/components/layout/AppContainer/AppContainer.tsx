import { ReactNode } from "react";

import { View } from "react-native";

import styles from "./AppContainer.styles";

interface Props {
  children: ReactNode;
}

export default function AppContainer({
  children,
}: Props) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}
