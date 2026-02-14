import { StyleSheet } from 'react-native'
import { COLORS, SPACING, FONTS } from './theme'

export const formStyles = StyleSheet.create({
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  instructionalText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
})
