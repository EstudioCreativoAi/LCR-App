import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SPACING, FONTS } from '../theme/theme';

interface LeadModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (message: string, moveInDate: Date | null) => void;
  propertyTitle?: string;
}

export default function LeadModal({
  visible,
  onClose,
  onConfirm,
  propertyTitle,
}: LeadModalProps) {
  const [message, setMessage] = useState('');
  const [moveInDate, setMoveInDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select move-in date';
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleConfirm = () => {
    onConfirm(message, moveInDate);
    setMessage('');
    setMoveInDate(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.header}>
            Express Interest
            {propertyTitle ? ` • ${propertyTitle}` : ''}
          </Text>
          <Text style={styles.instruction}>
            Add a message and your preferred move-in date. The landlord will
            receive your inquiry.
          </Text>

          <Text style={styles.inputLabel}>Message (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. I'm interested in viewing this property..."
            placeholderTextColor={COLORS.muted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Move-in Date</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerButtonText}>
              {formatDate(moveInDate)}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={moveInDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setMoveInDate(selectedDate);
              }}
            />
          )}

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>Send Inquiry</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: SPACING.lg,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  instruction: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  textInput: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    marginBottom: SPACING.md,
    minHeight: 80,
  },
  datePickerButton: {
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  datePickerButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  confirmButtonText: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
    fontSize: 16,
  },
});
