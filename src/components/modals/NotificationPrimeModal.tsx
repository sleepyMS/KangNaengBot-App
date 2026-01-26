import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../../services/notificationService';

const KEY_HAS_SEEN_PRIME = 'has_seen_notification_prime';
const { width } = Dimensions.get('window');

interface NotificationPrimeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAllow: () => void;
}

export const NotificationPrimeModal = ({
  isVisible,
  onClose,
  onAllow,
}: NotificationPrimeModalProps) => {
  const [slideAnim] = useState(new Animated.Value(300)); // Start off-screen

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔔</Text>
          </View>

          <Text style={styles.title}>수업 시작 10분 전 알림</Text>
          <Text style={styles.description}>
            매일 아침 강의실을 확인하는 번거로움 없이,{'\n'}
            수업 전에 미리 강의실과 시간을 알려드릴게요.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>나중에</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={onAllow}>
              <Text style={styles.primaryButtonText}>알림 받기</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const useNotificationPrime = () => {
  const [showPrime, setShowPrime] = useState(false);

  useEffect(() => {
    checkShouldShow();
  }, []);

  const checkShouldShow = async () => {
    try {
      // 1. Check if already seen
      const hasSeen = await AsyncStorage.getItem(KEY_HAS_SEEN_PRIME);
      if (hasSeen === 'true') return;

      // 2. Check if permission already granted (don't show if already ON)
      const isGranted = await notificationService.checkPermission();
      if (isGranted) return;

      // Show Prime Modal
      // Delay slightly for smooth entrance after login
      setTimeout(() => setShowPrime(true), 1500);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAllow = async () => {
    setShowPrime(false);
    await AsyncStorage.setItem(KEY_HAS_SEEN_PRIME, 'true');

    // Request Native Permission
    const granted = await notificationService.requestPermission();
    if (granted) {
      // Enable default settings
      notificationService.setSettings(true, 10);
    }
  };

  const handleClose = async () => {
    setShowPrime(false);
    await AsyncStorage.setItem(KEY_HAS_SEEN_PRIME, 'true');
  };

  return {
    showPrime,
    handleAllow,
    handleClose,
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  container: {
    width: width,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
