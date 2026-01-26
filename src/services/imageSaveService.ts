/**
 * Image Save Service
 * WebView에서 받은 base64 이미지를 갤러리에 저장합니다.
 */
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

export type SaveImageResult =
  | { success: true }
  | {
      success: false;
      error:
        | 'PERMISSION_DENIED'
        | 'PERMISSION_DENIED_NEVER_ASK'
        | 'SAVE_FAILED'
        | 'NOT_ANDROID';
    };

export const imageSaveService = {
  /**
   * Base64 데이터 URL을 갤러리에 저장
   * @param dataUrl - data:image/png;base64,... 형식
   * @param filename - 저장할 파일명
   */
  saveBase64Image: async (
    dataUrl: string,
    filename: string,
  ): Promise<SaveImageResult> => {
    if (Platform.OS !== 'android') {
      console.warn('[ImageSaveService] Only Android is supported');
      return { success: false, error: 'NOT_ANDROID' };
    }

    try {
      // 1. 권한 요청 (Android 13+ 에서는 READ_MEDIA_IMAGES)
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        return { success: false, error: 'PERMISSION_DENIED' };
      }

      // 2. Base64 데이터 추출
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');

      // 3. 임시 파일로 저장
      const tempPath = `${RNFS.CachesDirectoryPath}/${filename}`;
      await RNFS.writeFile(tempPath, base64Data, 'base64');

      // 4. 갤러리에 저장
      await CameraRoll.saveAsset(tempPath, { type: 'photo' });

      // 5. 임시 파일 삭제
      await RNFS.unlink(tempPath);

      console.log('[ImageSaveService] Image saved to gallery:', filename);
      // 성공 시 UI 처리는 호출부에서 담당 (토스트는 FE에서 이미 띄움)
      return { success: true };
    } catch (error) {
      console.error('[ImageSaveService] Failed to save image:', error);
      return { success: false, error: 'SAVE_FAILED' };
    }
  },
};

/**
 * Android 저장소 권한 요청
 */
const requestStoragePermission = async (): Promise<boolean> => {
  try {
    // Android 13 (API 33) 이상
    const sdkVersion =
      typeof Platform.Version === 'string'
        ? parseInt(Platform.Version, 10)
        : Platform.Version;

    if (sdkVersion >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    // Android 12 이하
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('[ImageSaveService] Permission request failed:', error);
    return false;
  }
};
