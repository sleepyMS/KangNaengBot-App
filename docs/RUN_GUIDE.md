# 강냉봇 앱 실행 가이드 (System Run Guide)

이 문서는 React Native 앱(`KangNaengBotApp`)을 실행하고 개발하는 방법을 다룹니다.

## 📁 필수 확인 사항

- **프로젝트 경로**: 반드시 **한글이 없는 경로**여야 합니다.
  - ✅ `C:\ReactNative\KangNaengBotApp`
  - ❌ `C:\Users\...\문서\GitHub\...`
- **터미널**: VS Code 내장 터미널(PowerShell) 사용을 권장합니다.

---

## 🚀 일상적인 개발 루틴 (JS/UI 수정 시)

이미 앱이 폰에 설치되어 있고, 화면(JavaScript/React)만 수정할 때는 **Metro 서버만** 켜면 됩니다.

1.  **터미널 1 (서버 실행)**

    ```powershell
    npx react-native start
    ```

    - 이 터미널은 끄지 않고 계속 켜둡니다.
    - 앱이 실행되면 자동으로 이 서버에 연결됩니다.

2.  **수정 사항 반영 (Hot Reload)**
    - 코드를 저장(`Ctrl + S`)하면 폰에서 자동으로 화면이 바뀝니다.
    - 안 바뀌면 폰을 흔들거나(Shake) 메뉴를 열어 **Reload**를 누르세요.
    - 또는 터미널에서 `r` 키를 누르면 리로드됩니다.

---

## 🛠️ 앱을 처음 켜거나 / 네이티브 변경 시

다음 경우에는 **앱을 다시 빌드해서 설치**해야 합니다.

- 앱을 폰에서 삭제했을 때
- `npm install`로 새로운 패키지를 설치했을 때 (특히 네이티브 기능이 있는 패키지)
- `android/` 폴더 안의 파일(Native Code)을 수정했을 때

1.  **터미널 1**에서 서버를 켭니다 (`npx react-native start`).
2.  **새 터미널(터미널 2)**을 열고 아래 명령어를 실행합니다.
    ```powershell
    npx react-native run-android
    ```
    - 빌드가 완료되면 앱이 자동으로 실행됩니다.

---

## ⚡ 문제 해결 (Troubleshooting)

### 에러: "Unable to load script" 또는 서버 연결 실패

- **원인**: Metro 서버가 꺼져 있거나, 포트 연결이 안 된 경우
- **해결**:
  1.  `npx react-native start`가 켜져 있는지 확인
  2.  새 터미널에서 포트 연결 명령어 실행:
      ```powershell
      adb reverse tcp:8081 tcp:8081
      ```
      > 💡 이 명령어는 **폰의 8081 포트**를 **컴퓨터의 8081 포트**에 연결해줍니다.
      > USB 연결이 끊겼거나 폰을 새로 연결했을 때 한 번 실행해주세요.

### 에러: 빌드가 계속 실패할 때 (청소)

- 프로젝트가 꼬였을 때 초기화하는 순서입니다.
  ```powershell
  cd android
  ./gradlew clean
  cd ..
  rm -r node_modules
  npm install
  npx react-native run-android
  ```

---

## 🔐 Google 로그인 설정 (DEVELOPER_ERROR 해결)

### 문제: `DEVELOPER_ERROR` 발생 시

Google 로그인 시 `DEVELOPER_ERROR`가 발생하는 경우, 다음 단계를 확인하세요.

### 1. SHA-1/SHA-256 인증서 지문 등록 (필수)

**Debug Keystore 지문 확인:**

```powershell
cd android/app
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

출력에서 **SHA-1**과 **SHA-256** 값을 복사합니다.

**Google Cloud Console에 등록:**

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택: `kangnam-backend` (또는 해당 프로젝트)
3. **APIs & Services** > **Credentials** 이동
4. OAuth 2.0 Client ID 중 **Android** 타입 클라이언트 찾기 (없으면 생성)
5. **SHA-1**과 **SHA-256** 지문을 추가
6. **Package name**: `com.kangnaengbotapp` 확인

### 2. Android OAuth Client 확인

Google Cloud Console에서:
- **OAuth 2.0 Client ID** 목록에 **Android** 타입 클라이언트가 있어야 합니다
- Package name이 `com.kangnaengbotapp`인지 확인
- SHA-1/SHA-256이 등록되어 있는지 확인

### 3. google-services.json 업데이트

Google Cloud Console에서:
1. **Firebase Console** > 프로젝트 선택
2. **프로젝트 설정** > **일반** 탭
3. **내 앱** 섹션에서 Android 앱 선택
4. **google-services.json** 다운로드
5. `android/app/google-services.json` 파일 교체

### 4. 앱 재빌드

설정 변경 후 반드시 앱을 완전히 재빌드해야 합니다:

```powershell
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### 5. 확인 사항 체크리스트

- [ ] `android/build.gradle`에 Google Services 플러그인 클래스패스 추가됨
- [ ] `android/app/build.gradle`에 `apply plugin: "com.google.gms.google-services"` 추가됨
- [ ] `google-services.json` 파일이 `android/app/` 폴더에 있음
- [ ] Google Cloud Console에 SHA-1/SHA-256 지문 등록됨
- [ ] Android OAuth Client가 생성되어 있고 Package name이 일치함
- [ ] 앱을 완전히 재빌드함 (clean 후 빌드)

### 참고 링크

- [React Native Google Sign-In 공식 문서](https://react-native-google-signin.github.io/docs/)
- [Troubleshooting 가이드](https://react-native-google-signin.github.io/docs/troubleshooting)