/**
 * 네트워크 상태 감지 Hook
 * 오프라인 감지 및 연결 복구 시 콜백 지원
 */
import { useEffect, useState, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

interface UseNetworkStatusOptions {
  onReconnect?: () => void;
  onDisconnect?: () => void;
}

export const useNetworkStatus = (options?: UseNetworkStatusOptions) => {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
  });

  // refs로 최신 값 추적 (의존성 배열 문제 방지)
  const wasDisconnectedRef = useRef(false);
  const prevConnectedRef = useRef(true);
  const optionsRef = useRef(options);

  // options 업데이트
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const handleNetworkChange = (state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable;

      // 연결 복구 감지
      if (
        wasDisconnectedRef.current &&
        isConnected &&
        isInternetReachable !== false
      ) {
        optionsRef.current?.onReconnect?.();
        wasDisconnectedRef.current = false;
      }

      // 연결 끊김 감지
      if (!isConnected && prevConnectedRef.current) {
        optionsRef.current?.onDisconnect?.();
        wasDisconnectedRef.current = true;
      }

      prevConnectedRef.current = isConnected;

      setStatus({
        isConnected,
        isInternetReachable,
        type: state.type,
      });
    };

    // 초기 상태 확인
    NetInfo.fetch().then(handleNetworkChange);

    // 상태 변화 구독
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    return () => unsubscribe();
  }, []); // 빈 의존성 배열 - 한 번만 구독

  const isOffline = !status.isConnected || status.isInternetReachable === false;

  return {
    ...status,
    isOffline,
  };
};

/**
 * 간단한 오프라인 체크
 */
export const checkNetworkConnection = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return (state.isConnected ?? false) && state.isInternetReachable !== false;
};
