# **KangNaengBot Mobile App 최종 구현 계획**

> 날짜: 2026-01-21 | 기간: 8-10주 | 개발환경: Windows + Android

---

## **아키텍처 개요**

```
┌──────────────────────────────────────────────────────────────────┐
│                     Bare React Native                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Kotlin Native Modules                          │ │
│  │  • WidgetModule (시간표 위젯)                                 │ │
│  │  • NotificationModule (수업 알림)                            │ │
│  │  • App Widget + AlarmManager                                │ │
│  └────────────────────────────────┬───────────────────────────┘ │
│                                   ↕                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              React Native TypeScript                        │ │
│  │  • WebView (기존 웹앱)                                        │ │
│  │  • Native Module 래퍼                                        │ │
│  │  • 설정 화면                                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

```

---

## **개발 환경**

| **항목** | **환경**                   |
| -------- | -------------------------- |
| OS       | Windows 11                 |
| IDE      | Android Studio + VS Code   |
| 테스트   | Android 에뮬레이터/실기기  |
| iOS      | Mac 빌려서 최종 빌드 (1주) |

---

## **Phase 1: 프로젝트 설정 (1주)**

### **명령어**

```
npx@react-native-community/cliinitKangNaengBotApp--templatereact-native-template-typescript
cdKangNaengBotApp
npminstallreact-native-webview@react-navigation/native@react-navigation/native-stack
npminstallreact-native-screensreact-native-safe-area-contextreact-native-encrypted-storage

```

### **산출물**

- [ ] Android에서 웹앱 정상 로드
- [ ] 하드웨어 뒤로가기 동작
- [ ] Safe Area 적용

---

## **Phase 2: 인증 통합 (1-2주)**

### **Google OAuth 플로우**

```
네이티브 로그인 → GoogleSignin.signIn() → ID Token 획득
→ 백엔드 인증 → Access/Refresh Token → Secure Storage 저장
→ WebView에 토큰 주입 → 자동 로그인

```

### **산출물**

- [ ] Google 로그인 동작
- [ ] 토큰 암호화 저장
- [ ] WebView 자동 로그인

---

## **Phase 3: Android 시간표 위젯 (2주)**

### **데이터 흐름**

```
WebView (시간표 저장) → postMessage → RN App
→ SharedPreferences → Android Widget → 홈 화면

```

### **주요 파일**

| **파일**                    | **역할**           |
| --------------------------- | ------------------ |
| `WidgetModule.kt`           | RN ↔ Native 브릿지 |
| `ScheduleWidgetProvider.kt` | 위젯 렌더링        |
| `widget_schedule.xml`       | 위젯 레이아웃      |

### **산출물**

- [ ] 홈 화면 위젯 추가 가능
- [ ] 오늘 수업 목록 표시
- [ ] 위젯 탭 → 앱 열기

---

## **Phase 4: 수업 알림 시스템 (1-2주)**

### **알림 아키텍처**

```
저장된 시간표 → NotificationModule → AlarmManager (주 반복)
→ ClassNotificationReceiver → NotificationManager → 알림 표시

```

### **사용자 설정**

- 알림 on/off 토글
- 수업 X분 전 (5/10/15/30분)

### **산출물**

- [ ] 수업 알림 설정 화면
- [ ] 주 반복 알림 동작
- [ ] 알림 클릭 → 앱 열기

---

## **Phase 5: UX 폴리싱 (1주)**

- [ ] 스플래시 스크린
- [ ] 다크모드 시스템 연동
- [ ] 오프라인/에러 화면
- [ ] 앱 아이콘 디자인

---

## **Phase 6: iOS 빌드 (1주, Mac)**

- [ ] Xcode 환경 설정
- [ ] iOS 위젯 (WidgetKit) 구현
- [ ] iOS 알림 (UNNotificationCenter)
- [ ] TestFlight → App Store 제출

---

## **웹앱 수정사항**

### **[MODIFY] vercel.json**

- `X-Frame-Options`: `DENY` → `SAMEORIGIN`
- `frame-ancestors`: 앱 스킴 허용

### **[NEW] src/utils/nativeBridge.ts**

- `isRunningInApp()`: 앱 환경 감지
- `sendToNative()`: 네이티브 메시지 전송
- `syncScheduleToNative()`: 시간표 동기화

### **[MODIFY] LoginPage.tsx, useScheduleStore.ts, useAuthStore.ts**

- 앱 환경 조건부 로직 추가

---

## **포트폴리오 어필 포인트**

| **기술**     | **증명 내용**           |
| ------------ | ----------------------- |
| Kotlin       | 네이티브 모듈 직접 개발 |
| App Widget   | Android 홈 화면 위젯    |
| AlarmManager | 정밀 알림 스케줄링      |
| RN Bridge    | JS ↔ Native 통신 설계   |
| 하이브리드   | WebView + 네이티브 통합 |

---

## **Verification Plan**

### **Android 테스트**

```
npmrunandroid# 앱 실행
./gradlewassembleDebug# APK 빌드

```

### **체크리스트**

- [ ] WebView 정상 로드
- [ ] 로그인 플로우
- [ ] 위젯 동작
- [ ] 알림 수신
-
-
-
-
-
