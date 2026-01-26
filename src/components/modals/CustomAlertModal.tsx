import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  useColorScheme,
} from 'react-native';
import { useModalStore, ModalType } from '../../stores/useModalStore';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react-native';

const iconComponents: Record<ModalType, React.ReactNode> = {
  info: <Info size={48} color="#6366f1" />, // primary-500
  warning: <AlertTriangle size={48} color="#f59e0b" />, // amber-500
  success: <CheckCircle size={48} color="#22c55e" />, // green-500
  danger: <XCircle size={48} color="#ef4444" />, // red-500
};

export const CustomAlertModal = () => {
  const {
    isOpen,
    type,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    showCancel,
    closeModal,
  } = useModalStore();

  const isDark = useColorScheme() === 'dark';

  const handleConfirm = () => {
    onConfirm();
    closeModal();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    closeModal();
  };

  // Dynamic Styles based on Theme
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
    },
    title: {
      color: isDark ? '#f1f5f9' : '#1e293b',
    },
    message: {
      color: isDark ? '#cbd5e1' : '#475569',
    },
    cancelButton: {
      borderColor: isDark ? '#475569' : '#e2e8f0',
    },
    cancelText: {
      color: isDark ? '#cbd5e1' : '#64748b',
    },
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={closeModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, dynamicStyles.container]}>
              {/* Icon */}
              <View style={styles.iconContainer}>{iconComponents[type]}</View>

              {/* Title */}
              <Text style={[styles.title, dynamicStyles.title]}>{title}</Text>

              {/* Message */}
              <Text style={[styles.message, dynamicStyles.message]}>
                {message}
              </Text>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                {showCancel && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.cancelButton,
                      dynamicStyles.cancelButton,
                    ]}
                    onPress={handleCancel}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        dynamicStyles.cancelText,
                      ]}
                    >
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.button,
                    type === 'danger'
                      ? styles.dangerButton
                      : styles.primaryButton,
                    !showCancel && { flex: 1 },
                  ]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmButtonText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: '#6366f1', // primary-500
  },
  dangerButton: {
    backgroundColor: '#ef4444', // red-500
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
