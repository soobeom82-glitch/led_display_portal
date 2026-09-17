const CALENDAR_TIMEZONE = 'Asia/Seoul';
const UPCOMING_DAYS = 7;
const CALENDAR_SYNC_HANDLER = 'syncCalendar';
const CALENDAR_SYNC_INTERVAL_MINUTES = 5;

/** Returns today's events from the executing user's default calendar. */
function getTodayEvents() {
  const range = getTodayRange_();
  return getCalendarEvents(range.start, range.end);
}

/** Returns events from now through the next seven days. */
function getUpcomingEvents() {
  const range = getUpcomingRange_();
  return getCalendarEvents(range.start, range.end);
}

/** Returns normalized events for an explicit start/end range. */
function getCalendarEvents(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date) || end <= start) {
    throw new Error('start and end must be valid Date values, and end must be after start.');
  }
  return getEventsInRange_(start, end);
}

/**
 * Reads the default calendar and sends a normalized snapshot to Vercel.
 * Configure VERCEL_CALENDAR_SYNC_URL and CALENDAR_SYNC_SECRET in Script Properties.
 */
function syncCalendar() {
  const todayRange = getTodayRange_();
  const upcomingRange = getUpcomingRange_();
  const browsingRange = getBrowsingRange_();
  const payload = {
    timezone: CALENDAR_TIMEZONE,
    generatedAt: new Date().toISOString(),
    today: buildRange_(todayRange.start, todayRange.end),
    upcoming: buildRange_(upcomingRange.start, upcomingRange.end),
    browsing: buildRange_(browsingRange.start, browsingRange.end)
  };

  const response = UrlFetchApp.fetch(
    getRequiredProperty_('VERCEL_CALENDAR_SYNC_URL'),
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-calendar-sync-secret': getRequiredProperty_('CALENDAR_SYNC_SECRET')
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Calendar sync failed with HTTP ' + status + '.');
  }

  const result = JSON.parse(response.getContentText());
  console.log(
    'Calendar sync complete. today=%s upcoming=%s browsing=%s',
    result.counts.today,
    result.counts.upcoming,
    result.counts.browsing
  );
  return result;
}

/**
 * Verifies one sync, then installs exactly one five-minute clock trigger.
 * Run this function manually once after saving the script and manifest.
 */
function setupCalendarSyncTrigger() {
  const firstSync = syncCalendar();
  removeCalendarSyncTriggers_();

  ScriptApp
    .newTrigger(CALENDAR_SYNC_HANDLER)
    .timeBased()
    .everyMinutes(CALENDAR_SYNC_INTERVAL_MINUTES)
    .create();

  const status = getCalendarSyncTriggerStatus();
  console.log(
    'Calendar sync trigger installed. interval=%s minutes count=%s',
    status.intervalMinutes,
    status.triggerCount
  );
  return {
    enabled: status.enabled,
    intervalMinutes: status.intervalMinutes,
    triggerCount: status.triggerCount,
    firstSync: firstSync
  };
}

/** Removes all calendar sync triggers owned by the executing user. */
function removeCalendarSyncTrigger() {
  const removedCount = removeCalendarSyncTriggers_();
  console.log('Calendar sync triggers removed. count=%s', removedCount);
  return { enabled: false, removedCount: removedCount };
}

/** Returns whether the current user has an installed calendar sync trigger. */
function getCalendarSyncTriggerStatus() {
  const triggerCount = ScriptApp
    .getProjectTriggers()
    .filter(function(trigger) {
      return trigger.getHandlerFunction() === CALENDAR_SYNC_HANDLER;
    })
    .length;

  return {
    enabled: triggerCount === 1,
    intervalMinutes: CALENDAR_SYNC_INTERVAL_MINUTES,
    triggerCount: triggerCount
  };
}

/** Logs only titles for a one-time comparison with the visible calendar. */
function testCalendar() {
  const events = getTodayEvents();
  console.log(events.map(function(event) { return event.title; }));
  return events;
}

function buildRange_(start, end) {
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    events: getEventsInRange_(start, end)
  };
}

function getEventsInRange_(start, end) {
  const events = [];
  let pageToken;

  do {
    const options = {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: CALENDAR_TIMEZONE,
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
      maxResults: 2500
    };
    if (pageToken) {
      options.pageToken = pageToken;
    }

    const page = Calendar.Events.list('primary', options);
    Array.prototype.push.apply(events, page.items || []);
    pageToken = page.nextPageToken;
  } while (pageToken);

  return events
    .filter(function(event) { return event.status !== 'cancelled'; })
    .map(normalizeApiEvent_)
    .filter(shouldDisplayEvent_)
    .sort(function(left, right) {
      return left.start.localeCompare(right.start);
    });
}

function normalizeApiEvent_(event) {
  const allDay = Boolean(event.start && event.start.date);
  return {
    id: event.iCalUID || event.id,
    title: event.summary || '',
    start: normalizeApiDate_(event.start),
    end: normalizeApiDate_(event.end),
    allDay: allDay,
    location: event.location || '',
    description: event.description || '',
    responseStatus: getApiResponseStatus_(event),
    videoMeeting: hasGoogleMeet_(event)
  };
}

function hasGoogleMeet_(event) {
  const solutionType = event.conferenceData &&
    event.conferenceData.conferenceSolution &&
    event.conferenceData.conferenceSolution.key &&
    event.conferenceData.conferenceSolution.key.type;
  const hasMeetEntryPoint = (event.conferenceData &&
    event.conferenceData.entryPoints || []).some(function(entryPoint) {
      return entryPoint.entryPointType === 'video' &&
        /(^|\/)meet\.google\.com\//i.test(entryPoint.uri || '');
    });

  return solutionType === 'hangoutsMeet' ||
    /^https?:\/\/meet\.google\.com\//i.test(event.hangoutLink || '') ||
    hasMeetEntryPoint;
}

function normalizeApiDate_(value) {
  if (value && value.dateTime) {
    return new Date(value.dateTime).toISOString();
  }
  if (value && value.date) {
    return parseSeoulDate_(value.date).toISOString();
  }
  throw new Error('Calendar event is missing a start or end date.');
}

function getApiResponseStatus_(event) {
  const selfAttendee = (event.attendees || []).find(function(attendee) {
    return attendee.self === true;
  });
  const status = selfAttendee && selfAttendee.responseStatus;

  if (status === 'declined') return 'no';
  if (status === 'tentative') return 'maybe';
  if (status === 'accepted') return 'yes';
  if (status === 'needsAction') return 'invited';
  if (event.organizer && event.organizer.self === true) return 'owner';
  return 'invited';
}

function shouldDisplayEvent_(event) {
  return event.responseStatus !== 'no' && event.title.indexOf('휴가') === -1;
}

function getTodayRange_() {
  const now = new Date();
  const date = Utilities.formatDate(now, CALENDAR_TIMEZONE, 'yyyy-MM-dd');
  return {
    start: parseSeoulDate_(date),
    end: parseSeoulDate_(addDaysToDateString_(date, 1))
  };
}

function getUpcomingRange_() {
  const start = new Date();
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + UPCOMING_DAYS);
  return { start: start, end: end };
}

function getBrowsingRange_() {
  const now = new Date();
  const date = Utilities.formatDate(now, CALENDAR_TIMEZONE, 'yyyy-MM-dd');
  return {
    start: parseSeoulDate_(addDaysToDateString_(date, -1)),
    end: parseSeoulDate_(addDaysToDateString_(date, 2))
  };
}

function parseSeoulDate_(date) {
  return new Date(date + 'T00:00:00+09:00');
}

function addDaysToDateString_(date, days) {
  const noonUtc = new Date(date + 'T12:00:00Z');
  noonUtc.setUTCDate(noonUtc.getUTCDate() + days);
  return Utilities.formatDate(noonUtc, 'UTC', 'yyyy-MM-dd');
}

function getRequiredProperty_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) {
    throw new Error('Missing Script Property: ' + name);
  }
  return value;
}

function removeCalendarSyncTriggers_() {
  const triggers = ScriptApp.getProjectTriggers();
  let removedCount = 0;

  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === CALENDAR_SYNC_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
      removedCount += 1;
    }
  });

  return removedCount;
}
