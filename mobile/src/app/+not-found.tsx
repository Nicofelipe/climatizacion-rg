import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Página no encontrada
      </Text>

      <Link href="/" style={styles.link}>
        Volver al inicio
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },

  title: {
    fontSize: Typography.heading,
    fontWeight: '700',
    color: Colors.text,
  },

  link: {
    marginTop: Spacing.md,
    color: Colors.primary,
    fontSize: Typography.body,
  },
});