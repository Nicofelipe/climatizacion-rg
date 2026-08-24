import {
    BorderRadius,
    Colors,
    Spacing,
    Typography,
} from '@/theme';
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },

  text: {
    color: Colors.white,
    fontSize: Typography.body,
    fontWeight: '600',
  },

  disabled: {
    opacity: 0.6,
  },
});