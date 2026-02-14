import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS, SPACING, FONTS } from '../theme/theme'

type ChatBubbleProps = {
  message: string
  isSender: boolean
  timestamp: string
}

export const ChatBubble = ({ message, isSender, timestamp }: ChatBubbleProps) => {
  return (
    <View style={[styles.container, isSender ? styles.senderContainer : styles.receiverContainer]}>
      <View style={[styles.bubble, isSender ? styles.senderBubble : styles.receiverBubble]}>
        <Text style={[styles.messageText, isSender ? styles.senderText : styles.receiverText]}>
          {message}
        </Text>
      </View>
      <Text style={styles.timestamp}>{timestamp}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    maxWidth: '80%',
  },
  senderContainer: {
    alignSelf: 'flex-end',
  },
  receiverContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: SPACING.md,
    borderRadius: 20,
  },
  senderBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  receiverBubble: {
    backgroundColor: COLORS.background,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  senderText: {
    color: COLORS.white,
  },
  receiverText: {
    color: COLORS.text,
  },
  timestamp: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
    marginHorizontal: SPACING.sm,
    textAlign: 'right',
  },
})
