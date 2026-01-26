import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../../services/notificationService';

const KEY_NOTI_ENABLED = 'setting_noti_enabled';
const KEY_NOTI_OFFSET = 'setting_noti_offset';

export const NotificationSettings = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [offset, setOffset] = useState(10); // Default 10 min

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const enabledStr = await AsyncStorage.getItem(KEY_NOTI_ENABLED);
      const offsetStr = await AsyncStorage.getItem(KEY_NOTI_OFFSET);

      const enabled = enabledStr === 'true';
      const parsedOffset = offsetStr ? parseInt(offsetStr, 10) : 10;

      setIsEnabled(enabled);
      setOffset(parsedOffset);
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const handleToggle = async (value: boolean) => {
    if (value) {
      // Check permission when turning on
      const hasPermission =
        await notificationService.checkAndRequestPermission();
      if (!hasPermission) {
        // Permission denied, maybe show alert
        return;
      }
    }

    setIsEnabled(value);
    await AsyncStorage.setItem(KEY_NOTI_ENABLED, String(value));

    // Sync with Native
    notificationService.setSettings(value, offset);
  };

  const handleOffsetChange = async (newOffset: number) => {
    setOffset(newOffset);
    await AsyncStorage.setItem(KEY_NOTI_OFFSET, String(newOffset));

    // Sync with Native (only if enabled, or just sync anyway to save pref)
    notificationService.setSettings(isEnabled, newOffset);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>수업 전 알림</Text>
          <Text style={styles.subtitle}>
            오늘의 수업 시작 전에 알림을 받습니다.
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#767577', true: '#818cf8' }}
          thumbColor={isEnabled ? '#4f46e5' : '#f4f3f4'}
        />
      </View>

      {isEnabled && (
        <View style={styles.optionsContainer}>
          <Text style={styles.label}>알림 시간</Text>
          <View style={styles.pillContainer}>
            {[5, 10, 15, 30].map(min => (
              <TouchableOpacity
                key={min}
                style={[styles.pill, offset === min && styles.pillActive]}
                onPress={() => handleOffsetChange(min)}
              >
                <Text
                  style={[
                    styles.pillText,
                    offset === min && styles.pillTextActive,
                  ]}
                >
                  {min}분 전
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  optionsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#4f46e5',
  },
  pillText: {
    fontSize: 14,
    color: '#4b5563',
  },
  pillTextActive: {
    color: '#4f46e5',
    fontWeight: '600',
  },
});
