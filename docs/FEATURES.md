[← 메인으로 돌아가기](../README.md)

# 주요 구현 기능 (Features)

**KangNaengBot-App**에 구현된 주요 기능과 구현 방식에 대한 상세 설명입니다.
이 앱은 기존 웹앱을 WebView로 임베딩하면서, 핵심 UX만 네이티브로 구현한 **하이브리드 아키텍처**입니다.

---

## 1. 네이티브 Google OAuth

**인앱 브라우저(카카오톡, 인스타그램 등)에서 Google OAuth가 차단되는 문제**를 네이티브 SDK로 근본적으로 해결했습니다.

### 핵심 기능

- **시스템 브라우저 사용**: `@react-native-google-signin/google-signin`은 Chrome Custom Tabs를 활용하여 Google 보안 정책을 완벽히 충족
- **ID Token 기반 인증**: Google에서 받은 `idToken`을 백엔드로 전송하여 자체 `accessToken` 발급
- **보안 저장소**: `react-native-encrypted-storage`로 토큰을 암호화하여 저장

### 구현 상세

```typescript
// authService.ts
export const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  if (!response.data?.idToken) {
    throw new AuthError('ID Token을 받지 못했습니다.', 'MISSING_ID_TOKEN');
  }

  return {
    userInfo: response.data.user,
    idToken: response.data.idToken,
  };
};

// 백엔드 인증
export const authenticateWithBackend = async (idToken: string) => {
  const response = await apiClient.post('/auth/google/mobile', {
    id_token: idToken,
  });
  return response.data; // { access_token, refresh_token }
};
```

### 인증 흐름

```
사용자 → 구글 로그인 버튼 클릭
       ↓
React Native → GoogleSignin.signIn()
       ↓
Google SDK → Chrome Custom Tabs 열림
       ↓
사용자 → 구글 계정 선택
       ↓
Google SDK → idToken + userInfo 반환
       ↓
React Native → Backend API (POST /auth/google/mobile)
       ↓
Backend → idToken 검증 후 accessToken 발급
       ↓
React Native → EncryptedStorage에 저장
       ↓
WebView → 토큰 사전 주입 (injectedJavaScript)
```

---

## 2. 하이브리드 WebView 아키텍처

기존 웹앱([KangNaengBot-FE](https://github.com/sleepyMS/KangNaengBot-FE))을 **100% 재활용**하면서 네이티브 기능을 추가하는 핵심 전략입니다.

### 핵심 기능

- **코드 재사용**: 웹앱의 UI/UX, 비즈니스 로직 그대로 사용
- **토큰 사전 주입**: 페이지 로드 전에 localStorage에 토큰 주입 (FOUC 방지)
- **양방향 통신**: Native ↔ Web 간 메시지 브릿지

### 구현 상세: 토큰 사전 주입

```typescript
// WebViewContainer.tsx
const injectedJavaScriptBeforeContentLoaded = React.useMemo(() => {
  return `
    (function() {
      // 앱 환경 표시 (FE에서 감지)
      window.IS_NATIVE_APP = true;
      window.PLATFORM = '${Platform.OS}';
      window.IS_GUEST = ${isGuest};
      
      // 시스템 테마 및 언어 동기화
      window.NATIVE_THEME = '${colorScheme || 'light'}';
      window.NATIVE_LOCALE = '${getDeviceLocale()}';
      
      // 토큰 사전 주입 (RouteGuard가 인증 상태로 인식)
      ${
        accessToken
          ? `
        localStorage.setItem('access_token', '${accessToken}');
        
        // Zustand persist 스토리지 직접 조작
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const data = JSON.parse(authStorage);
          data.state.isAuthenticated = true;
          data.state.user = ${JSON.stringify(userInfo)};
          localStorage.setItem('auth-storage', JSON.stringify(data));
        }
      `
          : ''
      }
      
      true;
    })();
  `;
}, [accessToken, isGuest, colorScheme]);
```

**왜 `injectedJavaScriptBeforeContentLoaded`인가?**

- 일반 `injectedJavaScript`는 페이지 로드 **후** 실행
- 그 사이 FE의 RouteGuard가 "미인증 상태"로 판단 → 로그인 페이지 잠깐 보임 (FOUC)
- `BeforeContentLoaded`는 DOM 파싱 **전** 실행 → 깜빡임 없음

---

## 3. 양방향 브릿지 통신

### 메시지 타입

| 방향         | 타입                         | 용도                        |
| ------------ | ---------------------------- | --------------------------- |
| Native → Web | `NOTIFICATION_STATE_CHANGED` | 알림 권한 상태 동기화       |
| Native → Web | `HARDWARE_BACK_PRESS`        | 백버튼 이벤트 전달          |
| Web → Native | `SCHEDULE_SAVED`             | 시간표 저장 → 위젯 업데이트 |
| Web → Native | `LOGOUT`                     | 로그아웃 → 위젯 초기화      |
| Web → Native | `SESSION_EXPIRED`            | 401 에러 → 재로그인 필요    |
| Web → Native | `REQUEST_LOGIN`              | 게스트 → 로그인 요청        |
| Web → Native | `THEME_CHANGED`              | 테마 변경 동기화            |
| Web → Native | `LOCALE_CHANGED`             | 언어 변경 동기화            |
| Web → Native | `SAVE_IMAGE`                 | 시간표 이미지 저장          |

### 구현 상세: 메시지 처리

```typescript
// WebViewContainer.tsx
const handleMessage = useCallback(
  (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data);

    switch (message.type) {
      case 'SCHEDULE_SAVED':
        // 시간표 저장 → 위젯 업데이트
        widgetService.updateWidget(message.payload);
        break;

      case 'LOGOUT':
        // 웹에서 로그아웃 → 위젯 초기화 + 네이티브 상태 초기화
        widgetService.clearWidget();
        onLogout?.();
        break;

      case 'SESSION_EXPIRED':
        // 401 응답 → 토큰 갱신 또는 재로그인
        onSessionExpired?.();
        break;

      case 'THEME_CHANGED':
        // 웹에서 테마 변경 → 네이티브 상태 동기화
        useSettingsStore.getState().setTheme(message.payload.theme);
        break;
    }
  },
  [onLogout, onSessionExpired],
);
```

---

## 4. Android 홈 위젯

사용자의 시간표를 **홈 화면에서 바로 확인**할 수 있는 Android 위젯입니다.

### 핵심 기능

- **오늘의 시간표 표시**: 현재 요일 기준 수업 목록
- **자동 업데이트**: 시간표 저장 시 위젯 즉시 갱신
- **다크 모드 지원**: 시스템 테마에 따라 자동 전환
- **딥 링크**: 위젯 클릭 시 앱으로 이동

### 아키텍처

```
WebView (FE)
    │ postMessage({type: 'SCHEDULE_SAVED', payload})
    ▼
WebViewContainer.tsx
    │ widgetService.updateWidget(payload)
    ▼
widgetService.ts
    │ 데이터 변환 (slots → WidgetClassItem[])
    │ 겹치는 수업 열 계산
    │ WidgetModule.updateScheduleData(JSON)
    ▼
WidgetModule.kt (Native Bridge)
    │ SharedPreferences에 저장
    │ notifyAppWidgetViewDataChanged()
    ▼
ScheduleWidgetProvider.kt
    │ RemoteViews 업데이트
    ▼
Android 홈 화면 위젯 갱신
```

### 구현 상세: 데이터 변환

```typescript
// widgetService.ts
export const widgetService = {
  updateWidget: async (scheduleData: ScheduleData) => {
    if (Platform.OS !== 'android') return;

    const now = dayjs();
    const rawList = scheduleData.courses || scheduleData.classes || [];

    // 수업 데이터 변환
    const allClasses: WidgetClassItem[] = [];
    rawList.forEach(course => {
      course.slots?.forEach(slot => {
        allClasses.push({
          id: course.id,
          title: course.name || '수업',
          location: slot.location || '강의실 미정',
          timeDisplay: `${slot.startTime} - ${slot.endTime}`,
          color: course.color || '#6366f1',
          day: dayMapping[slot.day],
        });
      });
    });

    const widgetData = {
      updatedAtDisplay: `업데이트: ${now.format('A h:mm')}`,
      classes: allClasses,
      theme: Appearance.getColorScheme() || 'light',
    };

    WidgetModule.updateScheduleData(JSON.stringify(widgetData));
  },
};
```

---

## 5. 수업 시작 푸시 알림

**수업 시작 10분 전**에 알림을 보내 사용자가 수업을 놓치지 않도록 합니다.

### 핵심 기능

- **정확한 시간 알림**: AlarmManager의 `setExactAndAllowWhileIdle`로 정확한 트리거
- **자동 스케줄링**: 시간표 저장 시 위젯과 함께 알림도 자동 등록
- **시스템 이벤트 대응**: 부팅, 시간대 변경 시 알람 재등록

### 구현 상세

```kotlin
// NotificationScheduler.kt
object NotificationScheduler {
    fun scheduleTodayAlarms(context: Context) {
        val repository = WidgetRepository(context)
        val widgetData = repository.getScheduleData() ?: return

        val today = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1
        val todayClasses = widgetData.classes?.filter { it.day == today } ?: return

        todayClasses.forEach { classItem ->
            val triggerTime = calculateTriggerTime(classItem.startTime) // 10분 전
            scheduleAlarm(context, classItem, triggerTime)
        }
    }

    private fun scheduleAlarm(context: Context, classItem: WidgetClassItem, triggerTime: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerTime,
            pendingIntent
        )
    }
}
```

---

## 6. 하드웨어 백버튼 처리

Android의 하드웨어 백버튼을 WebView 내부 라우팅과 연동합니다.

### 핵심 기능

- **WebView 우선**: 백버튼 → WebView에 이벤트 전달 → FE에서 처리
- **계층적 닫기**: 사이드바 → 모달 → 뒤로가기 → 앱 종료 순서
- **AppState 대응**: 백그라운드 → 포그라운드 전환 시 리스너 재등록

### 구현 상세

```typescript
// WebViewContainer.tsx
React.useEffect(() => {
  if (Platform.OS !== 'android') return;

  const onBackPress = () => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'HARDWARE_BACK_PRESS',
      }),
    );
    return true; // 기본 동작(앱 종료) 방지
  };

  const subscription = BackHandler.addEventListener(
    'hardwareBackPress',
    onBackPress,
  );

  // 앱이 포그라운드로 돌아올 때 리스너 재등록
  const appStateSubscription = AppState.addEventListener('change', state => {
    if (state === 'active') {
      // 리스너 새로 등록
    }
  });

  return () => {
    subscription.remove();
    appStateSubscription.remove();
  };
}, []);
```

웹(FE) 측에서는 이 이벤트를 받아 다음 순서로 처리합니다:

1. 사이드바 열려있음 → 닫기
2. 모달 열려있음 → 닫기
3. 시간표 캔버스 열려있음 → 닫기
4. 이전 페이지 있음 → 뒤로가기
5. 앱 종료 확인 → 토스트 메시지 후 종료
