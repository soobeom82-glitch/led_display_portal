# Google Calendar Apps Script 연동

## 구조

```text
회사 Google Workspace 기본 캘린더
        |
        v
Google Apps Script (CalendarApp, 사용자 OAuth)
        |
        | HTTPS POST + shared secret
        v
Vercel /api/google/calendar/sync
        |
        v
Vercel KV
        |
        +--> /api/calendar
        +--> /api/display.calendar
```

Apps Script는 스크립트를 실행한 사용자의 `CalendarApp.getDefaultCalendar()`만
조회한다. 다른 직원 캘린더, 회사 전체 캘린더, 일정 쓰기 기능은 사용하지 않는다.

## Apps Script 설정

1. 회사 계정으로 새 Apps Script 프로젝트를 만든다.
2. 프로젝트 설정에서 `appsscript.json` 표시를 켠다.
3. 저장소의 `google-apps-script/Code.gs`와 `appsscript.json` 내용을 각각 붙여 넣는다.
4. 프로젝트 설정의 스크립트 속성에 아래 두 값을 추가한다.

비밀값은 로컬 터미널에서 `openssl rand -hex 32`로 생성할 수 있다.

```text
VERCEL_CALENDAR_SYNC_URL=https://led-display-portal.vercel.app/api/google/calendar/sync
CALENDAR_SYNC_SECRET=<충분히 긴 임의 문자열>
```

5. Vercel Production 환경변수에 같은 문자열을 추가하고 재배포한다.

```text
GOOGLE_CALENDAR_SYNC_SECRET=<CALENDAR_SYNC_SECRET과 동일한 값>
```

6. Apps Script에서 `testCalendar`를 한 번 실행하고 Calendar 읽기 권한을 승인한다.
7. 로그의 오늘 일정 제목이 실제 캘린더와 일치하는지 확인한다.
8. `syncCalendar`를 실행한다. 응답에 `today`, `upcoming` 건수가 표시된다.

자동 갱신이 필요해지면 Apps Script의 트리거 화면에서 `syncCalendar`에 시간 기반
트리거를 추가한다. 코드가 트리거를 자동 생성하지 않으므로 현재는 수동 실행 상태다.

## 확인

`DISPLAY_API_KEY`가 설정되어 있다면 다음처럼 확인한다.

```bash
curl -s \
  -H 'x-display-key: YOUR_DISPLAY_API_KEY' \
  https://led-display-portal.vercel.app/api/calendar

curl -s \
  -H 'x-display-key: YOUR_DISPLAY_API_KEY' \
  https://led-display-portal.vercel.app/api/display
```

`today.events`에는 오늘 0시부터 다음 날 0시까지 겹치는 일정이, `upcoming.events`에는
실행 시각부터 7일 뒤까지의 일정이 시작시간 순서로 들어간다. 반복 일정은 조회 범위에
나타난 각 인스턴스로 반환되며 동일한 Calendar 이벤트 ID를 가질 수 있으므로 화면 key는
`id + start` 조합을 사용한다.

모든 시간은 전송 시 ISO 8601 UTC 형식으로 정규화되고, 표시할 때 `Asia/Seoul`로
변환한다. 종일 일정은 `allDay: true`, 장소와 설명이 없으면 빈 문자열이다.

## 기존 실패 방식과 차이

기존 시도는 Google Calendar REST API를 Vercel에서 직접 호출하기 위해 별도의 OAuth
클라이언트가 필요했고, 클라이언트를 찾지 못해 `401 invalid_client`가 발생했다. 새 방식은
회사 계정으로 실행되는 Apps Script의 내장 `CalendarApp`이 사용자 승인을 처리한다.
Vercel은 Google 토큰, OAuth client ID/secret, 서비스 계정을 보관하지 않는다.

`401 invalid_client`가 Apps Script 실행 중 다시 나타나면 코드 수정 대신 새 Apps Script
프로젝트에서 재시험한다. `access_denied`, `admin_policy_enforced`, `관리자에 의해 차단됨`
오류는 Workspace 관리자 정책 문제로 분류한다.

## 개인정보 보호

`GOOGLE_CALENDAR_SYNC_SECRET`과 `DISPLAY_API_KEY`는 서로 다른 값을 사용한다. 일정 제목,
장소, 설명이 API에 포함되므로 Production에서는 `DISPLAY_API_KEY`를 반드시 설정한다.
일반 동기화 로그에는 인증정보나 일정 내용이 아닌 건수만 기록된다. `testCalendar`의 제목
로그는 최초 비교 확인 용도로만 실행한다.
