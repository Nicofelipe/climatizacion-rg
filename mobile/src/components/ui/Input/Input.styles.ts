import {
    BorderRadius,
    Colors,
    Spacing,
    Typography,
} from '@/theme';
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    marginBottom: 12,
  },

  label: {
    marginBottom: Spacing.sm,
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.body,
    backgroundColor: Colors.white,
    minHeight: 50,
  },

  error: {
    marginTop: Spacing.xs,
    color: Colors.danger,
    fontSize: Typography.small,
  },
});
