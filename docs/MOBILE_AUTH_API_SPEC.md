# 모바일 앱 Google 인증 API 명세서

## 개요

이 문서는 React Native 모바일 앱에서 Google 로그인을 구현하기 위한 백엔드 API 명세서입니다.

## 인증 플로우 비교

### 웹 프론트엔드 (기존)
1. 사용자가 "Google로 로그인" 버튼 클릭
2. `GET /auth/google/login` 호출 → Google OAuth URL로 리다이렉트
3. 사용자가 Google에서 로그인
4. `GET /auth/google/callback?code=...` → 백엔드가 OAuth code 처리
5. 백엔드가 access token 생성 후 `/login?token=...`으로 리다이렉트
6. 웹 프론트엔드가 URL의 token 파라미터를 받아 사용

### 모바일 앱 (신규)
1. 사용자가 "Google로 로그인" 버튼 클릭
2. React Native Google Sign-In SDK로 직접 Google 로그인 수행
3. SDK가 **ID Token**을 반환
4. `POST /auth/google/callback` 호출 → 백엔드에 ID Token 전송
5. 백엔드가 ID Token 검증 후 access/refresh token 발급
6. 모바일 앱이 토큰을 저장하고 사용

## API 엔드포인트

### POST /auth/google/callback

모바일 앱에서 Google ID Token을 받아 access/refresh token을 발급하는 엔드포인트입니다.

#### 요청

**HTTP Method:** `POST`

**Headers:**
```
Content-Type: application/json
X-Client-Version: 1.0.0 (선택사항)
X-Client-Type: mobile (선택사항, 모바일 앱임을 명시)
```

**Request Body:**
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij..."
}
```

**필드 설명:**
- `id_token` (string, required): Google Sign-In SDK에서 받은 ID Token (JWT 형식)

#### 응답

**성공 응답 (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**필드 설명:**
- `access_token` (string, required): API 호출에 사용할 액세스 토큰
- `refresh_token` (string, required): 액세스 토큰 갱신에 사용할 리프레시 토큰
- `token_type` (string, optional): 토큰 타입 (기본값: "Bearer")
- `expires_in` (number, optional): 액세스 토큰 만료 시간(초)

#### 에러 응답

**400 Bad Request - 잘못된 요청 형식:**
```json
{
  "detail": [
    {
      "loc": ["body", "id_token"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**401 Unauthorized - ID Token 검증 실패:**
```json
{
  "detail": "Invalid ID token"
}
```

**422 Unprocessable Entity - 유효성 검증 실패:**
```json
{
  "detail": [
    {
      "loc": ["body", "id_token"],
      "msg": "Invalid token format",
      "type": "value_error"
    }
  ]
}
```

**500 Internal Server Error - 서버 오류:**
```json
{
  "detail": "Internal server error"
}
```

## 백엔드 구현 가이드

### 1. 엔드포인트 확장 (권장)

기존 `GET /auth/google/callback` 엔드포인트를 확장하여 POST도 지원:

```python
# 예시: FastAPI
@router.post("/auth/google/callback")
@router.get("/auth/google/callback")  # 기존 웹 지원 유지
async def google_callback(
    request: Request,
    id_token: Optional[str] = None,  # POST body에서
    code: Optional[str] = None,  # GET query에서
):
    # 요청 메서드에 따라 분기
    if request.method == "POST":
        # 모바일 앱: ID Token 검증
        if not id_token:
            raise HTTPException(status_code=400, detail="id_token is required")
        
        # ID Token 검증 및 사용자 정보 추출
        user_info = verify_google_id_token(id_token)
        
    elif request.method == "GET":
        # 웹: OAuth code 처리 (기존 로직)
        if not code:
            raise HTTPException(status_code=400, detail="code is required")
        
        # OAuth code → token 교환
        user_info = exchange_oauth_code(code)
    
    # 공통 로직: 사용자 생성/업데이트 및 토큰 발급
    user = upsert_user(user_info)
    access_token, refresh_token = generate_tokens(user)
    
    # 웹은 리다이렉트, 모바일은 JSON 응답
    if request.method == "GET":
        redirect_uri = request.query_params.get("redirect_uri", "/login")
        return RedirectResponse(f"{redirect_uri}?token={access_token}")
    else:
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": 3600
        }
```

### 2. ID Token 검증

Google ID Token을 검증하는 함수 예시:

```python
from google.auth.transport import requests
from google.oauth2 import id_token

def verify_google_id_token(token: str) -> dict:
    """
    Google ID Token을 검증하고 사용자 정보를 반환합니다.
    
    Args:
        token: Google ID Token (JWT)
    
    Returns:
        사용자 정보 딕셔너리
    
    Raises:
        ValueError: 토큰 검증 실패 시
    """
    try:
        # Google의 공개 키로 토큰 검증
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            GOOGLE_CLIENT_ID  # 웹 클라이언트 ID 사용
        )
        
        # 발급자 확인
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        return {
            'sub': idinfo['sub'],  # Google 사용자 ID
            'email': idinfo['email'],
            'name': idinfo.get('name'),
            'picture': idinfo.get('picture'),
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid ID token: {str(e)}")
```

### 3. 웹과 모바일 구분 (선택사항)

요청 헤더로 웹/모바일을 구분할 수 있습니다:

```python
client_type = request.headers.get("X-Client-Type", "web")

if client_type == "mobile":
    # 모바일 특화 로직
    pass
```

## 보안 고려사항

1. **ID Token 검증 필수**: Google의 공개 키로 반드시 검증해야 합니다.
2. **토큰 만료 시간**: Access token은 짧게(예: 1시간), Refresh token은 길게(예: 30일) 설정합니다.
3. **HTTPS 필수**: 모든 통신은 HTTPS를 사용해야 합니다.
4. **Rate Limiting**: 무차별 대입 공격 방지를 위해 Rate limiting을 적용합니다.

## 테스트

### cURL 예시

```bash
curl -X POST "https://your-api.com/auth/google/callback" \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: mobile" \
  -d '{
    "id_token": "YOUR_GOOGLE_ID_TOKEN"
  }'
```

### 예상 응답

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## 마이그레이션 체크리스트

- [ ] `POST /auth/google/callback` 엔드포인트 구현
- [ ] Google ID Token 검증 로직 구현
- [ ] 웹용 `GET /auth/google/callback` 유지 (기존 기능 보존)
- [ ] 에러 처리 및 응답 형식 통일
- [ ] Rate limiting 적용
- [ ] 로깅 및 모니터링 추가
- [ ] 테스트 코드 작성

## 참고 자료

- [Google Identity - Verify ID Token](https://developers.google.com/identity/sign-in/web/backend-auth#verify-the-integrity-of-the-id-token)
- [React Native Google Sign-In](https://react-native-google-signin.github.io/)
