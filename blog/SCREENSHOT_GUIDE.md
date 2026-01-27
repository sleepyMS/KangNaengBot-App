# 블로그 스크린샷 가이드

블로그 완성도를 높이기 위한 스크린샷 촬영 및 삽입 가이드입니다.

---

## 📸 필수 스크린샷 목록

### 1. 🎯 문제 정의 섹션

| 스크린샷                    | 내용                                            | 촬영 방법                                            |
| --------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| **인앱 브라우저 오류 화면** | 카카오톡에서 열었을 때 Google OAuth 차단 메시지 | 카카오톡 앱 → 링크 공유 → FE 웹앱 열기 → 로그인 시도 |

**삽입 위치**: "기존 웹 우회 방식의 한계" 박스 바로 아래

**HTML 예시**:

```html
<div class="diagram-container">
  <img src="[이미지경로]" alt="인앱 브라우저에서 Google OAuth 차단 화면" />
</div>
<p style="text-align: center; color: #6b7280; font-size: 0.9rem;">
  카카오톡 인앱 브라우저에서 Google 로그인 시도 시 차단되는 화면
</p>
```

---

### 2. 💡 해결 과정 섹션

| 스크린샷                         | 내용                                              | 촬영 방법                       |
| -------------------------------- | ------------------------------------------------- | ------------------------------- |
| **네이티브 로그인 화면**         | App의 LoginScreen (구글 로그인 버튼, 게스트 모드) | App 실행 → 로그인 화면 스크린샷 |
| **성공적인 로그인 후 메인 화면** | ChatPage가 정상 표시된 상태                       | 로그인 성공 후 메인 화면 캡처   |

**삽입 위치**: "해결책 1: 네이티브 Google OAuth" 코드 블록 아래

**추천 레이아웃** (Before & After 좌우 배치):

```html
<div
  style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin: 2rem 0;"
>
  <div style="text-align: center;">
    <img
      src="[인앱브라우저오류]"
      style="max-width: 200px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
    />
    <p style="color: #dc2626; font-weight: 600; margin-top: 0.5rem;">
      ❌ 기존 (인앱 브라우저)
    </p>
  </div>
  <div style="text-align: center;">
    <img
      src="[네이티브로그인성공]"
      style="max-width: 200px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
    />
    <p style="color: #16a34a; font-weight: 600; margin-top: 0.5rem;">
      ✅ 개선 (네이티브 앱)
    </p>
  </div>
</div>
```

---

### 3. 💡 해결책 3: 위젯 섹션

| 스크린샷           | 내용                                      | 촬영 방법                       |
| ------------------ | ----------------------------------------- | ------------------------------- |
| **홈 화면 위젯**   | 안드로이드 홈에 추가된 강냉봇 시간표 위젯 | 위젯 추가 후 홈 화면 캡처       |
| **위젯 다크 모드** | 다크 테마 적용된 위젯 (선택)              | 시스템 다크 모드 → 홈 화면 캡처 |

**삽입 위치**: "💻 Kotlin 위젯 구현" 코드 블록 아래

```html
<div
  class="diagram-container"
  style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%);"
>
  <img src="[위젯스크린샷]" style="max-width: 280px; border-radius: 24px;" />
</div>
<p style="text-align: center; color: #6b7280; font-size: 0.9rem;">
  Android 홈 화면에 표시되는 강냉봇 시간표 위젯
</p>
```

---

### 4. 📈 결과 섹션

| 스크린샷                | 내용                | 촬영 방법                            |
| ----------------------- | ------------------- | ------------------------------------ |
| **Play Store 스크린샷** | 앱 스토어 등록 화면 | Play Store에서 "강냉봇" 검색 후 캡처 |

**삽입 위치**: 결과 테이블 아래, "배운 점" 위

```html
<div style="text-align: center; margin: 2rem 0;">
  <a
    href="https://play.google.com/store/apps/details?id=com.kangnaengbotapp"
    target="_blank"
  >
    <img
      src="[플레이스토어]"
      style="max-width: 300px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
    />
  </a>
  <p style="color: #6b7280; font-size: 0.9rem; margin-top: 0.5rem;">
    📱 Google Play Store에서 배포 중
  </p>
</div>
```

---

## ✅ 체크리스트

- [ ] 카카오톡 인앱 브라우저 오류 화면 캡처
- [ ] 네이티브 로그인 화면 캡처
- [ ] 로그인 성공 후 메인 화면 캡처
- [ ] 홈 화면 위젯 캡처 (라이트 모드)
- [ ] 홈 화면 위젯 캡처 (다크 모드, 선택)
- [ ] Play Store 앱 페이지 캡처

---

## 💡 이미지 최적화 팁

1. **해상도**: 모바일 스크린샷은 가로 400~600px로 리사이즈
2. **파일 형식**: WebP 또는 PNG (투명 배경 필요 시)
3. **용량**: 각 이미지 200KB 이하 권장
4. **이름 규칙**: `hybrid_app_01_inapp_error.webp` 형식
