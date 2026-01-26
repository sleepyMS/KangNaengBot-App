import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

const { NotificationModule } = NativeModules;

export const notificationService = {
  /**
   * 알림 설정 저장 및 갱신
   * @param enabled 알림 켜기/끄기
   * @param offsetMinutes 수업 시작 몇 분 전에 알릴지
   */
  setSettings: (enabled: boolean, offsetMinutes: number) => {
    if (Platform.OS !== 'android') return;
    NotificationModule.setNotificationSettings(enabled, offsetMinutes);
  },

  /**
   * 알림 데이터 즉시 갱신 (시간표 변경 시 호출)
   */
  refreshNotifications: () => {
    if (Platform.OS !== 'android') return;
    NotificationModule.updateNotifications();
  },

  /**
   * 권한 상태 확인 (다이얼로그 띄우지 않음)
   */
  checkPermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    if (Platform.Version < 33) return true; // Android 12 이하는 자동 허용

    const result = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result;
  },

  /**
   * 권한 요청 (시스템 다이얼로그 표시)
   */
  requestPermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    if (Platform.Version < 33) return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  },

  /**
   * (Deprecated) 기존 함수 호환용
   */
  checkAndRequestPermission: async (): Promise<boolean> => {
    return notificationService.requestPermission();
  },
};
