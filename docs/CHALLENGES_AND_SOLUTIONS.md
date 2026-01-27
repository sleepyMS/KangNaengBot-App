[← 메인으로 돌아가기](../README.md)

# 개발 중 직면한 어려움과 해결 과정 (Challenges & Solutions)

하이브리드 앱 개발 과정에서 마주친 기술적 난관들과 이를 극복하기 위해 적용한 해결책들을 정리했습니다.

---

## 1. 인앱 브라우저에서 Google OAuth 차단

**문제점 (Challenge):**

카카오톡, 인스타그램 등의 인앱 브라우저에서 웹앱을 열면 Google OAuth 로그인이 차단됩니다.
Google은 보안상의 이유로 임베디드 WebView에서의 OAuth를 금지하고 있습니다.

기존 웹앱에서는 "외부 브라우저에서 열기" 버튼으로 우회했지만, 이는 사용자 경험을 크게 저하시켰습니다.

**해결책 (Solution):**

- **네이티브 Google Sign-In SDK 도입**: `@react-native-google-signin/google-signin` 패키지를 사용하여 **시스템 브라우저(Chrome Custom Tabs)**를 통해 로그인하도록 구현했습니다.
- **ID Token 기반 인증**: Google에서 받은 `idToken`을 백엔드로 전송하여 자체 `accessToken`을 발급받는 흐름으로 변경했습니다.
- **결과**: 앱 설치 사용자는 어떤 환경에서든 원클릭으로 Google 로그인이 가능해졌습니다.

---

## 2. FOUC (Flash of Unstyled Content) 현상

**문제점 (Challenge):**

WebView가 웹앱을 로드할 때, JavaScript가 실행되기 전까지 짧은 순간 로그인 페이지가 보였다가 메인 페이지로 전환되는 "깜빡임" 현상이 발생했습니다.

원인:

1. WebView가 열림
2. 웹앱의 RouteGuard가 실행됨
3. localStorage에 토큰이 없음 → "미인증 상태" 판단
4. 로그인 페이지로 리다이렉트
5. 이후 네이티브에서 토큰 주입됨
6. 다시 메인 페이지로 리다이렉트

**해결책 (Solution):**

- **`injectedJavaScriptBeforeContentLoaded` 사용**: 일반 `injectedJavaScript`는 페이지 로드 **후** 실행되지만, `BeforeContentLoaded`는 DOM 파싱 **전**에 실행됩니다.
- **Zustand Persist 스토리지 직접 조작**: 단순히 `localStorage.setItem('access_token')`만으로는 부족했습니다. Zustand의 persist 미들웨어가 사용하는 `auth-storage` 키의 내부 상태까지 직접 조작하여 `isAuthenticated: true`로 설정했습니다.
- **결과**: 페이지 로드 전에 인증 상태가 완전히 설정되어 FOUC가 완전히 사라졌습니다.

---

## 3. 양방향 상태 동기화 설계

**문제점 (Challenge):**

네이티브 앱과 웹앱 사이에 동기화해야 할 상태가 많았습니다:

- 인증 상태 (토큰, 사용자 정보)
- 테마 (다크/라이트)
- 언어 (한국어/영어/일본어/중국어)
- 시간표 데이터 (위젯용)
- 알림 권한 상태

어느 쪽에서 변경이 발생해도 다른 쪽이 이를 감지하고 반영해야 했습니다.

**해결책 (Solution):**

- **브릿지 메시지 타입 설계**: 명확한 메시지 타입(`SCHEDULE_SAVED`, `LOGOUT`, `THEME_CHANGED` 등)을 정의하여 양방향 통신을 체계화했습니다.
- **Web → Native**: WebView의 `onMessage` 이벤트로 수신
- **Native → Web**: `webViewRef.current?.postMessage()`로 전송, 또는 `injectedJavaScriptBeforeContentLoaded`로 초기 상태 주입
- **결과**: 웹에서 로그아웃하면 위젯이 초기화되고, 네이티브에서 알림 권한이 변경되면 웹의 설정 UI가 업데이트됩니다.

---

## 4. 위젯 데이터 형식 불일치

**문제점 (Challenge):**

웹앱의 시간표 데이터 구조와 Android 위젯이 필요로 하는 데이터 구조가 달랐습니다.

웹앱 데이터:

```javascript
{
  courses: [
    {
      name: '알고리즘',
      slots: [{ day: '월', startTime: '09:00', endTime: '10:30' }],
    },
  ];
}
```

위젯 필요 데이터:

```kotlin
data class WidgetClassItem(
    val day: Int,  // 0=일요일, 1=월요일...
    val title: String,
    val location: String,
    val startMinutes: Int,  // 0:00부터의 분
    val color: Int  // Android Color int
)
```

**해결책 (Solution):**

- **widgetService 레이어 도입**: React Native와 Kotlin 네이티브 모듈 사이에 데이터 변환 레이어를 두었습니다.
- **요일 매핑**: 문자열("월", "화") → 숫자(1, 2)
- **시간 파싱**: "09:30" → 570분 (9\*60+30)
- **색상 변환**: "#6366f1" → ARGB int
- **결과**: 각 레이어가 자신에게 익숙한 형식으로 데이터를 다룰 수 있게 되었습니다.

---

## 5. 하드웨어 백버튼 이벤트 손실

**문제점 (Challenge):**

Android의 하드웨어 백버튼을 처리하기 위해 `BackHandler.addEventListener`를 등록했는데, 앱이 백그라운드로 갔다가 포그라운드로 돌아오면 백버튼이 동작하지 않는 현상이 발생했습니다.

**해결책 (Solution):**

- **AppState 리스너 추가**: `AppState.addEventListener('change')`를 사용하여 앱 상태 변화를 감지합니다.
- **리스너 재등록**: `active` 상태로 돌아올 때 `BackHandler` 리스너를 다시 등록합니다.
- **클린업 철저**: `useEffect` 반환 함수에서 두 리스너 모두 해제합니다.
- **결과**: 앱 상태와 관계없이 백버튼이 항상 정상 동작합니다.

---

## 6. 위젯 자정 갱신

**문제점 (Challenge):**

시간표 위젯은 "오늘의 수업"을 보여주는데, 자정이 지나도 어제의 수업이 계속 표시되는 문제가 있었습니다.

**해결책 (Solution):**

- **AlarmManager 자정 알람**: 매일 00:00에 위젯 갱신을 트리거하는 알람을 등록했습니다.
- **BootReceiver**: 기기 재부팅 시에도 알람이 다시 등록되도록 `BOOT_COMPLETED` 브로드캐스트 리시버를 구현했습니다.
- **결과**: 자정이 지나면 자동으로 오늘의 시간표로 갱신됩니다.
