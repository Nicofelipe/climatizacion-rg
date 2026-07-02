import {
    BorderRadius,
    Colors,
    Spacing,
    Typography,
} from '@/theme';
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },

  label: {
    marginBottom: Spacing.sm,
    fontSize: Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.body,
    backgroundColor: Colors.white,
  },

  error: {
    marginTop: Spacing.xs,
    color: Colors.danger,
    fontSize: Typography.small,
  },
});