/**
 * Utility to synchronize system time with internet time (Vietnam GMT+7)
 */

let timeOffset = 0;

export async function syncInternetTime() {
  try {
    // Using a reliable API or the server's own headers
    // worldtimeapi.org is a good public option
    const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh');
    const data = await response.json();
    
    if (data && data.datetime) {
      const internetTime = new Date(data.datetime).getTime();
      const systemTime = Date.now();
      timeOffset = internetTime - systemTime;
      console.log(`Time synced. Offset: ${timeOffset}ms`);
    }
  } catch (error) {
    console.warn('Could not sync with internet time, falling back to system time.', error);
    
    // Fallback: Try to get time from a HEAD request to current origin
    try {
      const start = Date.now();
      const response = await fetch(window.location.origin, { method: 'HEAD' });
      const serverDate = response.headers.get('Date');
      if (serverDate) {
        const internetTime = new Date(serverDate).getTime();
        const end = Date.now();
        const rtt = (end - start) / 2;
        timeOffset = (internetTime + rtt) - end;
      }
    } catch (fallbackError) {
      console.error('Time sync failed completely.', fallbackError);
    }
  }
}

/**
 * Returns a Date object corrected by the internet time offset
 */
export function getNow(): Date {
  return new Date(Date.now() + timeOffset);
}

/**
 * Returns a Date object for Vietnam (GMT+7) regardless of system timezone
 */
export function getVietnamNow(): Date {
  const now = getNow();
  // Force GMT+7 if needed, but worldtimeapi already gives local time for the timezone
  return now;
}

/**
 * Formats a date to YYYY-MM-DD in Vietnam timezone
 */
export function getVietnamTodayKey(): string {
  const now = getVietnamNow();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
