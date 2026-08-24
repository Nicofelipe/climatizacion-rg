import { ReactNode } from "react";

import { SafeAreaView } from "react-native-safe-area-context";

import styles from "./AppContainer.styles";

interface Props {
  children: ReactNode;
}

export default function AppContainer({
  children,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      {children}
    </SafeAreaView>
  );
}