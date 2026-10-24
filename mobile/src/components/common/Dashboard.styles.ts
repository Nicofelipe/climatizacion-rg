import { StyleSheet } from "react-native";

import {
  Colors,
  Spacing,
  Typography
} from "@/theme";

export default StyleSheet.create({
  title: {
    fontSize: Typography.title,
    fontWeight: "700",
    color: Colors.text,
  },

  subtitle: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: Typography.body,
  },

  cardsContainer: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
});