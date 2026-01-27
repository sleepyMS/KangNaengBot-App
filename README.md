# KangNaengBot-App (강냉봇 앱)

강남대학교 학생들을 위한 AI 챗봇 서비스 **강냉봇**의 React Native 앱입니다.
기존 웹앱([KangNaengBot-FE](https://github.com/sleepyMS/KangNaengBot-FE))을 100% 활용하면서, 네이티브 기능을 추가한 **하이브리드 앱**입니다.

> 💡 **핵심 기능**: 네이티브 Google OAuth | Android 홈 위젯 | 수업 알림 | 오프라인 시간표

<br/>

## 📱 하이브리드 아키텍처

```
┌─────────────────────────────────────────────────┐
│                 React Native                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ LoginScreen │  │WidgetService│  │Notification│ │
│  │ (Native     │  │ (RN→Kotlin) │  │ Scheduler │ │
│  │  OAuth)     │  │             │  │           │ │
│  └──────┬──────┘  └──────┬──────┘  └─────┬────┘ │
├─────────┼────────────────┼───────────────┼──────┤
│         ▼                ▼               ▼      │
│  ┌─────────────────────────────────────────────┐│
│  │            WebViewContainer                 ││
│  │  (injectedJavaScriptBeforeContentLoaded)    ││
│  └──────────────────┬──────────────────────────┘│
└─────────────────────┼───────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│              기존 웹앱 (KangNaengBot-FE)          │
│   ChatPage | ScheduleCanvas | Settings ...      │
└─────────────────────────────────────────────────┘
```

**왜 하이브리드인가?**

- ✅ 기존 웹앱 코드 100% 재활용 → 개발 비용 최소화
- ✅ 네이티브로 해결해야 하는 문제만 선택적 구현
- ✅ 웹앱 업데이트가 앱에 즉시 반영

<br/>

## 📚 프로젝트 문서 (Documentation)

개발 과정, 기술적 의사결정, 배운 점 등을 상세하게 정리한 문서들입니다.

- **[🚀 주요 기능 및 구현 상세 (Features)](docs/FEATURES.md)**
  - 네이티브 OAuth, WebView 브릿지, 위젯, 푸시 알림, 백버튼 처리
- **[⚡ 최적화 및 성능 개선 (Optimizations)](docs/OPTIMIZATIONS.md)**
  - FOUC 방지, 토큰 사전 주입, 상태 동기화 전략
- **[🔥 트러블 슈팅 (Challenges & Solutions)](docs/CHALLENGES_AND_SOLUTIONS.md)**
  - 하이브리드 앱 개발 중 직면한 기술적 난관과 해결 과정
- **[💡 회고 (Learnings)](docs/LEARNINGS.md)**
  - 프로젝트를 통해 배우고 느낀 점

### 참고 문서

- [모바일 인증 API 명세 (Mobile Auth API Spec)](docs/MOBILE_AUTH_API_SPEC.md)
- [실행 가이드 (Run Guide)](docs/RUN_GUIDE.md)

---

## 🛠 기술 스택 (Tech Stack)

| 구분 (Category)      | 기술 (Technology)                                                                                                                                                                                     | 설명 (Description)                |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------- |
| **Framework**        | ![React Native](https://img.shields.io/badge/React_Native_0.79-20232A?style=flat&logo=react&logoColor=61DAFB)                                                                                         | 크로스플랫폼 앱 프레임워크        |
| **Language**         | ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) ![Kotlin](https://img.shields.io/badge/Kotlin-7F52FF?style=flat&logo=kotlin&logoColor=white) | 정적 타입 언어 + Android 네이티브 |
| **WebView**          | ![WebView](https://img.shields.io/badge/react--native--webview-purple?style=flat)                                                                                                                     | 기존 웹앱 임베딩                  |
| **Authentication**   | ![Google Sign-In](https://img.shields.io/badge/Google_Sign--In-4285F4?style=flat&logo=google&logoColor=white)                                                                                         | 네이티브 OAuth 2.0                |
| **Storage**          | ![EncryptedStorage](https://img.shields.io/badge/EncryptedStorage-green?style=flat)                                                                                                                   | 보안 토큰 저장                    |
| **Widget**           | ![AppWidget](https://img.shields.io/badge/Android_AppWidget-3DDC84?style=flat&logo=android&logoColor=white)                                                                                           | 홈 화면 시간표 위젯               |
| **Notification**     | ![AlarmManager](https://img.shields.io/badge/AlarmManager-3DDC84?style=flat&logo=android&logoColor=white)                                                                                             | 수업 시작 알림                    |
| **State Management** | ![Zustand](https://img.shields.io/badge/Zustand-orange?style=flat)                                                                                                                                    | 네이티브 측 상태 관리             |

---

## 🚀 시작하기 (Getting Started)

### Prerequisites

- Node.js 18+
- JDK 17
- Android Studio (Android SDK 34+)
- React Native CLI

### 설치 및 실행

```bash
# 의존성 설치
npm install

# Metro Bundler 시작
npm start

# Android 앱 실행
npm run android
```

### 환경 변수 설정

`android/local.properties`에 다음 설정이 필요합니다:

```properties
sdk.dir=C:\\Users\\[username]\\AppData\\Local\\Android\\Sdk
```

`.env` 파일 생성 (프로젝트 루트):

```env
GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
API_BASE_URL=https://your-api-url.com
```

---

## 📂 프로젝트 구조

```
KangNaengBotApp/
├── src/
│   ├── components/       # UI 컴포넌트
│   │   └── WebViewContainer.tsx  # 핵심: 웹앱 임베딩 및 브릿지
│   ├── screens/          # 화면
│   │   └── LoginScreen.tsx       # 네이티브 로그인 화면
│   ├── services/         # 비즈니스 로직
│   │   ├── authService.ts        # Google OAuth, 토큰 관리
│   │   └── widgetService.ts      # 위젯 데이터 변환
│   ├── store/            # Zustand 스토어
│   └── types/            # TypeScript 타입 정의
├── android/
│   └── app/src/main/java/com/kangnaengbotapp/
│       ├── widget/       # Kotlin 위젯 구현
│       │   ├── ScheduleWidgetProvider.kt
│       │   └── ScheduleRemoteViewsFactory.kt
│       └── notification/ # 알림 스케줄러
│           └── NotificationScheduler.kt
├── docs/                 # 프로젝트 문서
└── blog/                 # 블로그 포스트 원본
```

---

## 📱 다운로드

<a href="https://play.google.com/store/apps/details?id=com.kangnaengbotapp">
  <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" width="200"/>
</a>

---

## 📄 관련 프로젝트

- [KangNaengBot-FE](https://github.com/sleepyMS/KangNaengBot-FE) - 웹 프론트엔드
- [KangNaengBot-BE](https://github.com/sleepyMS/KangNaengBot-BE) - 백엔드 서버
