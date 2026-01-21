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
