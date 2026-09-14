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
8. 함수 목록에서 `setupCalendarSyncTrigger`를 선택해 한 번 실행하고 추가 권한을
   승인한다. 이 함수는 즉시 동기화를 검증한 다음 `syncCalendar`를 5분마다 실행하는
   시간 기반 트리거를 하나만 설치한다.
9. 왼쪽의 **트리거** 화면에서 `syncCalendar` 시간 기반 트리거가 1개인지 확인한다.

`setupCalendarSyncTrigger`를 다시 실행해도 기존 동기화 트리거를 제거한 뒤 하나만
생성하므로 중복 실행되지 않는다. 설치 상태는 `getCalendarSyncTriggerStatus`, 자동
동기화 중지는 `removeCalendarSyncTrigger`를 수동 실행해 확인하거나 변경할 수 있다.
설치형 트리거는 이를 생성한 회사 계정의 권한으로 실행된다.

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

Vercel은 `upcoming.events`에서 종일 일정을 제외하고 `calendar.meeting` 표시 상태를
계산한다. 다음 회의 30분 전부터는 `phase: upcoming`과 정수 `minutesUntil`, 회의실을
제공하고, 회의가 시작되면 `phase: in-progress`, `minutesUntil: null`로 회의실만
제공한다. 진행 중인 회의가 있어도 다른 회의가 30분 안에 시작하면 다음 회의를 우선한다.
그 외 시간에는 `meeting: null`이다.

`location`은 Google Calendar 장소 문자열의 회의실 코드 패턴을 찾아 사용하므로
`판교아지트 B동-7-lzone-B7-R11 (8)`은 `B7-R11`로 표시된다. 원본 장소는
`upcoming.events[].location`에 그대로 보존된다. 브라우저 미리보기는 30초마다 저장된
일정으로 상태를 다시 계산하고, 1분마다 Vercel KV의 최신 스냅샷을 다시 받는다. 이 웹
갱신은 Google Calendar를 직접 호출하지 않는다.

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
