/**
 * 네트워크 상태 감지 Hook
 * 오프라인 감지 및 연결 복구 시 콜백 지원
 */
import { useEffect, useState, useCallback } from 'react';
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
  const [wasDisconnected, setWasDisconnected] = useState(false);

  const handleNetworkChange = useCallback(
    (state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable;

      // 연결 복구 감지
      if (wasDisconnected && isConnected && isInternetReachable !== false) {
        options?.onReconnect?.();
      }

      // 연결 끊김 감지
      if (!isConnected && status.isConnected) {
        options?.onDisconnect?.();
        setWasDisconnected(true);
      }

      setStatus({
        isConnected,
        isInternetReachable,
        type: state.type,
      });
    },
    [wasDisconnected, status.isConnected, options],
  );

  useEffect(() => {
    // 초기 상태 확인
    NetInfo.fetch().then(handleNetworkChange);

    // 상태 변화 구독
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    return () => unsubscribe();
  }, [handleNetworkChange]);

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
