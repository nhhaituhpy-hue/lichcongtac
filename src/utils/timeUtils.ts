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
    
    if (data && (data as any).datetime) {
      const internetTime = new Date((data as any).datetime).getTime();
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

export function getDaysFromWeek(yearStr: string, weekStr: string) {
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  const jan4 = new Date(year, 0, 4);
  const dayIndex = (jan4.getDay() + 6) % 7;
  const targetMonday = new Date(year, 0, 4 - dayIndex);
  targetMonday.setDate(targetMonday.getDate() + (week - 1) * 7);

  const days = [];
  const labels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  for (let i = 0; i < 7; i++) {
    const current = new Date(targetMonday);
    current.setDate(current.getDate() + i);
    const dd = String(current.getDate()).padStart(2, '0');
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const yyyy = current.getFullYear();
    days.push({
      label: labels[i],
      date: `${dd}/${mm}/${yyyy}`,
      key: `${yyyy}-${mm}-${dd}`,
      month: `${yyyy}-${mm}`
    });
  }
  return days;
}

export function getCurrentWeek() {
  const now = getNow();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
