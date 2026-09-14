# Tesla Personal Display

Tesla 차량 상태를 개인용 LED 디스플레이에 보여주기 위한 `Next.js + Vercel` MVP입니다.

현재 버전은 아래 흐름을 구현합니다.

```text
Tesla Fleet API
        |
        v
Vercel (Next.js Route Handlers)
        |
        v
ESP32 / Browser Display

Google Calendar
        |
        v
Apps Script (CalendarApp)
        |
        v
Vercel KV -> Display API
```

브라우저 미리보기는 [`/display`](/Users/KAKAO/Documents/LED display/src/app/display/page.tsx)에서 확인할 수 있고, 실제 ESP32는 [`/api/display`](/Users/KAKAO/Documents/LED display/src/app/api/display/route.ts) JSON만 읽으면 됩니다.

## Implemented

- `/login`
  Tesla OAuth 시작점
- `/api/tesla/callback`
  Authorization code를 refresh token으로 교환하고 저장
- `/api/tesla/register`
  Tesla partner account one-time registration
- `/api/tesla/wake`
  절전 상태 차량을 수동으로 깨우는 endpoint
- `/api/display`
  LED/브라우저 공용 Tesla + Calendar JSON API
- `/api/calendar`
  동기화된 기본 캘린더의 오늘/향후 7일 JSON API
- `/api/google/calendar/sync`
  회사 계정 Apps Script가 기본 캘린더 스냅샷을 보내는 인증된 endpoint
- `/display`
  LED 역할을 대신하는 브라우저 미리보기
- `/meeting`
  다음 회의까지 남은 시간과 회의실에 집중한 브라우저 LED 미리보기

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
- `GOOGLE_CALENDAR_SYNC_SECRET`
  Apps Script와 Vercel 사이에서만 사용하는 동기화 비밀값

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
  "calendar": {
    "timezone": "Asia/Seoul",
    "generatedAt": "2026-09-11T01:00:00.000Z",
    "syncedAt": "2026-09-11T01:00:01.000Z",
    "today": {
      "start": "2026-09-10T15:00:00.000Z",
      "end": "2026-09-11T15:00:00.000Z",
      "events": []
    },
    "upcoming": {
      "start": "2026-09-11T01:00:00.000Z",
      "end": "2026-09-18T01:00:00.000Z",
      "events": []
    },
    "meeting": {
      "id": "meeting@example.com",
      "start": "2026-09-11T02:30:00.000Z",
      "end": "2026-09-11T03:00:00.000Z",
      "location": "B7RW1",
      "phase": "upcoming",
      "minutesUntil": 30
    },
    "source": "google-apps-script"
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

회사 Google Calendar 연동과 검증 절차는
[`docs/google-calendar-apps-script.md`](docs/google-calendar-apps-script.md)를 따릅니다.

`calendar.meeting`은 다음 회의 30분 전부터 `upcoming` 상태로 남은 분과 회의실을
제공합니다. 회의 중에는 `in-progress` 상태로 회의실만 제공하며, 다음 회의가 30분
이내라면 진행 중인 회의보다 다음 회의를 우선합니다. 그 외 시간에는 `null`입니다.
브라우저 미리보기는 저장된 일정으로 30초마다 상태를 다시 계산하고, 1분마다 Vercel의
최신 캘린더 스냅샷을 다시 받아 일정 수정사항도 반영합니다. `/meeting`은 종일 일정을
제외한 오늘의 회의 시간과 회의실을 항상 목록으로 표시하며, 다음 회의를 크게 강조하고
30분 전부터 시작까지 남은 분을 시간 옆에 표시합니다. 3분 이하에서는 남은 분이
빨간색으로 1초마다 점멸합니다. 우측 하단에는 Vercel이 마지막 캘린더 스냅샷을 받은
시각을 표시합니다.

## Suggested Next Steps

1. Tesla Fleet API 실차 응답을 확인하면서 `charge_state` 매핑을 보정합니다.
2. ESP32에서 `/api/display`를 필요한 주기로 호출하고 동일한 3줄 레이아웃으로 렌더링합니다.
3. 이후 `weather`, `freezer` 블록을 같은 JSON 루트에 확장합니다.
