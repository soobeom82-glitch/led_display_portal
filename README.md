# Tesla Personal Display

Tesla 차량 상태를 개인용 LED 디스플레이에 보여주기 위한 `Next.js + Vercel` MVP입니다.

현재 버전은 아래 흐름만 구현합니다.

```text
Tesla Fleet API
        |
        v
Vercel (Next.js Route Handlers)
        |
        v
ESP32 / Browser Display
```

브라우저 미리보기는 [`/display`](/Users/KAKAO/Documents/LED display/src/app/display/page.tsx)에서 확인할 수 있고, 실제 ESP32는 [`/api/display`](/Users/KAKAO/Documents/LED display/src/app/api/display/route.ts) JSON만 읽으면 됩니다.

## Implemented

- `/login`
  Tesla OAuth 시작점
- `/api/tesla/callback`
  Authorization code를 refresh token으로 교환하고 저장
- `/api/tesla/register`
  Tesla partner account one-time registration
- `/api/display`
  LED/브라우저 공용 JSON API
- `/display`
  LED 역할을 대신하는 브라우저 미리보기

## Environment

`.env.local`은 아래를 기준으로 만듭니다.

```bash
cp .env.example .env.local
```

핵심 변수:

- `TESLA_CLIENT_ID`
- `TESLA_CLIENT_SECRET`
- `TESLA_REDIRECT_URI`
- `TESLA_PUBLIC_KEY_PEM`
- `TESLA_VEHICLE_ID` (선택)
- `DISPLAY_API_KEY` (권장)

선택 변수:

- `TESLA_PARTNER_AUTH_BASE_URL`
- `TESLA_PARTNER_SCOPE`
- `TESLA_APP_DOMAIN`
- `TESLA_REFRESH_TOKEN`
  이미 확보한 refresh token을 직접 넣고 싶을 때 사용
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
  Vercel KV가 연결되어 있다면 callback에서 refresh token을 저장

## Local Dev

Node 20+가 필요합니다.

```bash
pnpm dev
```

실제 Tesla 연동을 보려면:

1. `.env.local`에 Tesla OAuth 값 입력
2. `TESLA_PUBLIC_KEY_PEM`에 secp256r1 public key 설정
3. `http://localhost:3000/api/tesla/register?redirect=/display`로 partner registration 실행
4. `http://localhost:3000/login` 접속
5. Tesla 로그인 완료
6. `/display` 또는 `/api/display` 확인

## Token Storage Notes

- 로컬 개발:
  `.data/tesla-oauth.json` 파일에 토큰을 저장합니다.
- Vercel:
  `KV_REST_API_URL`과 `KV_REST_API_TOKEN`이 있으면 KV를 우선 사용합니다.
- fallback:
  저장소 없이 단순 조회만 하려면 `TESLA_REFRESH_TOKEN` 환경변수를 직접 넣을 수 있습니다.

## Display API Shape

```json
{
  "time": "08:42",
  "timezone": "Asia/Seoul",
  "tesla": {
    "battery": 72,
    "charging": true,
    "limit": 80,
    "minutesRemaining": 35,
    "status": "Charging",
    "complete": false,
    "vehicleName": "Model Y",
    "source": "tesla-live"
  },
  "meta": {
    "source": "tesla-live",
    "updatedAt": "2026-07-14T00:00:00.000Z"
  }
}
```

`DISPLAY_API_KEY`를 설정한 경우, ESP32는 아래 중 하나로 키를 보내야 합니다.

- `x-display-key: <key>` 헤더
- `GET /api/display?key=<key>`

## Suggested Next Steps

1. Tesla Fleet API 실차 응답을 확인하면서 `charge_state` 매핑을 보정합니다.
2. ESP32에서 `/api/display` polling 후 동일한 3줄 레이아웃으로 렌더링합니다.
3. 이후 `calendar`, `weather`, `freezer` 블록을 같은 JSON 루트에 확장합니다.
