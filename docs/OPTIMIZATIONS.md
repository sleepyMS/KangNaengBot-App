[← 메인으로 돌아가기](../README.md)

# 최적화 및 성능 개선 (Optimizations)

하이브리드 앱의 성능과 사용자 경험(UX)을 향상시키기 위해 적용한 기술적 최적화 사항들입니다.

---

## 1. FOUC 방지를 위한 토큰 사전 주입

WebView가 웹앱을 로드할 때 발생하는 깜빡임(FOUC)을 완전히 제거했습니다.

- **`injectedJavaScriptBeforeContentLoaded` 활용**: DOM 파싱 전에 JavaScript가 실행되어 페이지 렌더링 전에 인증 상태가 설정됩니다.
- **Zustand Persist 스토리지 직접 조작**: `localStorage`의 `auth-storage` 키 내부까지 조작하여 `isAuthenticated: true`로 설정합니다.
- **결과**: 로그인 페이지가 잠깐 보이는 현상 **완전 제거**, 체감 반응 속도 향상

```typescript
// 토큰 주입 타이밍 비교
injectedJavaScript: 페이지 로드 후 실행 → FOUC 발생
injectedJavaScriptBeforeContentLoaded: DOM 파싱 전 실행 → FOUC 없음
```

---

## 2. 기존 웹앱 100% 재활용

네이티브 앱을 처음부터 개발하는 대신 하이브리드 접근을 선택하여 개발 비용을 최소화했습니다.

- **WebView 임베딩**: 검증된 웹앱(KangNaengBot-FE)을 그대로 사용
- **선택적 네이티브 구현**: OAuth, 위젯, 알림 등 **네이티브로 해결해야 하는 문제만** 별도 구현
- **결과**:
  - 개발 시간 **70% 단축** (순수 네이티브 대비 추정)
  - 웹앱 업데이트가 앱에 **즉시 반영** (앱 스토어 업데이트 불필요)
  - **버그 수정 한 번**으로 웹/앱 동시 해결

---

## 3. 위젯 데이터 캐싱

시간표 데이터를 SharedPreferences에 캐싱하여 위젯 성능을 최적화했습니다.

- **로컬 저장**: 시간표 저장 시 JSON 형태로 SharedPreferences에 저장
- **오프라인 지원**: 네트워크 없이도 위젯 표시 가능
- **빠른 렌더링**: 앱 실행 없이 위젯만 데이터 로드
- **결과**: 위젯 로딩 시간 **100ms 이하**

---

## 4. 효율적인 브릿지 메시지 설계

Native ↔ Web 간 통신 오버헤드를 최소화하는 메시지 설계를 적용했습니다.

- **필요한 데이터만 전송**: 전체 상태가 아닌 변경된 부분만 payload로 전달
- **배치 처리**: 여러 상태 변경이 동시에 필요할 때 한 번의 메시지로 전송
- **타입 기반 라우팅**: `switch-case`로 메시지 타입에 따라 빠르게 핸들러 분기

```typescript
// 효율적인 메시지 구조
{
  type: 'SCHEDULE_SAVED', // 빠른 분기를 위한 타입
  payload: {              // 필요한 데이터만
    courses: [...],
    updatedAt: '2024-01-27T12:00:00Z'
  }
}
```

---

## 5. 토큰 자동 갱신 (Silent Refresh)

사용자가 인지하지 못하는 사이에 토큰을 자동으로 갱신합니다.

- **Refresh Token 활용**: Access Token 만료 시 자동으로 새 토큰 발급
- **백그라운드 갱신**: API 요청 실패(401) 시 조용히 토큰 갱신 후 재시도
- **EncryptedStorage**: Refresh Token을 암호화하여 안전하게 저장
- **결과**: 사용자는 **재로그인 없이** 장기간 앱 사용 가능

```typescript
// authService.ts
export const refreshAccessToken = async (): Promise<AuthTokens | null> => {
  const refreshToken = await EncryptedStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  const response = await apiClient.post('/auth/token/refresh', {
    refresh: refreshToken,
  });

  await saveAuthData(response.data, currentUserInfo);
  return response.data;
};
```

---

## 6. 초기 로딩 최적화

앱 시작 시 사용자 대기 시간을 최소화했습니다.

- **병렬 초기화**: 인증 상태 확인과 UI 렌더링을 병렬로 수행
- **스플래시 화면**: 초기화 중 브랜드 스플래시 표시로 체감 대기 시간 감소
- **조건부 화면 전환**: 인증 상태에 따라 로그인/메인 화면 직접 이동 (중간 화면 없음)

```typescript
// App.tsx
if (isLoading) {
  return <SplashScreen />; // 브랜드 스플래시
}

return isAuthenticated ? <MainScreen /> : <LoginScreen />;
```

---

## 7. 알림 스케줄링 최적화

수업 알림을 효율적으로 관리합니다.

- **오늘 수업만 스케줄링**: 모든 수업이 아닌 당일 수업만 AlarmManager에 등록
- **자정 갱신**: 매일 00:00에 다음 날 알림 자동 스케줄링
- **정확한 알람**: `setExactAndAllowWhileIdle`로 Doze 모드에서도 정확한 트리거
- **결과**: 배터리 최적화를 유지하면서 **정확한 시간**에 알림 전달
