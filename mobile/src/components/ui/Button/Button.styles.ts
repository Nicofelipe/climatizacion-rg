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
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
  },

  text: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  disabled: {
    opacity: 0.6,
  },
});
